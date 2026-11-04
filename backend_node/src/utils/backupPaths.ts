import fs from 'fs';
import path from 'path';

export function getBackupFilePath(): string {
  if (process.env.BACKUP_FILE && fs.existsSync(process.env.BACKUP_FILE)) {
    return process.env.BACKUP_FILE;
  }

  const candidates = [
    path.resolve(process.cwd(), 'backups/backup_v1_production_data.json'),
    path.resolve(process.cwd(), '../backups/backup_v1_production_data.json'),
    path.resolve(process.cwd(), 'backend/supabase/backup_v1_production_data.json'),
    path.resolve(process.cwd(), '../backend/supabase/backup_v1_production_data.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'backups/backup_v1_production_data.json';
}

export function getStorageBackupDir(): string {
  if (process.env.STORAGE_DIR && fs.existsSync(process.env.STORAGE_DIR)) {
    return process.env.STORAGE_DIR;
  }

  const candidates = [
    path.resolve(process.cwd(), 'backups/storage_backup/menu-items'),
    path.resolve(process.cwd(), '../backups/storage_backup/menu-items'),
    path.resolve(process.cwd(), 'backend/supabase/storage_backup/menu-items'),
    path.resolve(process.cwd(), '../backend/supabase/storage_backup/menu-items'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'backups/storage_backup/menu-items';
}

