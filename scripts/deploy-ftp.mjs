import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { Client } from 'basic-ftp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.deploy.local');

function loadDeployEnv() {
  if (!existsSync(envPath)) {
    console.error('Falta .env.deploy.local (copia desde .env.deploy.example)');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

function runBuild(cfg) {
  return new Promise((resolvePromise, reject) => {
    const env = { ...process.env };
    if (cfg.VITE_WS_URL) env.VITE_WS_URL = cfg.VITE_WS_URL;
    if (cfg.VITE_BASE_PATH) env.VITE_BASE_PATH = cfg.VITE_BASE_PATH;

    const child = spawn('pnpm', ['run', 'build'], {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: true,
    });
    child.on('close', (code) => (code === 0 ? resolvePromise() : reject(new Error(`build falló (${code})`))));
  });
}

async function deployFtp(cfg) {
  const client = new Client(60_000);
  client.ftp.verbose = process.env.FTP_VERBOSE === '1';

  const port = Number(cfg.FTP_PORT || 21);
  const secure = cfg.FTP_SECURE === 'true';

  await client.access({
    host: cfg.FTP_HOST,
    user: cfg.FTP_USER,
    password: cfg.FTP_PASSWORD,
    port,
    secure,
  });

  const remoteDir = (cfg.FTP_REMOTE_DIR || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const distPath = resolve(root, 'dist');

  await client.cd('/');
  console.log(`Subiendo ${distPath} → /${remoteDir || ''}…`);
  await client.uploadFromDir(distPath, remoteDir || undefined);
  client.close();
}

const cfg = loadDeployEnv();
const required = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD'];
for (const key of required) {
  if (!cfg[key]) {
    console.error(`Falta ${key} en .env.deploy.local`);
    process.exit(1);
  }
}

console.log('Build de producción…');
if (cfg.VITE_WS_URL) console.log(`  VITE_WS_URL=${cfg.VITE_WS_URL}`);
if (cfg.VITE_BASE_PATH) console.log(`  VITE_BASE_PATH=${cfg.VITE_BASE_PATH}`);

await runBuild(cfg);
await deployFtp(cfg);
console.log('Despliegue FTP completado.');
