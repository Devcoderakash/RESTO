import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { normalizeUrl } from './middleware/normalizeUrl.js';
import { createApiRouter } from './routes.js';

export function createApp(): Express {
  const app = express();

  // 1. Basic security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows cross-origin SSE and media loading
    })
  );

  // 2. CORS Handling
  app.use(corsMiddleware);

  // 3. Response timing middleware (populates X-Response-Time header)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: any[]) {
      if (!res.headersSent) {
        const durationMs = (performance.now() - start).toFixed(2);
        res.setHeader('X-Response-Time', `${durationMs}ms`);
      }
      return (originalEnd as any).apply(this, args);
    } as any;
    next();
  });

  // 4. URL Trailing Slash Normalization (Prevents 301 redirects)
  app.use(normalizeUrl);

  // 5. Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Dual-Route Mounting for Zero-Redesign Frontend Parity
  const apiRouter = createApiRouter();
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
