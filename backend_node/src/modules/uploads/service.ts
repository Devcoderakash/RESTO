import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import { BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class UploadService {
  private supabase: any = null;

  constructor() {
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    }
  }

  public async uploadImage(fileBuffer: Buffer, mimeType: string, originalName?: string): Promise<{ url: string; key: string }> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestError('No file data provided');
    }

    const ext = originalName ? originalName.split('.').pop() || 'png' : 'png';
    const filename = `${randomUUID().substring(0, 12)}.${ext}`;
    const key = `menu-items/${filename}`;

    if (!this.supabase) {
      // Offline fallback mock URL if Supabase credentials not provided
      logger.warn('Supabase not configured, returning local reference url');
      return {
        url: `https://mock-storage.resto.internal/${env.SUPABASE_STORAGE_BUCKET}/${key}`,
        key,
      };
    }

    const { error } = await this.supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(key, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      logger.error({ error }, 'Failed to upload image to Supabase storage');
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data: publicData } = this.supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(key);

    return {
      url: publicData.publicUrl,
      key,
    };
  }
}
