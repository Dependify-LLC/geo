# Build Stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN npm install

# Copy source code
COPY client ./client
COPY server ./server

# Build client and server
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /app

# Install Chromium and dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install production dependencies only (or copy from builder if needed, but clean install is safer for size)
# However, for simplicity and ensuring all deps are present (including workspace links), we'll copy node_modules from builder for now
# Optimization: In a real prod setup, we'd prune devDeps.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/dist/index.js"]
