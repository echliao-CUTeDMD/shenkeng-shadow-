const fs=require('node:fs'),path=require('node:path');
process.chdir(__dirname);
const assets={};
for(const file of fs.readdirSync('assets').filter(f=>f.endsWith('.webp'))){assets[path.basename(file,'.webp')]='data:image/webp;base64,'+fs.readFileSync(path.join('assets',file)).toString('base64')}
let h=fs.readFileSync('src/template.html','utf8');
h=h.replace('/* STYLE */',()=>fs.readFileSync('src/style.css','utf8')).replace('/* ENGINE */',()=>fs.readFileSync('src/engine.js','utf8')).replace('/* UI */',()=> 'const ASSETS='+JSON.stringify(assets)+';\n'+fs.readFileSync('src/ui.js','utf8'));
h=h.replace('assets/header.webp',()=>assets.header);
fs.writeFileSync('index.html',h);fs.writeFileSync('.nojekyll','');console.log('Built standalone index.html ('+(Buffer.byteLength(h)/1024/1024).toFixed(2)+' MB)');
