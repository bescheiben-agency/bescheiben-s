import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const host = '127.0.0.1';
const port = 4321;
const vercelRoot = resolve(process.cwd(), '.vercel', 'output', 'static');
const root = existsSync(vercelRoot) ? vercelRoot : resolve(process.cwd(), 'dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const resolveRequest = async (pathname) => {
  const candidate = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;

  try {
    const info = await stat(candidate);
    return info.isDirectory() ? resolve(candidate, 'index.html') : candidate;
  } catch {
    return null;
  }
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${host}`).pathname);

  if (request.method === 'POST' && pathname === '/__test_shutdown__') {
    response.writeHead(204, { Connection: 'close' });
    response.end();
    setImmediate(() => server.close(() => process.exit(0)));
    return;
  }

  const requestedFile = await resolveRequest(pathname);
  const file = requestedFile ?? resolve(root, '404.html');
  const status = requestedFile ? 200 : 404;

  response.writeHead(status, {
    'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Static test server ready at http://${host}:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
