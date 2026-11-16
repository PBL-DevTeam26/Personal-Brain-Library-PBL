import type { RequestHandler } from 'express';
import { DEV_USER_ID, config } from './config.js';
export const requireUser: RequestHandler = (req, res, next) => {
  if (config.nodeEnv !== 'development' || !config.devAuthEnabled) {
    res.status(503).json({ error: { code: 'AUTH_NOT_IMPLEMENTED', message: 'Secure authentication not yet implemented' } }); return;
  }
  if (req.header('x-dev-user-id') !== DEV_USER_ID) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Synthetic dev user header required' } }); return;
  }
  res.locals.userId = DEV_USER_ID;
  next();
};
