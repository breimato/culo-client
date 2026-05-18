# El Culo — Cliente

Frontend del juego **El Culo** (React 18 + Vite + TypeScript + WebSocket STOMP).

Repositorio del servidor: despliega por separado el backend Java y configura `VITE_WS_URL`.

## Requisitos

- Node.js 20+
- pnpm (recomendado) o npm

## Arranque local

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Abre `http://localhost:5173`. El backend debe estar en `http://localhost:8080` (ver repo del servidor).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_WS_URL` | URL SockJS del backend, p. ej. `http://localhost:8080/ws` |

En producción, define `VITE_WS_URL` **antes** de `pnpm build` (se incrusta en el bundle).

## Build para producción

```bash
pnpm build
```

Salida en `dist/`. Súbela a SiteGround, Vercel, Netlify, etc.

### Vercel

- Root: repositorio (raíz)
- Build: `pnpm build`
- Output: `dist`
- Variable: `VITE_WS_URL=https://tu-api/ws`

### SiteGround (FTP)

1. Copia `.env.deploy.example` → `.env.deploy.local` y rellena host, usuario y contraseña FTP.
2. Define `VITE_WS_URL` con la URL SockJS de producción.
3. Ejecuta:

```bash
pnpm install
pnpm deploy:ftp
```

El script hace `build` y sube `dist/` (incluye `public/.htaccess` para rutas SPA).

Ruta por defecto en SiteGround: `breimato.es/public_html/culo` → **https://breimato.es/culo/**  
Ajusta `FTP_REMOTE_DIR` y `VITE_BASE_PATH` en `.env.deploy.local` si cambias la carpeta.

### GitHub Actions (deploy automático)

En el repo → **Settings → Secrets and variables → Actions**:

| Secret | Descripción |
|--------|-------------|
| `SITEGROUND_FTP_HOST` | Host FTP |
| `SITEGROUND_FTP_USERNAME` | Usuario FTP |
| `SITEGROUND_FTP_PASSWORD` | Contraseña FTP |
| `SITEGROUND_FTP_PORT` | Puerto (p. ej. `21`) |
| `VITE_WS_URL` | URL SockJS de producción |

Cada push a `main` ejecuta build y subida FTP (ver `.github/workflows/deploy.yml`).

## Script de cartas

Para regenerar sprites desde la hoja maestra:

```bash
pip install pillow
python scripts/slice-baraja.py
```

Imagen fuente: `assets/Baraja_española_completa.png` → salida en `public/cards/`.
