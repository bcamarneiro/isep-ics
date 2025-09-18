FROM oven/bun:1-alpine

WORKDIR /srv/app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code and tests
COPY src ./src
COPY test ./test

# Create non-root user (bun user already exists, just add to group)
RUN addgroup -g 1001 -S nodejs && \
    adduser -D -S -u 1001 -G nodejs appuser

# Change ownership
RUN chown -R appuser:nodejs /srv/app
USER appuser

ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --bun run -e "fetch('http://localhost:8080/healthz').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["bun", "run", "src/app.ts"]
