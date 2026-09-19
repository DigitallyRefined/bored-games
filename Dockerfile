FROM oven/bun:1

WORKDIR /app

COPY api/package.json api/bun.lock* ./
RUN bun install

COPY api ./api
COPY shared ./shared

WORKDIR /app/api

EXPOSE 3001

CMD ["bun", "run", "index.ts"]