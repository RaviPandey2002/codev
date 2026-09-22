import Fastify from 'fastify'
import 'dotenv/config'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/rooms.routes.js';
import { AppError } from './utils/errors.js';
import { ZodError } from 'zod';
import fastifyWebsocket from '@fastify/websocket';
import wsRoutes from './routes/ws.routes.js';


const app = Fastify({
  logger: process.env.NODE_ENV === 'production',
});

app.register(cors, {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
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