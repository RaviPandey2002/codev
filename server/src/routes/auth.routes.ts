import { FastifyInstance } from 'fastify'
import { registerSchema, RegisterInput } from '../schemas/auth.schema'
import { validateBody } from '../utils/validate'
import * as authService from '../services/auth.service'

export default async function authRoutes(server: FastifyInstance) {
  server.post(
    '/register',
    { preHandler: validateBody(registerSchema) },
    async (req, reply) => {
      const { username, email, password } = req.body as RegisterInput;

      const { user, accessToken, refreshToken } = await authService.register({
        username,
        email,
        password,
      });

      // 1. Set httpOnly refresh token cookie (7 days)
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      });

      // 2. Set httpOnly access token cookie (15 minutes)
      reply.setCookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60, // 15 minutes in seconds
      });

      // 3. Return 201 Created with user info and accessToken in body
      return reply.status(201).send({
        user,
        accessToken,
      });
    }
  );
}