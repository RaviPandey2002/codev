import Fastify from 'fastify'

const server = Fastify({
  logger: process.env.NODE_ENV === 'production',
})

server.get('/health', async () => {
  return { status: 'ok' }
})

const PORT = Number(process.env.PORT) || 3007;

const start = async () => {
  try {
    await server.listen({
      port: PORT,
      host: '0.0.0.0'
    })

    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start();