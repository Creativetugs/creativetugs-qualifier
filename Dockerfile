# Agent SDK requires Node >= 22.13 for built-in node:sqlite (SqliteLocalAgentStore).
FROM node:22.13-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
# Railway sets PORT; bind all interfaces for the container network.
EXPOSE 3000

CMD ["sh", "-c", "npx --yes @grok/agent-sdk@0.5.0 serve --dir . --mode single --host 0.0.0.0 --port ${PORT:-3000}"]
