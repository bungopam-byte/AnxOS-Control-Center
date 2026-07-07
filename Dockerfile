FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

RUN mkdir -p /app/data /app/logs /app/config \
  && chown -R node:node /app

USER node

VOLUME ["/app/data", "/app/logs", "/app/config"]

CMD ["npm", "start"]
