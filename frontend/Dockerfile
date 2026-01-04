# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared types first (needed for build)
COPY shared/ ../shared/

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./

# Build the application
RUN npm run build

# Production stage - just output the dist folder
# This will be used by docker-compose to copy to nginx
FROM alpine:latest AS production

WORKDIR /app

# Copy built static files
COPY --from=builder /app/dist ./dist

# This stage is used to extract the dist folder
# The actual serving is done by nginx
CMD ["echo", "Frontend build complete. Files are in /app/dist"]
