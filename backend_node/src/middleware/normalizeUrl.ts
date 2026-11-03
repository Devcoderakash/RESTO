import { Request, Response, NextFunction } from 'express';

export function normalizeUrl(req: Request, _res: Response, next: NextFunction): void {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    const cleanPath = req.path.replace(/\/+$/, '');
    req.url = cleanPath + query;
  }
  next();
}

