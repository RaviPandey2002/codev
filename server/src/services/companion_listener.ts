import http from 'node:http';
import crypto from 'node:crypto';
import type { ArenaPlatform, CodeSnippet, ProblemData, TestCase } from '@codev/shared';

export interface CompanionTest {
  input: string;
  output: string;
}

export interface CompanionPayload {
  name: string;
  group?: string;
  url?: string;
  interactive?: boolean;
  memoryLimit?: number | string;
  timeLimit?: number | string;
  tests?: CompanionTest[];
  testType?: string;
  description?: string;
  difficulty?: string;
  tags?: string[];
  codeSnippets?: CodeSnippet[];
  inputSpecification?: string;
  outputSpecification?: string;
  platform?: ArenaPlatform;
  roomId?: string;
}

const GLOBAL_CHANNEL = 'global';
const MAX_CHANNELS = 500;
const latestByChannel = new Map<string, { problem: ProblemData; timestamp: number }>();

const MAX_IMPORT_TOKENS = 500;
const IMPORT_TOKEN_TTL_MS = 15 * 60 * 1000;
const importTokens = new Map<string, { problem: ProblemData; createdAt: number }>();

export function createImportToken(problem: ProblemData): string {
  const now = Date.now();
  for (const [k, v] of importTokens.entries()) {
    if (now - v.createdAt > IMPORT_TOKEN_TTL_MS) {
      importTokens.delete(k);
    }
  }
  while (importTokens.size >= MAX_IMPORT_TOKENS) {
    const oldest = importTokens.keys().next().value;
    if (oldest) importTokens.delete(oldest);
    else break;
  }
  const token = crypto.randomUUID();
  importTokens.set(token, { problem, createdAt: now });
  return token;
}

export function getProblemByImportToken(token: string): ProblemData | null {
  const entry = importTokens.get(token);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > IMPORT_TOKEN_TTL_MS) {
    importTokens.delete(token);
    return null;
  }
  return entry.problem;
}

function normalizeChannel(roomId?: string): string {
  const trimmed = roomId?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : GLOBAL_CHANNEL;
}

/**
 * Retrieves the latest ingested problem newer than `sinceTimestamp`.
 * Checks room-specific channel first; falls back to `'global'` (e.g. standalone Competitive Companion)
 * unless `COMPANION_STRICT_ROOM_SCOPING === 'true'`.
 */
export function getLatestCompanionProblem(
  sinceTimestamp = 0,
  roomId?: string
): { problem: ProblemData; timestamp: number } | null {
  const channel = normalizeChannel(roomId);
  const scoped = latestByChannel.get(channel);
  if (scoped && scoped.timestamp > sinceTimestamp) {
    return scoped;
  }

  const strictScoping = process.env.COMPANION_STRICT_ROOM_SCOPING === 'true';
  if (channel !== GLOBAL_CHANNEL && !strictScoping) {
    const globalEntry = latestByChannel.get(GLOBAL_CHANNEL);
    if (globalEntry && globalEntry.timestamp > sinceTimestamp) {
      return globalEntry;
    }
  }

  return null;
}

export function setLatestCompanionProblem(data: ProblemData, roomId?: string) {
  const channel = normalizeChannel(roomId);

  if (latestByChannel.size >= MAX_CHANNELS && !latestByChannel.has(channel)) {
    const oldestKey = latestByChannel.keys().next().value;
    if (oldestKey) latestByChannel.delete(oldestKey);
  }

  latestByChannel.delete(channel);
  latestByChannel.set(channel, {
    problem: data,
    timestamp: Date.now(),
  });
}

export function clearCompanionProblemsForTests() {
  latestByChannel.clear();
  importTokens.clear();
}

