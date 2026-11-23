import { FastifyInstance } from 'fastify';
import { importProblemSchema, type ImportProblemInput } from '@codev/shared';
import { validateBody } from '../utils/validate.js';
import { auth } from '../hooks/authenticate.js';
import { importProblem } from '../services/problems.service.js';
import { rateLimit } from '../services/rate_limiter.js';
import {
  getLatestCompanionProblem,
  setLatestCompanionProblem,
  mapCompanionPayloadToProblem,
  type CompanionPayload,
} from '../services/companion_listener.js';

export default async function problemRoutes(app: FastifyInstance) {
  // Public / extension endpoint for Competitive Companion
  app.get('/companion/latest', async (req, reply) => {
    const query = req.query as { since?: string };
    const since = query.since ? parseInt(query.since, 10) : 0;
    const latest = getLatestCompanionProblem(isNaN(since) ? 0 : since);
    return reply.status(200).send({ latest });
  });

  app.post('/companion', async (req, reply) => {
    const body = req.body as CompanionPayload;
    const problem = mapCompanionPayloadToProblem(body);
    setLatestCompanionProblem(problem);
    return reply.status(200).send({ success: true, problem });
  });

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
