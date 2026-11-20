import { FastifyInstance } from 'fastify';
import { importProblemSchema, type ImportProblemInput } from '@codev/shared';
import { validateBody } from '../utils/validate.js';
import { auth } from '../hooks/authenticate.js';
import { importProblem } from '../services/problems.service.js';
import { rateLimit } from '../services/rate_limiter.js';

export default async function problemRoutes(app: FastifyInstance) {
  // Authentication required to import problem
  app.addHook('preHandler', auth);

  app.post(
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
}
