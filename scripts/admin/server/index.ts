import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { getConfig, updateConfig } from './config.ts';
import { handleError, json, matchRoute, type Route, servePublicImage } from './http.ts';
import { listImages, uploadCover, uploadSiteHeader, uploadWeeklyHeader } from './images.ts';
import { createPost, getPost, listPosts, markPostDraft, updatePost } from './posts.ts';

const HOST = '127.0.0.1';
const PORT = Number(process.env.KOHARU_ADMIN_PORT ?? 4322);

const clientRoot = path.resolve(fileURLToPath(new URL('../client', import.meta.url)));

const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/health$/,
    handler: (_request, response) => {
      json(response, 200, { ok: true, name: 'koharu-admin' });
    },
  },
  { method: 'GET', pattern: /^\/api\/posts$/, handler: listPosts },
  { method: 'GET', pattern: /^\/api\/posts\/(?<id>.+)$/, handler: getPost },
  { method: 'POST', pattern: /^\/api\/posts$/, handler: createPost },
  { method: 'PUT', pattern: /^\/api\/posts\/(?<id>.+)$/, handler: updatePost },
  { method: 'PATCH', pattern: /^\/api\/posts\/(?<id>.+)\/draft$/, handler: markPostDraft },
  { method: 'GET', pattern: /^\/api\/config$/, handler: getConfig },
  { method: 'PUT', pattern: /^\/api\/config$/, handler: updateConfig },
  { method: 'GET', pattern: /^\/api\/images$/, handler: listImages },
  { method: 'POST', pattern: /^\/api\/images\/covers$/, handler: uploadCover },
  { method: 'POST', pattern: /^\/api\/images\/site-header$/, handler: uploadSiteHeader },
  { method: 'POST', pattern: /^\/api\/images\/weekly-header$/, handler: uploadWeeklyHeader },
];

const vite = await createViteServer({
  root: clientRoot,
  server: { middlewareMode: true },
  appType: 'spa',
});

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${HOST}:${PORT}`);
    const matched = matchRoute(routes, request.method ?? 'GET', url.pathname);

    if (await servePublicImage(url.pathname, request.method ?? 'GET', response)) {
      return;
    }

    if (matched) {
      await matched.route.handler(request, response, matched.params);
      return;
    }

    vite.middlewares(request, response, (error?: unknown) => {
      if (error) {
        handleError(response, error);
      }
    });
  } catch (error) {
    handleError(response, error);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Koharu admin running at http://${HOST}:${PORT}`);
});
