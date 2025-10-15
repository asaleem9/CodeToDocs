# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create startup script
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Use PORT environment variable or default to 8080' >> /docker-entrypoint.sh && \
    echo 'export PORT=${PORT:-8080}' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Replace PORT in nginx config' >> /docker-entrypoint.sh && \
    echo 'envsubst '"'"'$PORT'"'"' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Inject runtime environment variables as a separate JS file' >> /docker-entrypoint.sh && \
    echo 'echo "window.ENV = {" > /usr/share/nginx/html/env-config.js' >> /docker-entrypoint.sh && \
    echo 'echo "  VITE_API_URL: '"'"'${VITE_API_URL:-http://localhost:3001}'"'"'" >> /usr/share/nginx/html/env-config.js' >> /docker-entrypoint.sh && \
    echo 'echo "};" >> /usr/share/nginx/html/env-config.js' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Inject script tag into index.html if not already present' >> /docker-entrypoint.sh && \
    echo 'if ! grep -q "env-config.js" /usr/share/nginx/html/index.html; then' >> /docker-entrypoint.sh && \
    echo '  sed -i "s|<head>|<head><script src=\"/env-config.js\"></script>|" /usr/share/nginx/html/index.html' >> /docker-entrypoint.sh && \
    echo 'fi' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Debug output' >> /docker-entrypoint.sh && \
    echo 'echo "[Docker] Environment configuration:"' >> /docker-entrypoint.sh && \
    echo 'echo "  VITE_API_URL: ${VITE_API_URL}"' >> /docker-entrypoint.sh && \
    echo 'cat /usr/share/nginx/html/env-config.js' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Start nginx' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port (will be set by Cloud Run)
EXPOSE 8080

# Start with our custom entrypoint
CMD ["/docker-entrypoint.sh"]
