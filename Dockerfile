# Build context: repository root.   docker build -t internal-linktree .
# Stage 1 builds the Nuxt app, stage 2 is the runtime: node + .output + a
# volume for the SQLite file. No native modules — node:sqlite is stdlib.

FROM node:24-slim AS build
RUN npm install -g pnpm@10.15.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm exec nuxt build

FROM node:24-slim AS runtime
RUN useradd --system --uid 10001 app && mkdir -p /app/data && chown app /app/data
WORKDIR /app
COPY --from=build /app/.output/ .output/
USER app
ENV NITRO_PORT=3000 NITRO_HOST=0.0.0.0 NODE_ENV=production NUXT_DB_PATH=/app/data/app.db NUXT_UPLOADS_DIR=/app/data/uploads \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning
VOLUME /app/data
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
