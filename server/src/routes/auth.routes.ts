import { FastifyInstance, FastifyReply } from 'fastify'
import { registerSchema, RegisterInput, loginSchema, LoginInput } from '@codev/shared'
import { validateBody } from '../utils/validate'
import * as authService from '../services/auth.service'
import { AppError } from '../utils/errors';
import { auth } from '../hooks/authenticate';

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

function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('accessToken', { path: '/' });
  reply.clearCookie('refreshToken', { path: '/' });
}

export default async function authRoutes(app: FastifyInstance) {
  app.post(
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

  app.post(
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
  );

  app.post(
    '/refresh',
    async (req, reply) => {

      const rawRefreshToken = req.cookies.refreshToken

      if (!rawRefreshToken) {
        throw new AppError('Session expired. Please log in again.', 401, 'REFRESH_TOKEN_INVALID');
      }

      const { user, accessToken, refreshToken } = await authService.refresh(rawRefreshToken);

      setAuthCookies(reply, {
        accessToken,
        refreshToken
      });

      return reply.status(200).send({ ok: true, accessToken, user });
    }
  );

  app.post(
    '/logout',
    async (req, reply) => {

      const rawRefreshToken = req.cookies.refreshToken

      await authService.logout(rawRefreshToken);

      clearAuthCookies(reply);

      return reply.status(200).send({ ok: true });
    }
  );

  app.get('/me', { preHandler: [auth] }, async (req, reply) => {
    return reply.status(200).send({
      user: req.user
    })
  })
}