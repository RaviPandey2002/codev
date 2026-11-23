import http from 'node:http';
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
}

let latestProblem: { problem: ProblemData; timestamp: number } | null = null;

export function getLatestCompanionProblem(sinceTimestamp = 0): { problem: ProblemData; timestamp: number } | null {
  if (latestProblem && latestProblem.timestamp > sinceTimestamp) {
    return latestProblem;
  }
  return null;
}

export function setLatestCompanionProblem(data: ProblemData) {
  latestProblem = {
    problem: data,
    timestamp: Date.now(),
  };
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
 * Starts an HTTP server on port 10043 (standard Competitive Companion port).
 */
export function startCompanionListener(port = 10043): http.Server | null {
  if (serverInstance) return serverInstance;

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

    if (req.method === 'GET' && req.url === '/health') {
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
          setLatestCompanionProblem(problemData);
          console.info(`[Competitive Companion] Received problem: "${problemData.title}" with ${problemData.sampleCases?.length || 0} cases.`);

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

  server.listen(port, () => {
    console.info(`[Competitive Companion] Listener active on http://localhost:${port}`);
  });

  serverInstance = server;
  return server;
}
