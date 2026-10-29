// Génère build/icon.png (512×512) et public/icon.png à partir de build/icon.svg.
// Usage : npx electron scripts/render-icon.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'build/icon.svg'), 'utf8');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    transparent: true,
    frame: false,
    useContentSize: true,
    webPreferences: { offscreen: true },
  });
  const html = `<body style="margin:0;background:transparent">${svg.replace('<svg ', '<svg width="512" height="512" ')}</body>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 300));
  const png = (await win.webContents.capturePage()).resize({ width: 512, height: 512 }).toPNG();
  fs.writeFileSync(path.join(root, 'build/icon.png'), png);
  fs.writeFileSync(path.join(root, 'public/icon.png'), png);
  console.log('icon.png généré');
  app.quit();
});
