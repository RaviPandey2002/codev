import { FastifyInstance, FastifyReply } from 'fastify'
import { registerSchema, RegisterInput, loginSchema, LoginInput } from '../schemas/auth.schema'
import { validateBody } from '../utils/validate'
import * as authService from '../services/auth.service'

function setAuthCookies(
  reply: FastifyReply,
  { accessToken, refreshToken }: { accessToken: string; refreshToken: string }
) {
  const isProd = process.env.NODE_ENV === 'production';
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes in seconds
  });
}

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

      setAuthCookies(reply, {
        accessToken,
        refreshToken
      });

      // 3. Return 201 Created with user info and accessToken in body
      return reply.status(201).send({
        user,
        accessToken,
      });
    }
  );
  server.post(
    '/login',
    { preHandler: validateBody(loginSchema) },
    async (req, reply) => {
      const { email, password } = req.body as LoginInput;

      const { user, accessToken, refreshToken } = await authService.login({ email, password });

      setAuthCookies(reply, {
        accessToken,
        refreshToken
      });

      return reply.status(200).send({
        user,
        accessToken
      });
    }
  )
}