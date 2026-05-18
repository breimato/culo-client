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

### SiteGround

Sube el contenido de `dist/` a `public_html` y añade `.htaccess` para SPA (ver `vercel.json` como referencia de rewrites).

## Script de cartas

Para regenerar sprites desde la hoja maestra:

```bash
pip install pillow
python scripts/slice-baraja.py
```

Imagen fuente: `assets/Baraja_española_completa.png` → salida en `public/cards/`.
