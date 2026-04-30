import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sheetsHandler from './api/sheets.js';
import webSearchHandler from './api/web-search.js';
import geminiChatHandler from './api/gemini-chat.js';
import chatFeedbackHandler from './api/chat-feedback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

const routeMap = new Map([
  ['/scholarships', '/scholarships.html'],
  ['/scholarships-national', '/scholarships-national.html'],
  ['/scholarships-international', '/scholarships-international.html'],
  ['/jobs', '/jobs.html'],
  ['/jobs-government', '/jobs-government.html'],
  ['/jobs-private', '/jobs-private.html'],
  ['/internships', '/internships.html'],
  ['/exams', '/exams.html'],
  ['/exams-mdcat', '/exams-mdcat.html'],
  ['/exams-css', '/exams-css.html'],
  ['/exams-ppsc', '/exams-ppsc.html'],
  ['/books', '/books.html'],
  ['/search', '/search.html'],
  ['/favorites', '/favorites.html'],
  ['/resume-builder', '/resume-builder.html'],
  ['/about', '/about.html'],
  ['/contact', '/contact.html'],
  ['/terms', '/terms.html'],
  ['/privacy', '/privacy.html'],
  ['/opportunity', '/opportunity.html'],
  ['/', '/index.html'],
]);

const apiHandlers = {
  '/api/sheets': sheetsHandler,
  '/api/web-search': webSearchHandler,
  '/api/gemini-chat': geminiChatHandler,
  '/api/chat-feedback': chatFeedbackHandler,
};

function createResAdapter(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = (data) => {
    res.end(data);
    return res;
  };
  return res;
}

function parseBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(urlPath, res) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const filePath = path.join(__dirname, decodedPath);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8',
      '.webmanifest': 'application/manifest+json; charset=utf-8',
    };

    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    if (decodedPath.startsWith('/css/') || decodedPath.startsWith('/js/')) {
      res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    }

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (apiHandlers[url.pathname]) {
    try {
      req.query = Object.fromEntries(url.searchParams.entries());
      req.body = await parseBody(req);
      await apiHandlers[url.pathname](req, createResAdapter(res));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: `Server error: ${error.message}` }));
    }
    return;
  }

  const rewritten = routeMap.get(url.pathname) || url.pathname;
  serveStatic(rewritten, res);
});

server.listen(PORT, () => {
  console.log(`CareerPK server listening on port ${PORT}`);
});
