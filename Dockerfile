# Production image for Creative Tugs qualifier on Railway.
# MUST start via `node scripts/serve.mjs` (Jsonl shim). Never bare `agent-sdk serve`.
FROM node:22.13-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV USE_JSONL_AGENT_STORE=1
# Belt-and-suspenders: any `node …` process in this image loads the Jsonl shim.
ENV NODE_OPTIONS="--import=/app/scripts/register-jsonl-store.mjs"

EXPOSE 3000

# Exact command Railway should run (Custom Start Command if overriding):
CMD ["node", "scripts/serve.mjs"]
