const fs   = require('fs');
const path = require('path');

const src  = path.join(__dirname, '..', 'node_modules', '@fontsource-variable', 'montserrat', 'files');
const dest = path.join(__dirname, '..', 'electron', 'fonts');

fs.mkdirSync(dest, { recursive: true });

fs.copyFileSync(
  path.join(src, 'montserrat-latin-wght-normal.woff2'),
  path.join(dest, 'montserrat-variable.woff2')
);
fs.copyFileSync(
  path.join(src, 'montserrat-latin-wght-italic.woff2'),
  path.join(dest, 'montserrat-variable-italic.woff2')
);

console.log('Fonts copied to electron/fonts/');
