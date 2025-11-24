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

# Copy node_modules from builder (includes workspace root dependencies)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy server's node_modules to ensure all server dependencies are available
COPY --from=builder /app/server/node_modules ./server/node_modules

# Copy built files
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
