import Fastify from 'fastify'
import 'dotenv/config'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/rooms.routes.js';
import executionRoutes from './routes/execution.routes.js';
import problemRoutes from './routes/problems.routes.js';
import wishlistRoutes from './routes/wishlists.routes.js';
import { AppError } from './utils/errors.js';
import { ZodError } from 'zod';
import fastifyWebsocket from '@fastify/websocket';
import wsRoutes from './routes/ws.routes.js';


const app = Fastify({
  logger: process.env.NODE_ENV === 'production',
  trustProxy: true,
});

// Production security headers
app.register(helmet, {
  // Disable HTML CSP on pure JSON/WebSocket API to save header payload
  contentSecurityPolicy: false,
  // Allow cross-origin requests from our separate Vite frontend
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

const getCorsOrigins = (): string[] => {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) return ['http://localhost:5173'];
  return clientUrl
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const getExtraCompanionOrigins = (): string[] => {
  const extra = process.env.COMPANION_ALLOWED_ORIGINS;
  if (!extra) return [];
  return extra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

app.register(cors, {
  delegator: (req, callback) => {
    const allowedClientOrigins = getCorsOrigins();
    const reqOrigin = req.headers.origin;
    const url = req.url || '';

    const isExtensionEndpoint =
      url.startsWith('/problems/companion') || url.startsWith('/problems/extension');

    if (isExtensionEndpoint) {
      const extraOrigins = getExtraCompanionOrigins();
      const isTrustedClient = Boolean(
        reqOrigin &&
          (allowedClientOrigins.includes('*') || allowedClientOrigins.includes(reqOrigin))
      );

      return callback(null, {
        origin: (origin, cb) => {
          if (
            !origin ||
            allowedClientOrigins.includes('*') ||
            allowedClientOrigins.includes(origin) ||
            extraOrigins.includes(origin) ||
            origin.startsWith('chrome-extension://') ||
            origin.startsWith('moz-extension://')
          ) {
            return cb(null, true);
          }
          return cb(null, false);
        },
        credentials: isTrustedClient,
      });
    }

    return callback(null, {
      origin: allowedClientOrigins.includes('*') ? true : allowedClientOrigins,
      credentials: true,
    });
  },
});

app.register(cookie, {
  secret: process.env.COOKIE_SECRET,
});

app.register(fastifyWebsocket);

app.register(wsRoutes, { prefix: "/ws" });

app.get('/health', async () => {
  return { status: 'ok' }
})

app.register(authRoutes, { prefix: "/auth" });
app.register(roomRoutes, { prefix: "/rooms" });
app.register(executionRoutes, { prefix: "/execute" });
app.register(problemRoutes, { prefix: "/problems" });
app.register(wishlistRoutes, { prefix: "/wishlists" });


app.setErrorHandler((error, req, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: error?.code || "BAD_REQUEST"
      }
    })
  }

  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
      }
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.issues?.[0]?.message || error.message || 'Validation failed',
      },
    });
  }

  req.log.error(error);

  return reply.status(500).send({
    error: {
      code: 'INTERNAL_app_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    },
  });

})

export default app;
