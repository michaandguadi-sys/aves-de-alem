#!/usr/bin/env bash
# Builds v2/index.html (test version) from index.html: same app + Science mode (v2/contrib.js).
# Run after any change to index.html.
set -euo pipefail
cd "$(dirname "$0")/.."
sed -e 's|<head>|<head>\n<base href="../">|' \
    -e 's|href="./manifest.webmanifest"|href="v2/manifest.webmanifest"|' \
    -e 's|<title>\([^<]*\)</title>|<title>\1 · v2</title>|' \
    -e 's|\(<script src="./app.js" defer></script>\)|\1\n<script src="v2/contrib.js" defer></script>|' \
    index.html > v2/index.html
grep -q 'v2/contrib.js' v2/index.html && grep -q '<base href="../">' v2/index.html && echo "v2/index.html ok"
