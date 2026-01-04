#!/bin/bash

# SSL Certificate Initialization Script for Let's Encrypt
# Domain: competition.mareate.com

set -e

DOMAIN="competition.mareate.com"
EMAIL="admin@mareate.com"  # Change this to your email
STAGING=0  # Set to 1 for testing (to avoid rate limits)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL Certificate Initialization${NC}"
echo -e "${GREEN}  Domain: ${DOMAIN}${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Create required directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Download recommended TLS parameters
if [ ! -e "./certbot/conf/options-ssl-nginx.conf" ]; then
    echo -e "${YELLOW}Downloading recommended TLS parameters...${NC}"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > ./certbot/conf/options-ssl-nginx.conf
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > ./certbot/conf/ssl-dhparams.pem
fi

# Create temporary self-signed certificate for initial nginx startup
echo -e "${YELLOW}Creating temporary self-signed certificate...${NC}"
mkdir -p "./certbot/conf/live/${DOMAIN}"

# Generate self-signed certificate
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout "./certbot/conf/live/${DOMAIN}/privkey.pem" \
    -out "./certbot/conf/live/${DOMAIN}/fullchain.pem" \
    -subj "/CN=${DOMAIN}" 2>/dev/null

echo -e "${GREEN}Temporary certificate created.${NC}"

# Start nginx with temporary certificate
echo -e "${YELLOW}Starting nginx...${NC}"
docker compose up -d nginx

# Wait for nginx to start
echo -e "${YELLOW}Waiting for nginx to start...${NC}"
sleep 5

# Delete temporary certificate
echo -e "${YELLOW}Removing temporary certificate...${NC}"
rm -rf "./certbot/conf/live/${DOMAIN}"

# Request real certificate from Let's Encrypt
echo -e "${YELLOW}Requesting Let's Encrypt certificate...${NC}"

# Staging flag for testing
STAGING_FLAG=""
if [ $STAGING -eq 1 ]; then
    echo -e "${YELLOW}Using staging environment (for testing)${NC}"
    STAGING_FLAG="--staging"
fi

docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    ${STAGING_FLAG} \
    -d ${DOMAIN}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Certificate obtained successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"

    # Reload nginx with real certificate
    echo -e "${YELLOW}Reloading nginx with new certificate...${NC}"
    docker compose exec nginx nginx -s reload

    echo -e "${GREEN}SSL setup complete!${NC}"
    echo -e "${GREEN}Your site is now available at: https://${DOMAIN}${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Failed to obtain certificate${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Please check:${NC}"
    echo -e "${RED}1. Domain DNS is pointing to this server${NC}"
    echo -e "${RED}2. Port 80 is open in firewall${NC}"
    echo -e "${RED}3. No other service is using port 80${NC}"
    exit 1
fi
