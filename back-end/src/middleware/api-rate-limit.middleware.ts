import rateLimit from 'express-rate-limit';

/** Limits API requests while leaving static frontend assets unaffected. */
export const apiRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many requests. Please try again later.' },
});
