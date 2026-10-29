# Railway production: OpenAI chat server (NOT agent-sdk serve).
# Cursor Agent SDK serve segfaults on Railway after Jsonl store open
# (native sqlite still used inside @cursor/sdk local runtime).
FROM node:22.13-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# Exact Custom Start Command if overriding: node scripts/chat-server.mjs
CMD ["node", "scripts/chat-server.mjs"]
