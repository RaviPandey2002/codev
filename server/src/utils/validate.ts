import { FastifyRequest } from 'fastify'
import { ZodType } from 'zod'

interface RequestValidators {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export const validateRequest = (validators: RequestValidators) => {
  return async (req: FastifyRequest) => {
    if (validators.body) {
      req.body = validators.body.parse(req.body);
    }
    if (validators.params) {
      req.params = validators.params.parse(req.params);
    }
    if (validators.query) {
      req.query = validators.query.parse(req.query);
    }
  };
};


export const validateBody = (schema: ZodType) => validateRequest({ body: schema });