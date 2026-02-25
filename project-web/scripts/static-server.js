const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || process.cwd();
const port = Number(process.argv[3] || 8080);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(root, urlPath === '/' ? '/index.html' : urlPath);

  if (!filePath.startsWith(root)) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err) return send(res, 404, 'Not Found');

    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) return send(res, 404, 'Not Found');
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, mime[ext] || 'application/octet-stream');
    });
  });
});

server.listen(port, () => {
  console.log(`Static server running: http://localhost:${port}`);
  console.log(`Root: ${root}`);
});
