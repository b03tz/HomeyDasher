# --- deps stage: install all dependencies ---
FROM node:22-slim AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN pnpm install --frozen-lockfile

# --- build stage: compile everything ---
FROM deps AS build
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
COPY packages/frontend/ packages/frontend/

# Build in dependency order: shared → backend + frontend
RUN pnpm --filter @homecontrol/shared build && \
    pnpm --filter @homecontrol/backend build && \
    pnpm --filter @homecontrol/frontend build

# --- runtime stage: production only ---
FROM node:22-slim AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN pnpm install --frozen-lockfile --prod

# Copy compiled output
COPY --from=build /app/packages/shared/dist/ packages/shared/dist/
COPY --from=build /app/packages/backend/dist/ packages/backend/dist/
COPY --from=build /app/packages/frontend/dist/ packages/frontend/dist/

# Create data directory for persistent config/dashboards
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
EXPOSE 3001

CMD ["node", "packages/backend/dist/index.js"]
