const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mind': 'application/octet-stream',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const safePath = path.normalize(req.url.split('?')[0]).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, safePath);

  if (path.basename(filePath) === 'server.js') {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const servePath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const ext = path.extname(servePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    fs.readFile(servePath, (err2, data) => {
      if (err2) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    });
  });
});

function getLocalIPs() {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   邯郸成语AR - 离线运行版            ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log('  ║  本机访问: http://localhost:' + PORT + '     ║');
  getLocalIPs().forEach(ip => {
    console.log('  ║  手机访问: http://' + ip + ':' + PORT + '  ║');
  });
  console.log('  ║  按 Ctrl+C 停止服务器                ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
