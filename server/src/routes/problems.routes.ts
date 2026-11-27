import { FastifyInstance } from 'fastify';
import { importProblemSchema, type ImportProblemInput } from '@codev/shared';
import { validateBody } from '../utils/validate.js';
import { auth } from '../hooks/authenticate.js';
import { importProblem } from '../services/problems.service.js';
import { rateLimit } from '../services/rate_limiter.js';
import {
  createImportToken,
  getLatestCompanionProblem,
  getProblemByImportToken,
  setLatestCompanionProblem,
  mapCompanionPayloadToProblem,
  type CompanionPayload,
} from '../services/companion_listener.js';
import {
  buildConfiguredExtensionZip,
  getExtensionMetadata,
} from '../services/extension_packager.service.js';

export default async function problemRoutes(app: FastifyInstance) {
  // Public / extension endpoint for Competitive Companion & CodeV Chrome Extension
  app.get('/companion/latest', async (req, reply) => {
    const query = req.query as { since?: string; roomId?: string };
    const since = query.since ? parseInt(query.since, 10) : 0;
    const latest = getLatestCompanionProblem(isNaN(since) ? 0 : since, query.roomId);
    return reply.status(200).send({ latest });
  });

  // Retrieve staged problem by short-lived token (used when extension opens /import tab)
  app.get('/companion/import/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    const problem = getProblemByImportToken(token);
    if (!problem) {
      return reply.status(404).send({
        error: {
          code: 'IMPORT_TOKEN_NOT_FOUND',
          message: 'Imported problem link expired or was not found. Click Open in CodeV again.',
        },
      });
    }
    return reply.status(200).send({ problem });
  });

  app.post('/companion', async (req, reply) => {
    const query = req.query as { roomId?: string };
    const body = (req.body || {}) as CompanionPayload;
    const problem = mapCompanionPayloadToProblem(body);
    const roomId = query.roomId || body.roomId;

    // Automatic LeetCode snippet enrichment fallback if missing
    if (
      problem.platform === 'LEETCODE' &&
      (!problem.codeSnippets || problem.codeSnippets.length === 0) &&
      (problem.url || body.url || body.name)
    ) {
      try {
        const urlOrId = problem.url || body.url || body.name;
        const enriched = await importProblem({
          urlOrId,
          platform: 'LEETCODE',
        });
        if (enriched?.codeSnippets && enriched.codeSnippets.length > 0) {
          problem.codeSnippets = enriched.codeSnippets;
        }
      } catch (err: any) {
        req.log.warn({ err: err?.message }, 'Failed to enrich LeetCode companion problem snippets');
      }
    }

    setLatestCompanionProblem(problem, roomId);
    const importToken = createImportToken(problem);
    return reply.status(200).send({
      success: true,
      problem,
      roomId: roomId || 'global',
      importToken,
    });
  });

  // Extension metadata & dynamic pre-configured ZIP archive download
  app.get('/extension/info', async (req, reply) => {
    const info = await getExtensionMetadata({
      protocol: req.protocol,
      host: req.headers.host,
    });
    return reply.status(200).send(info);
  });

  app.get(
    '/extension/download',
    {
      preHandler: [
        rateLimit({
          max: 30,
          windowSec: 60,
          keyPrefix: 'extension-download',
          keyGenerator: (req) => req.ip,
        }),
      ],
    },
    async (req, reply) => {
      const { buffer } = await buildConfiguredExtensionZip({
        protocol: req.protocol,
        host: req.headers.host,
      });

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="codev-arena-companion.zip"')
        .header('Cache-Control', 'no-store')
        .send(buffer);
    }
  );

  // Authenticated routes below
  app.register(async (authedApp) => {
    authedApp.addHook('preHandler', auth);

    authedApp.post(
      '/import',
      {
        preHandler: [
          rateLimit({
            max: 20,
            windowSec: 60,
            keyPrefix: 'problem-import',
            keyGenerator: (req) => (req as any).user?.id || req.ip,
          }),
          validateBody(importProblemSchema),
        ],
      },
      async (req, reply) => {
        const input = req.body as ImportProblemInput;
        const problem = await importProblem(input);
        return reply.status(200).send({ problem });
      }
    );
  });
}
