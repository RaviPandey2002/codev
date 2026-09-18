import { FastifyRequest } from "fastify";
import { AppError } from "../utils/errors";
import jwt from 'jsonwebtoken'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      username: string;
    };
  }
}

interface AccessTokenPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export async function auth(req: FastifyRequest) {
  const token = req.cookies.accessToken || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AppError("JWT secret initialized", 500, "INTERNAL_SERVER_ERROR");
  }

  try {

    const payload = jwt.verify(token, jwtSecret) as AccessTokenPayload;

    req.user = { id: payload.userId, email: payload.email, username: payload.username };

  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token expired', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid access token', 401, 'UNAUTHORIZED');
  }

}