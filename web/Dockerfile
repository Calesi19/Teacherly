# Teacherly web — production image for Fly.io.
# Single stage on purpose: the server runs its TypeScript source via tsx and
# the workspace packages resolve to their src/ entry points, so the runtime
# needs the full install (including devDependencies) anyway.
FROM node:22-slim

# argon2 ships prebuilt binaries for linux/glibc; the toolchain is only a
# fallback in case the prebuild is unavailable for this platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @teacherly/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@teacherly/server", "exec", "tsx", "src/production.ts"]
