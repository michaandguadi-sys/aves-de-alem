/* Aves de Alem: BirdNET sound-ID worker.
 * Adapted from birdnet-team/birdnet-website public/js/birdnet-worker.js
 * (MIT License, Copyright (c) 2025 BirdNET-Team).
 * Model: BirdNET V2.4 (Kahl et al. 2021), CC BY-SA 4.0 per the BirdNET website repo; personal, non-commercial use here.
 */
const TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.14.0/dist/tf.min.js';
const MODEL_ROOT = 'https://raw.githubusercontent.com/birdnet-team/birdnet-website/e5d8f2f71143953bd93e8d82efe4725f992e82b5/public/models/birdnet';
importScripts(TFJS);

let birdModel = null, areaModel = null, birds = [], geo = null, ready = false;

async function init(lat, lon, week) {
  await tf.setBackend('webgl');
  await tf.ready();
  class MelSpecLayerSimple extends tf.layers.Layer {
    constructor(config) {
      super(config);
      this.sampleRate = config.sampleRate;
      this.specShape = config.specShape;
      this.frameStep = config.frameStep;
      this.frameLength = config.frameLength;
      this.melFilterbank = tf.tensor2d(config.melFilterbank);
    }
    build() {
      this.magScale = this.addWeight('magnitude_scaling', [], 'float32', tf.initializers.constant({ value: 1.23 }));
      super.build();
    }
    computeOutputShape(inputShape) { return [inputShape[0], this.specShape[0], this.specShape[1], 1]; }
    call(inputs) {
      return tf.tidy(() => {
        const x = inputs[0];
        return tf.stack(x.split(x.shape[0]).map(input => {
          let spec = input.squeeze();
          spec = tf.sub(spec, tf.min(spec, -1, true));
          spec = tf.div(spec, tf.max(spec, -1, true).add(1e-6));
          spec = tf.sub(spec, 0.5).mul(2.0);
          spec = tf.engine().runKernel('STFT', { signal: spec, frameLength: this.frameLength, frameStep: this.frameStep });
          spec = tf.matMul(spec, this.melFilterbank).pow(2.0);
          spec = spec.pow(tf.div(1.0, tf.add(1.0, tf.exp(this.magScale.read()))));
          spec = tf.reverse(spec, -1);
          spec = tf.transpose(spec).expandDims(-1);
          return spec;
        }));
      });
    }
    static get className() { return 'MelSpecLayerSimple'; }
  }
  tf.serialization.registerClass(MelSpecLayerSimple);
  registerSTFT();

  birdModel = await tf.loadLayersModel(MODEL_ROOT + '/model.json', {
    onProgress: p => postMessage({ type: 'progress', stage: 'model', value: p })
  });
  postMessage({ type: 'progress', stage: 'warmup', value: 1 });
  tf.tidy(() => birdModel.predict(tf.zeros([1, 144000])));
  try { areaModel = await tf.loadGraphModel(MODEL_ROOT + '/area-model/model.json'); } catch (e) { areaModel = null; }

  const [en, es] = await Promise.all([
    fetch(MODEL_ROOT + '/labels/en_us.txt').then(r => r.text()),
    fetch(MODEL_ROOT + '/labels/es.txt').then(r => r.text()).catch(() => '')
  ]);
  const enL = en.split('\n'), esL = es.split('\n');
  birds = enL.filter(l => l.trim()).map((line, i) => {
    const [sci, com] = line.split('_');
    const esCom = (esL[i] || '').split('_')[1];
    return { i, sci: sci.trim(), en: (com || sci).trim(), es: (esCom || com || sci).trim() };
  });
  await setLocation(lat, lon, week);
  ready = true;
  postMessage({ type: 'ready', species: birds.length, geo: !!geo });
}

async function setLocation(lat, lon, week) {
  if (!areaModel || lat == null) { geo = null; return; }
  const scores = tf.tidy(() => areaModel.predict(tf.tensor([[lat, lon, week]])));
  geo = await scores.data();
  scores.dispose();
}

function rank(row, opts) {
  const out = [];
  for (let i = 0; i < row.length; i++) {
    if (row[i] < opts.min) continue;
    const g = geo ? geo[i] : 1;
    if (opts.geoFilter && geo && g < opts.geoThresh) continue;
    out.push({ ...birds[i], conf: row[i], geo: g });
  }
  return out.sort((a, b) => b.conf - a.conf).slice(0, opts.top || 10);
}

onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') return await init(data.lat, data.lon, data.week);
    if (data.type === 'location') {
      await setLocation(data.lat, data.lon, data.week);
      return postMessage({ type: 'located', geo: !!geo });
    }
    if (data.type === 'geoOf') {
      const b = birds.find(x => x.sci === data.sci);
      return postMessage({ type: 'geoOf', id: data.id, geo: geo && b ? geo[b.i] : null, known: !!b });
    }
    if (data.type === 'localList') {
      // species the geomodel expects here this week, sorted by likelihood
      if (!geo) return postMessage({ type: 'localList', id: data.id, list: [] });
      const list = birds.map(b => ({ ...b, geo: geo[b.i] })).filter(b => b.geo >= (data.thresh || 0.05)).sort((a, b) => b.geo - a.geo);
      return postMessage({ type: 'localList', id: data.id, list });
    }
    if (data.type === 'predict') {
      if (!ready) throw new Error('Model not ready');
      const W = 144000, pcm = data.pcm;
      const overlap = Math.max(0, Math.min(2.5, data.overlap ?? 0));
      const hop = Math.max(1, W - Math.round(overlap * 48000));
      const n = Math.max(1, Math.ceil(Math.max(0, pcm.length - W) / hop) + 1);
      const framed = new Float32Array(n * W);
      for (let f = 0; f < n; f++) framed.set(pcm.subarray(f * hop, Math.min(f * hop + W, pcm.length)), f * W);
      const input = tf.tensor2d(framed, [n, W]);
      const res = birdModel.predict(input);
      const rows = await res.array();
      input.dispose(); res.dispose();
      const opts = { min: data.min ?? 0.1, geoFilter: data.geoFilter !== false, geoThresh: data.geoThresh ?? 0.05, top: 10 };
      const segments = rows.map((row, f) => ({ start: f * hop / 48000, end: f * hop / 48000 + 3, top: rank(row, opts) }));
      // log-mean-exp pooling across windows (as BirdNET web demo)
      const K = rows[0].length, A = 5, pooled = new Float32Array(K);
      for (let i = 0; i < K; i++) { let s = 0; for (let f = 0; f < n; f++) s += Math.exp(A * rows[f][i]); pooled[i] = Math.log(s / n) / A; }
      const best = new Float32Array(K);
      for (let i = 0; i < K; i++) { let m = 0; for (let f = 0; f < n; f++) if (rows[f][i] > m) m = rows[f][i]; best[i] = m; }
      postMessage({ type: 'result', id: data.id, segments, pooled: rank(pooled, opts), best: rank(best, opts) });
    }
  } catch (e) {
    postMessage({ type: 'error', id: data && data.id, message: String(e && e.message || e) });
  }
};

/* STFT WebGL kernel, verbatim from the BirdNET web worker (MIT). */
function registerSTFT() {
  tf.registerKernel({
    kernelName: 'STFT', backendName: 'webgl',
    kernelFunc: ({ backend, inputs: { signal, frameLength, frameStep } }) => {
      const innerDim = frameLength / 2;
      const batch = (signal.size - frameLength + frameStep) / frameStep | 0;
      let currentTensor = backend.runWebGLProgram({
        variableNames: ['x'], outputShape: [batch, frameLength],
        userCode: `void main(){
          ivec2 c=getOutputCoords();
          int p=c[1]%${innerDim};
          int k=0;
          for(int i=0;i<${Math.log2(innerDim)};++i){
            if((p & (1<<i))!=0){ k|=(1<<(${Math.log2(innerDim) - 1}-i)); }
          }
          int i=2*k;
          if(c[1]>=${innerDim}){ i=2*(k%${innerDim})+1; }
          int q=c[0]*${frameLength}+i;
          float val=getX((q/${frameLength})*${frameStep}+ q % ${frameLength});
          float cosArg=${2.0 * Math.PI / frameLength}*float(q);
          float mul=0.5-0.5*cos(cosArg);
          setOutput(val*mul);
        }`
      }, [signal], 'float32');
      for (let len = 1; len < innerDim; len *= 2) {
        const prevTensor = currentTensor;
        currentTensor = backend.runWebGLProgram({
          variableNames: ['x'], outputShape: [batch, innerDim * 2],
          userCode: `void main(){
            ivec2 c=getOutputCoords();
            int b=c[0];
            int i=c[1];
            int k=i%${innerDim};
            int isHigh=(k%${len * 2})/${len};
            int highSign=(1 - isHigh*2);
            int baseIndex=k - isHigh*${len};
            float t=${Math.PI / len}*float(k%${len});
            float a=cos(t);
            float bsin=sin(-t);
            float oddK_re=getX(b, baseIndex+${len});
            float oddK_im=getX(b, baseIndex+${len + innerDim});
            if(i<${innerDim}){
              float evenK_re=getX(b, baseIndex);
              setOutput(evenK_re + (oddK_re*a - oddK_im*bsin)*float(highSign));
            } else {
              float evenK_im=getX(b, baseIndex+${innerDim});
              setOutput(evenK_im + (oddK_re*bsin + oddK_im*a)*float(highSign));
            }
          }`
        }, [prevTensor], 'float32');
        backend.disposeIntermediateTensorInfo(prevTensor);
      }
      const real = backend.runWebGLProgram({
        variableNames: ['x'], outputShape: [batch, innerDim + 1],
        userCode: `void main(){
          ivec2 c=getOutputCoords();
          int b=c[0];
          int i=c[1];
          int zI=i%${innerDim};
          int conjI=(${innerDim}-i)%${innerDim};
          float Zk0=getX(b,zI);
          float Zk1=getX(b,zI+${innerDim});
          float Zk_conj0=getX(b,conjI);
          float Zk_conj1=-getX(b,conjI+${innerDim});
          float t=${-2.0 * Math.PI}*float(i)/float(${innerDim * 2});
          float diff0=Zk0 - Zk_conj0;
          float diff1=Zk1 - Zk_conj1;
          float result=(Zk0+Zk_conj0 + cos(t)*diff1 + sin(t)*diff0)*0.5;
          setOutput(result);
        }`
      }, [currentTensor], 'float32');
      backend.disposeIntermediateTensorInfo(currentTensor);
      return real;
    }
  });
}
