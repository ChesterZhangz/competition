#!/bin/bash

# ============================================================
# Math Competition Platform - Server Deployment Script
# Domain: www.mareate.com
# ============================================================
#
# This script handles the complete deployment process:
# 1. Server initialization (Docker installation)
# 2. SSL certificate setup
# 3. Application deployment
#
# Usage:
#   ./run.sh                    # Interactive menu
#   ./run.sh setup              # First-time server setup
#   ./run.sh ssl                # Setup SSL certificates
#   ./run.sh deploy             # Deploy application
#   ./run.sh start              # Start all services
#   ./run.sh stop               # Stop all services
#   ./run.sh restart            # Restart all services
#   ./run.sh logs               # View logs
#   ./run.sh status             # Check service status
#   ./run.sh update             # Pull latest code and redeploy
#   ./run.sh backup             # Backup data
#   ./run.sh help               # Show this help
#
# ============================================================

set -e

# Configuration
DOMAIN="www.mareate.com"
EMAIL="admin@mareate.com"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          Math Competition Platform Deployment             ║"
    echo "║                  Domain: ${DOMAIN}                   ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print section header
print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Error: Please run as root (use sudo)${NC}"
        exit 1
    fi
}

# Change to project directory
cd_project() {
    cd "$PROJECT_DIR"
    echo -e "${GREEN}Working directory: $PROJECT_DIR${NC}"
}

# ============================================================
# Server Setup Functions
# ============================================================

install_docker() {
    print_section "Installing Docker"

    if command -v docker &> /dev/null; then
        echo -e "${GREEN}Docker is already installed.${NC}"
        docker --version
        return 0
    fi

    echo -e "${YELLOW}Installing Docker...${NC}"

    # Update package list
    apt-get update

    # Install prerequisites
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    # Set up the stable repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    echo -e "${GREEN}Docker installed successfully!${NC}"
    docker --version
}

install_dependencies() {
    print_section "Installing Dependencies"

    echo -e "${YELLOW}Updating system packages...${NC}"
    apt-get update && apt-get upgrade -y

    echo -e "${YELLOW}Installing required packages...${NC}"
    apt-get install -y \
        git \
        curl \
        wget \
        openssl \
        ufw

    echo -e "${GREEN}Dependencies installed successfully!${NC}"
}

setup_firewall() {
    print_section "Configuring Firewall"

    echo -e "${YELLOW}Setting up UFW firewall...${NC}"

    # Allow SSH
    ufw allow ssh

    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Enable firewall
    echo "y" | ufw enable

    echo -e "${GREEN}Firewall configured!${NC}"
    ufw status
}

server_setup() {
    check_root
    print_section "First-Time Server Setup"

    echo -e "${YELLOW}This will install Docker and configure the server.${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    install_dependencies
    install_docker
    setup_firewall

    echo -e "\n${GREEN}Server setup complete!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Point your domain DNS to this server's IP"
    echo -e "  2. Run: ./run.sh ssl"
    echo -e "  3. Run: ./run.sh deploy"
}

# ============================================================
# SSL Certificate Functions
# ============================================================

setup_ssl() {
    check_root
    cd_project
    print_section "SSL Certificate Setup"

    echo -e "${YELLOW}Setting up SSL certificate for ${DOMAIN}${NC}"

    # Create required directories
    mkdir -p ./certbot/conf
    mkdir -p ./certbot/www

    # Download recommended TLS parameters
    if [ ! -e "./certbot/conf/options-ssl-nginx.conf" ]; then
        echo -e "${YELLOW}Downloading TLS parameters...${NC}"
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > ./certbot/conf/options-ssl-nginx.conf
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > ./certbot/conf/ssl-dhparams.pem
    fi

    # Create temporary self-signed certificate
    echo -e "${YELLOW}Creating temporary certificate...${NC}"
    mkdir -p "./certbot/conf/live/${DOMAIN}"

    openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
        -keyout "./certbot/conf/live/${DOMAIN}/privkey.pem" \
        -out "./certbot/conf/live/${DOMAIN}/fullchain.pem" \
        -subj "/CN=${DOMAIN}" 2>/dev/null

    # Start nginx
    echo -e "${YELLOW}Starting nginx...${NC}"
    docker compose up -d nginx
    sleep 5

    # Remove temporary certificate
    rm -rf "./certbot/conf/live/${DOMAIN}"

    # Request real certificate
    echo -e "${YELLOW}Requesting Let's Encrypt certificate...${NC}"

    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}SSL certificate obtained successfully!${NC}"
        docker compose exec nginx nginx -s reload
        echo -e "${GREEN}Your site is now available at: https://${DOMAIN}${NC}"
    else
        echo -e "${RED}Failed to obtain certificate.${NC}"
        echo -e "${RED}Please ensure:${NC}"
        echo -e "${RED}  1. Domain DNS points to this server${NC}"
        echo -e "${RED}  2. Port 80 is accessible${NC}"
        exit 1
    fi
}

# ============================================================
# Deployment Functions
# ============================================================

