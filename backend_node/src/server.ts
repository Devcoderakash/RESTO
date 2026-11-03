import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool, getPool } from './database/db.js';
import { RealtimeBridge } from './modules/realtime/RealtimeBridge.js';
import { RealtimeEventBus } from './modules/realtime/RealtimeEventBus.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize DB pool
  getPool();

  // Initialize Realtime Bridge for cross-instance pub/sub
  const realtimeBridge = new RealtimeBridge();
  await realtimeBridge.start();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'RESTO V2 Node.js backend running');
  });

  // Graceful shutdown protocol
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Initiating graceful server shutdown');
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        RealtimeEventBus.getInstance().stop();
        await realtimeBridge.stop();
        await closePool();
        logger.info('Clean shutdown completed');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Forced exit timeout after 10s
    setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal bootstrap error');
  process.exit(1);
});

