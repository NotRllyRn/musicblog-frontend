# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG WORDPRESS_BASE_URL
ENV NEXT_OUTPUT_MODE=standalone
ENV WORDPRESS_BASE_URL=$WORDPRESS_BASE_URL
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN --mount=type=secret,id=wordpress_env,required=true \
    node --env-file=/run/secrets/wordpress_env -e \
    "const b=process.env.WORDPRESS_BASE_URL?.replace(/\/$/,'');const u=process.env.WORDPRESS_USERNAME;const p=process.env.WORDPRESS_APP_PASSWORD;if(!b||!u||!p)throw new Error('Required WordPress environment is missing');const root=b.includes('/wp-json/wp/v2')?b:b+'/wp-json/wp/v2';fetch(root+'/posts?per_page=1&_fields=id',{headers:{Authorization:'Basic '+Buffer.from(u+':'+p).toString('base64')},signal:AbortSignal.timeout(30000)}).then(r=>{if(!r.ok)throw new Error('WordPress preflight returned '+r.status)}).catch(error=>{console.error(error.message);process.exit(1)})"
RUN --mount=type=secret,id=wordpress_env,required=true \
    node --env-file=/run/secrets/wordpress_env -e \
    "require('node:child_process').execFileSync('pnpm',['build'],{stdio:'inherit'})"

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown -R node:node .next/cache

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(response=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
