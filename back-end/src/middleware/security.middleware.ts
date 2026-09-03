import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { apiRateLimitMiddleware } from './api-rate-limit.middleware';

/** Registers the application's HTTP security and request-protection middleware. */
export function configureSecurityMiddleware(app: NestExpressApplication): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'https://images.unsplash.com', 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );

  // Temporary compatibility limit for full-state/catalog sync; revisit with granular React/Redux/API state.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedCorsOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...configuredCorsOrigins,
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedCorsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'role', 'user-id', 'user-email'],
    exposedHeaders: ['X-Request-ID'],
  });

  // Protect API routes from accidental or abusive request flooding. Static
  // frontend assets are intentionally outside this limit.
  app.use('/api', apiRateLimitMiddleware);
}
