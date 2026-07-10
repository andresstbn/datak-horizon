# Imagen productiva de horizon (Nuxt 4 / Nitro node-server) para Cloud Run.
# Multi-stage: el build necesita todo el source + devDeps; el runtime solo el
# .output autocontenido de Nitro. Ver docs/refactor/cloud-run-horizon-cutover.md.
#
# alpine: sin deps nativas reales (postgres.js y firebase-admin son JS puro;
# @tailwindcss/oxide ya viene con su build deshabilitado en pnpm-workspace.yaml).

FROM node:22-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runtime
# Nitro respeta $PORT (lo inyecta Cloud Run) pero por defecto escucha en
# localhost; HOST=0.0.0.0 es obligatorio para que Cloud Run alcance el contenedor.
ENV NODE_ENV=production \
    HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /src/.output ./.output
USER node
CMD ["node", ".output/server/index.mjs"]
