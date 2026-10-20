import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const CONFIG = {
  PORT: process.env.API_PORT || 5000,
  ROOT_DIR,
  DATA_DIR: path.join(ROOT_DIR, 'data'),
  UPLOADS_DIR: path.join(ROOT_DIR, 'uploads'),
  TASKS_FILE: path.join(ROOT_DIR, 'data', 'tasks.json'),
  TOKEN_STATS_FILE: path.join(ROOT_DIR, 'data', 'token_stats.json'),
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'gemini-3.8-flash',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  QUOTAS: {
    RPM_LIMIT: 15,
    TPM_LIMIT: 1000000,
    RPD_LIMIT: 1500
  }
};
