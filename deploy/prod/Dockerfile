# React ERP Frontend - Optimized Dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm support
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only package files first to cache dependencies layer
COPY package.json pnpm-lock.yaml ./

# Install dependencies (only required for build)
RUN pnpm config set ignore-scripts true && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Production Server
FROM nginx:alpine-slim

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration template
COPY deploy/prod/nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create necessary directories and set permissions for non-root usage (if needed)
RUN mkdir -p /var/log/nginx /var/cache/nginx /var/run && \
    chown -R nginx:nginx /usr/share/nginx/html /var/log/nginx /var/cache/nginx

EXPOSE 80

# Create entrypoint script
# Using built-in envsubst from alpine and wget for healthcheck to minimize image size
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo 'mkdir -p /var/log/nginx /var/cache/nginx /var/run' >> /docker-entrypoint.sh && \
    echo 'chown -R nginx:nginx /var/log/nginx /var/cache/nginx' >> /docker-entrypoint.sh && \
    echo 'export API_BASE_URL=${API_BASE_URL:-http://backend:5160}' >> /docker-entrypoint.sh && \
    echo 'envsubst '"'"'$$API_BASE_URL'"'"' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["/docker-entrypoint.sh"]
