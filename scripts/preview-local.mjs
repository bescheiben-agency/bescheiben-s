import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

// A persistent static preview of the production build. Kept separate from the
// E2E server so test teardown cannot close the user's browser preview.
const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 4322);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
const vercelRoot = resolve('.vercel/output/static');
const root = existsSync(vercelRoot) ? vercelRoot : resolve('dist');
if (!existsSync(resolve(root, 'index.html'))) throw new Error('Build missing. Run npm run build before starting the preview.');
const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8', '.pdf': 'application/pdf',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${host}`).pathname);
    if (pathname.startsWith('/api/')) {
      response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ error: 'O envio está disponível no ambiente publicado. Esta é uma prévia local da interface.' }));
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      response.writeHead(403);
      response.end();
      return;
    }
    let status = 200;
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      if (!(await stat(file)).isFile()) throw new Error('Not a file');
    } catch {
      file = resolve(root, '404.html');
      status = 404;
    }
    response.writeHead(status, { 'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') { response.end(); return; }
    createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(400);
    response.end('Invalid request');
  }
});
server.listen(port, host, () => console.log(`Bescheiben preview: http://${host}:${port}\nBuild: ${root}`));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