export function mapCompanionPayloadToProblem(body: CompanionPayload): ProblemData {
  const sampleCases: TestCase[] = (body.tests || []).map((t) => ({
    input: t.input || '',
    output: t.output || '',
  }));

  const isLeetCode = (body.url || '').includes('leetcode.com');
  const platform: ArenaPlatform = body.platform || (isLeetCode ? 'LEETCODE' : 'CODEFORCES');

  let timeLimit: string | undefined;
  if (typeof body.timeLimit === 'number') {
    timeLimit = `${body.timeLimit / 1000} seconds`;
  } else if (typeof body.timeLimit === 'string') {
    timeLimit = body.timeLimit;
  }

  let memoryLimit: string | undefined;
  if (typeof body.memoryLimit === 'number') {
    memoryLimit = `${body.memoryLimit} megabytes`;
  } else if (typeof body.memoryLimit === 'string') {
    memoryLimit = body.memoryLimit;
  }

  // Use rich description from extension if present; fallback to summary if Competitive Companion
  const description =
    body.description && body.description.trim().length > 0
      ? body.description
      : `Imported via Competitive Companion from ${body.group || body.url || 'Web'}.`;

  return {
    title: body.name || 'Imported Problem',
    platform,
    url: body.url || undefined,
    timeLimit,
    memoryLimit,
    description,
    sampleCases,
    sampleInput: sampleCases[0]?.input || '',
    sampleOutput: sampleCases[0]?.output || '',
    difficulty: body.difficulty,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    codeSnippets: Array.isArray(body.codeSnippets) ? body.codeSnippets : undefined,
    inputSpecification: body.inputSpecification,
    outputSpecification: body.outputSpecification,
  };
}

let serverInstance: http.Server | null = null;

/**
 * Starts an HTTP server on port 10043 (or COMPANION_PORT env var) for local Competitive Companion requests.
 */
export function startCompanionListener(
  port = process.env.COMPANION_PORT !== undefined ? Number(process.env.COMPANION_PORT) : 10043
): http.Server | null {
  if (port <= 0 || process.env.ENABLE_COMPANION_LISTENER === 'false') {
    console.info('[Competitive Companion] Standalone local listener disabled via environment config.');
    return null;
  }

  if (serverInstance) return serverInstance;

  const host = process.env.COMPANION_HOST || '127.0.0.1';

  const server = http.createServer((req, res) => {
    // CORS headers for browser extension
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);

    if (req.method === 'GET' && reqUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'Codev Companion Listener' }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', () => {
        try {
          const parsed = JSON.parse(body) as CompanionPayload;
          const problemData = mapCompanionPayloadToProblem(parsed);
          const roomId = reqUrl.searchParams.get('roomId') || parsed.roomId;
          setLatestCompanionProblem(problemData, roomId);

          // Asynchronously enrich if LeetCode problem arrived without snippets
          if (
            problemData.platform === 'LEETCODE' &&
            (!problemData.codeSnippets || problemData.codeSnippets.length === 0) &&
            (problemData.url || parsed.url)
          ) {
            import('./problems.service.js')
              .then(({ importProblem }) =>
                importProblem({
                  urlOrId: problemData.url || parsed.url || '',
                  platform: 'LEETCODE',
                })
              )
              .then((enriched) => {
                if (enriched?.codeSnippets && enriched.codeSnippets.length > 0) {
                  problemData.codeSnippets = enriched.codeSnippets;
                  setLatestCompanionProblem(problemData, roomId);
                }
              })
              .catch(() => {});
          }

          console.info(
            `[Competitive Companion] Received problem: "${problemData.title}" (${problemData.sampleCases?.length || 0} cases, channel=${roomId || GLOBAL_CHANNEL}).`
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, title: problemData.title }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Competitive Companion] Port ${port} is in use (e.g. by another tool or previous process). Companion listener disabled on this port.`);
    } else {
      console.error('[Competitive Companion] Server error:', err);
    }
  });

  server.listen(port, host, () => {
    console.info(`[Competitive Companion] Listener active on http://${host}:${port}`);
  });

  serverInstance = server;
  return server;
}
