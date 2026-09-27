import { FastifyInstance } from 'fastify';
import { executeCodeSchema, ExecuteCodeInput } from '@codev/shared';
import { validateBody } from '../utils/validate.js';
import { auth } from '../hooks/authenticate.js';
import { executeCode } from '../services/execution.service.js';

export default async function executionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', auth);

  app.post(
    '/',
    { preHandler: [validateBody(executeCodeSchema)] },
    async (req, reply) => {
      const { language, compilerProfile, code, stdin } =
        req.body as ExecuteCodeInput;

      const result = await executeCode({
        language,
        compilerProfile,
        code,
        stdin,
        triggeredBy: req.user.username,
      });

      return reply.status(200).send({ result });
    }
  );
}
