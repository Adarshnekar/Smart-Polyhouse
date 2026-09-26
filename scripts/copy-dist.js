import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const clientDir = path.join(rootDir, 'dist', 'client');
const targetDistDir = path.join(rootDir, 'dist');

if (fs.existsSync(clientDir)) {
  console.log('[postbuild] Syncing dist/client files to dist root for universal Vercel / static hosting compatibility...');
  fs.cpSync(clientDir, targetDistDir, { recursive: true });
  console.log('[postbuild] Successfully copied dist/client to dist root.');
} else {
  console.warn('[postbuild] Warning: dist/client not found.');
}
