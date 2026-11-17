import app from "./app";
import { roomHub } from "./websocket/room_hub";

const PORT = Number(process.env.PORT) || 3007;

const start = async () => {
  try {
    await app.listen({
      port: PORT,
      host: '0.0.0.0'
    });

    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  console.info(`[Shutdown] Received ${signal}. Flushing active Yjs snapshots...`);
  try {
    await roomHub.flushAllRooms();
    console.info('[Shutdown] All active Yjs snapshots saved successfully.');
  } catch (err) {
    console.error('[Shutdown] Error flushing Yjs snapshots:', err);
  }

  try {
    await app.close();
    console.info('[Shutdown] Server closed.');
  } catch (err) {
    console.error('[Shutdown] Error closing server:', err);
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();