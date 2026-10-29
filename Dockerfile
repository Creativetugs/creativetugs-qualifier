# Full bookworm (not slim): Agent SDK pulls node:sqlite via SqliteLocalAgentStore;
# slim images have segfaulted on Railway. We also shim SQLite → Jsonl at runtime.
FROM node:22.13-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV USE_JSONL_AGENT_STORE=1
EXPOSE 3000

# scripts/serve.mjs expands PORT and loads the Jsonl sqlite shim.
CMD ["node", "scripts/serve.mjs"]
