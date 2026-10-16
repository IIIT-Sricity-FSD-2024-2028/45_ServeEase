import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    auth?: { userId: string; role: string; email: string; providerCatalogId?: string; department?: string | null };
  }
}