check_env() {
    if [ ! -f ".env.production" ]; then
        echo -e "${RED}.env.production not found!${NC}"
        echo -e "${YELLOW}Please create .env.production with your settings.${NC}"
        echo -e "${YELLOW}See .env.example for reference.${NC}"
        exit 1
    fi
}

deploy() {
    check_root
    cd_project
    check_env
    print_section "Deploying Application"

    echo -e "${YELLOW}Building Docker images...${NC}"
    docker compose build --no-cache

    echo -e "${YELLOW}Starting services...${NC}"
    docker compose up -d

    echo -e "${GREEN}Deployment complete!${NC}"
    show_status
}

start_services() {
    check_root
    cd_project
    print_section "Starting Services"

    docker compose up -d
    echo -e "${GREEN}Services started!${NC}"
    show_status
}

stop_services() {
    check_root
    cd_project
    print_section "Stopping Services"

    docker compose down
    echo -e "${GREEN}Services stopped.${NC}"
}

restart_services() {
    check_root
    cd_project
    print_section "Restarting Services"

    docker compose restart
    echo -e "${GREEN}Services restarted!${NC}"
    show_status
}

update_services() {
    check_root
    cd_project
    print_section "Updating Application"

    if [ -d ".git" ]; then
        echo -e "${YELLOW}Pulling latest code...${NC}"
        git pull origin main || true
    fi

    echo -e "${YELLOW}Rebuilding and restarting...${NC}"
    docker compose build
    docker compose up -d

    echo -e "${GREEN}Update complete!${NC}"
    show_status
}

show_logs() {
    cd_project
    print_section "Service Logs"

    echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
    docker compose logs -f
}

show_status() {
    cd_project
    print_section "Service Status"

    docker compose ps

    echo -e "\n${CYAN}URLs:${NC}"
    echo -e "  Frontend: https://${DOMAIN}"
    echo -e "  API:      https://${DOMAIN}/api"
    echo -e "  Health:   https://${DOMAIN}/health"
}

backup_data() {
    check_root
    cd_project
    print_section "Backing Up Data"

    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    echo -e "${YELLOW}Creating Redis backup...${NC}"
    docker compose exec -T redis redis-cli BGSAVE
    sleep 2
    docker cp competition-redis:/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb" 2>/dev/null || echo "Redis backup skipped"

    echo -e "${YELLOW}Backing up configuration...${NC}"
    cp .env.production "$BACKUP_DIR/.env.production"

    echo -e "${GREEN}Backup saved to: $BACKUP_DIR${NC}"
}

clean_docker() {
    check_root
    print_section "Cleaning Docker Resources"

    echo -e "${YELLOW}Removing unused containers, images, and volumes...${NC}"
    docker system prune -f
    docker image prune -f

    echo -e "${GREEN}Cleanup complete!${NC}"
}

# ============================================================
# Help and Menu Functions
# ============================================================

show_help() {
    print_banner
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     First-time server setup (install Docker, configure firewall)"
    echo "  ssl       Setup SSL certificate with Let's Encrypt"
    echo "  deploy    Build and deploy the application"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  update    Pull latest code and redeploy"
    echo "  logs      View service logs"
    echo "  status    Show service status"
    echo "  backup    Backup Redis data and configuration"
    echo "  clean     Clean up unused Docker resources"
    echo "  help      Show this help message"
    echo ""
    echo "Quick Start (on a new server):"
    echo "  1. ./run.sh setup     # Install Docker and configure server"
    echo "  2. ./run.sh ssl       # Get SSL certificate"
    echo "  3. ./run.sh deploy    # Deploy the application"
}

interactive_menu() {
    print_banner
    echo "Select an option:"
    echo ""
    echo "  1) First-time server setup"
    echo "  2) Setup SSL certificate"
    echo "  3) Deploy application"
    echo "  4) Start services"
    echo "  5) Stop services"
    echo "  6) Restart services"
    echo "  7) Update (pull & redeploy)"
    echo "  8) View logs"
    echo "  9) Check status"
    echo "  10) Backup data"
    echo "  11) Clean Docker resources"
    echo "  0) Exit"
    echo ""
    read -p "Enter choice [0-11]: " choice

    case $choice in
        1) server_setup ;;
        2) setup_ssl ;;
        3) deploy ;;
        4) start_services ;;
        5) stop_services ;;
        6) restart_services ;;
        7) update_services ;;
        8) show_logs ;;
        9) show_status ;;
        10) backup_data ;;
        11) clean_docker ;;
        0) exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
}

# ============================================================
# Main Entry Point
# ============================================================

main() {
    ACTION=${1:-"menu"}

    case $ACTION in
        setup)    server_setup ;;
        ssl)      setup_ssl ;;
        deploy)   deploy ;;
        start)    start_services ;;
        stop)     stop_services ;;
        restart)  restart_services ;;
        update)   update_services ;;
        logs)     show_logs ;;
        status)   show_status ;;
        backup)   backup_data ;;
        clean)    clean_docker ;;
        help|-h|--help) show_help ;;
        menu)     interactive_menu ;;
        *)
            echo -e "${RED}Unknown command: $ACTION${NC}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
