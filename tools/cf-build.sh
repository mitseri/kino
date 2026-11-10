#!/bin/bash
# Cloudflare Pages build: pulls the generated SEO pages (seo branch), minifies code, copies the site into dist/.
set -e
# guard: never publish a broken or truncated app
node --check app.js && node --check i18n.js
test "$(wc -c < app.js)" -gt 100000 || { echo "app.js looks truncated"; exit 1; }
grep -q "function startGuest" app.js
curl -sSfL https://codeload.github.com/mitseri/kino/tar.gz/refs/heads/seo | tar xz --strip-components=1
test -f sitemap.xml
rm -rf dist && mkdir dist
tar cf - --exclude=./dist --exclude=./.git --exclude=./android --exclude=./tools --exclude=./.github --exclude=./netlify --exclude=./functions --exclude=./node_modules --exclude=./netlify.toml --exclude=./migrate.json . | tar xf - -C dist
cd dist
for f in app.js i18n.js rare.js; do npx -y esbuild@0.24.0 $f --minify --charset=utf8 --target=es2020 --allow-overwrite --outfile=$f; done
npx -y esbuild@0.24.0 app.css --minify --charset=utf8 --allow-overwrite --outfile=app.css
