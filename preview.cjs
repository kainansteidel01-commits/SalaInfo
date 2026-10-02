const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Set(['index.html','app.js','services.js','supabase-config.js','supabase-service.js']);
http.createServer((req,res) => {
  const name = req.url === '/' ? 'index.html' : req.url.slice(1);
  if (!files.has(name)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', name.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(fs.readFileSync(path.join(__dirname,name)));
}).listen(4173,'127.0.0.1');
