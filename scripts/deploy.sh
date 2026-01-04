#!/bin/bash

# Deployment Script for Math Competition Platform
# Server: competition.mareate.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Math Competition Platform Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

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

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}.env.production file not found!${NC}"
    echo -e "${YELLOW}Please create .env.production with your production settings.${NC}"
    exit 1
fi

# Parse command line arguments
ACTION=${1:-"deploy"}

case $ACTION in
    deploy)
        echo -e "${YELLOW}Starting deployment...${NC}"

        # Pull latest code (if using git)
        if [ -d ".git" ]; then
            echo -e "${YELLOW}Pulling latest code...${NC}"
            git pull origin main || true
        fi

        # Build and start services
        echo -e "${YELLOW}Building Docker images...${NC}"
        docker compose build --no-cache

        echo -e "${YELLOW}Starting services...${NC}"
        docker compose up -d

        echo -e "${GREEN}Deployment complete!${NC}"
        ;;

    update)
        echo -e "${YELLOW}Updating services...${NC}"

        # Pull latest code (if using git)
        if [ -d ".git" ]; then
            echo -e "${YELLOW}Pulling latest code...${NC}"
            git pull origin main || true
        fi

        # Rebuild and restart
        docker compose build
        docker compose up -d

        echo -e "${GREEN}Update complete!${NC}"
        ;;

    restart)
        echo -e "${YELLOW}Restarting services...${NC}"
        docker compose restart
        echo -e "${GREEN}Restart complete!${NC}"
        ;;

    stop)
        echo -e "${YELLOW}Stopping services...${NC}"
        docker compose down
        echo -e "${GREEN}Services stopped.${NC}"
        ;;

    logs)
        echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
        docker compose logs -f
        ;;

    status)
        echo -e "${YELLOW}Service status:${NC}"
        docker compose ps
        ;;

    clean)
        echo -e "${YELLOW}Cleaning up unused Docker resources...${NC}"
        docker system prune -f
        docker image prune -f
        echo -e "${GREEN}Cleanup complete!${NC}"
        ;;

    backup)
        echo -e "${YELLOW}Creating backup...${NC}"
        BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"

        # Backup Redis data
        docker compose exec redis redis-cli BGSAVE
        sleep 2
        docker cp competition-redis:/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb"

        # Backup environment
        cp .env.production "$BACKUP_DIR/.env.production"

        echo -e "${GREEN}Backup saved to: $BACKUP_DIR${NC}"
        ;;

    *)
        echo -e "${YELLOW}Usage: $0 {deploy|update|restart|stop|logs|status|clean|backup}${NC}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (build and start all services)"
        echo "  update   - Pull latest code and rebuild"
        echo "  restart  - Restart all services"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  status   - Show service status"
        echo "  clean    - Clean up unused Docker resources"
        echo "  backup   - Create backup of Redis data and config"
        exit 1
        ;;
esac

# Show status
echo ""
echo -e "${BLUE}Current service status:${NC}"
docker compose ps
