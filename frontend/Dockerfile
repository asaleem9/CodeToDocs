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
    echo '# Inject runtime environment variables into index.html' >> /docker-entrypoint.sh && \
    echo 'if [ -n "$VITE_API_URL" ]; then' >> /docker-entrypoint.sh && \
    echo '  ENV_JS="<script>window.ENV={VITE_API_URL:'"'"'$VITE_API_URL'"'"'};</script>"' >> /docker-entrypoint.sh && \
    echo '  sed -i "s|</head>|$ENV_JS</head>|" /usr/share/nginx/html/index.html' >> /docker-entrypoint.sh && \
    echo 'fi' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Start nginx' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port (will be set by Cloud Run)
EXPOSE 8080

# Start with our custom entrypoint
CMD ["/docker-entrypoint.sh"]
