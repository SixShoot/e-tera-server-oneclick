rm -f ./public/lib/all.min.js
rm -rf release-builds
rm -rf ./dist
npm run uglify-front
npm run build
npm run package-linux
npm run package-mac