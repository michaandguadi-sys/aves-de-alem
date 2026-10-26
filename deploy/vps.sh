#!/usr/bin/env bash
# Aves de Alem: install or update on a Docker + Traefik VPS.
# Usage (on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/michaandguadi-sys/aves-de-alem/main/deploy/vps.sh | bash -s -- birds.guadiandmicha.com
# Run the same line again to update to the newest version.
set -euo pipefail
DOMAIN="${1:-birds.guadiandmicha.com}"
NAME=aves-de-alem
DIR=/opt/aves-de-alem
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
command -v docker >/dev/null || { echo "Docker is not installed on this server."; exit 1; }

echo "1/4 Downloading the app…"
TMP=$(mktemp -d)
curl -fsSL https://codeload.github.com/michaandguadi-sys/aves-de-alem/tar.gz/refs/heads/main | tar xz --strip-components=1 -C "$TMP"
$SUDO mkdir -p "$DIR"
$SUDO rm -rf "$DIR/site.old"; [ -d "$DIR/site" ] && $SUDO mv "$DIR/site" "$DIR/site.old"
$SUDO mv "$TMP" "$DIR/site"; $SUDO chmod -R a+rX "$DIR/site"

echo "2/4 Reading your Traefik setup…"
TRAEFIK=$($SUDO docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}')
[ -n "$TRAEFIK" ] || { echo "No running Traefik container found."; exit 1; }
# copy entrypoint + cert resolver from a container Traefik already serves with HTTPS
REFLBL=$(for c in $($SUDO docker ps -q); do $SUDO docker inspect -f '{{.Name}}|{{json .Config.Labels}}' "$c"; done | grep -v "^/$NAME|" | grep 'certresolver' | head -1 || true)
RESOLVER=$(printf '%s' "$REFLBL" | grep -o 'tls.certresolver":"[^"]*' | head -1 | cut -d'"' -f3 || true)
ENTRY=$(printf '%s' "$REFLBL" | grep -o 'entrypoints":"[^"]*' | head -1 | cut -d'"' -f3 || true)
NET=$(printf '%s' "$REFLBL" | grep -o 'traefik.docker.network":"[^"]*' | head -1 | cut -d'"' -f3 || true)
if [ -z "$NET" ]; then
  NET=$($SUDO docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$TRAEFIK" | grep -v -e '^$' -e '^host$' -e '^bridge$' | head -1 || true)
  [ -n "$NET" ] || NET=bridge
fi
RESOLVER=${RESOLVER:-letsencrypt}; ENTRY=${ENTRY:-websecure}
echo "    traefik=$TRAEFIK network=$NET entrypoint=$ENTRY certresolver=$RESOLVER"

echo "3/4 Starting the web server for https://$DOMAIN …"
$SUDO docker rm -f "$NAME" >/dev/null 2>&1 || true
$SUDO docker run -d --name "$NAME" --restart unless-stopped --network "$NET" \
  -v "$DIR/site:/usr/share/nginx/html:ro" \
  -v "$DIR/site/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -l traefik.enable=true \
  -l "traefik.docker.network=$NET" \
  -l "traefik.http.routers.$NAME.rule=Host(\`$DOMAIN\`)" \
  -l "traefik.http.routers.$NAME.entrypoints=$ENTRY" \
  -l "traefik.http.routers.$NAME.tls=true" \
  -l "traefik.http.routers.$NAME.tls.certresolver=$RESOLVER" \
  -l "traefik.http.services.$NAME.loadbalancer.server.port=80" \
  nginx:1.27-alpine >/dev/null
$SUDO rm -rf "$DIR/site.old"

echo "4/4 Checking…"
MYIP=$(curl -fsS4 https://api.ipify.org 2>/dev/null || true)
DNSIP=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}' || true)
if [ -z "$DNSIP" ]; then
  echo "!! $DOMAIN has no DNS record yet. Add an A record: ${DOMAIN%%.*} -> $MYIP at your domain's DNS (e.g. Hostinger hPanel), then wait a few minutes."
elif [ -n "$MYIP" ] && [ "$DNSIP" != "$MYIP" ]; then
  echo "!! $DOMAIN points to $DNSIP but this server is $MYIP. Fix the A record."
else
  sleep 8
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/index.html" || true)
  echo "    https://$DOMAIN/ answers HTTP $CODE (the HTTPS certificate can take up to a minute on first start)"
fi
echo "Done. Open https://$DOMAIN on your phone → Share → Add to Home Screen."
