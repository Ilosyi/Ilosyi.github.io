import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { publicPathToFilePath } from '../shared/path-utils.ts';

export type RouteParams = Record<string, string>;
export type Handler = (request: IncomingMessage, response: ServerResponse, params: RouteParams) => Promise<void> | void;

export type Route = {
  method: string;
  pattern: RegExp;
  handler: Handler;
};

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function text(response: ServerResponse, statusCode: number, body: string): void {
  response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(body);
}

export async function servePublicImage(pathname: string, method: string, response: ServerResponse): Promise<boolean> {
  if (!pathname.startsWith('/img/')) return false;

  if (method !== 'GET' && method !== 'HEAD') {
    response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' });
    response.end('方法不允许');
    return true;
  }

  let filePath: string;
  try {
    filePath = publicPathToFilePath(decodeURIComponent(pathname));
  } catch {
    text(response, 404, '图片不存在');
    return true;
  }
  if (!isSupportedImagePath(filePath)) {
    text(response, 404, '图片不存在');
    return true;
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { 'content-type': getImageContentType(filePath) });
    response.end(method === 'HEAD' ? undefined : body);
  } catch {
    text(response, 404, '图片不存在');
  }

  return true;
}

function getImageContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.webp') return 'image/webp';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

function isSupportedImagePath(filePath: string): boolean {
  return ['.webp', '.png', '.jpg', '.jpeg', '.gif'].includes(path.extname(filePath).toLowerCase());
}

export async function readJson<T>(request: IncomingMessage): Promise<T> {
  const raw = await readBody(request);
  try {
    return JSON.parse(raw || '{}') as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new HttpError(400, 'JSON 格式无效');
    }
    throw error;
  }
}

export async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function matchRoute(routes: Route[], method: string, pathname: string): { route: Route; params: RouteParams } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    return { route, params: match.groups ?? {} };
  }
  return null;
}

export function handleError(response: ServerResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : '未知错误';
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  json(response, statusCode, { error: message });
}
