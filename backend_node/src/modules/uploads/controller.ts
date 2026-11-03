import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../utils/errors.js';
import { UploadService } from './service.js';

const uploadService = new UploadService();

export async function uploadMenuImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check if body is base64 image or multipart buffer
    let buffer: Buffer;
    let mimeType = 'image/png';
    let originalName = 'image.png';

    if (req.body?.image && typeof req.body.image === 'string') {
      const parts = req.body.image.split(',');
      const base64Data = parts.length > 1 ? parts[1] : parts[0];
      buffer = Buffer.from(base64Data, 'base64');
      if (parts[0].includes('image/jpeg')) mimeType = 'image/jpeg';
      else if (parts[0].includes('image/webp')) mimeType = 'image/webp';
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      mimeType = req.headers['content-type'] || 'image/png';
    } else {
      throw new BadRequestError('Image payload must be a base64 encoded string or raw image buffer');
    }

    const result = await uploadService.uploadImage(buffer, mimeType, originalName);
    res.status(201).json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    next(error);
  }
}
