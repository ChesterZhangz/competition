#!/bin/bash

# ============================================
# Competition + Calender 首次安装脚本
# 在全新服务器上运行此脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
REPO_URL="git@github.com:ChesterZhangz/competition.git"
DEPLOY_DIR="/opt/competition"
DOMAINS=("www.mareate.com" "schedule.mareate.com")
EMAIL="${CERT_EMAIL:-admin@mareate.com}"  # 可通过环境变量覆盖

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Competition + Calender 首次安装${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}请使用 root 用户运行此脚本${NC}"
        echo "使用: sudo bash setup.sh"
        exit 1
    fi
}

# 检查并安装依赖
install_dependencies() {
    echo -e "${YELLOW}[1/7] 检查并安装依赖...${NC}"

    # 更新包列表
    apt-get update -qq

    # 安装 Docker
    if ! command -v docker &> /dev/null; then
        echo "安装 Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    fi
    echo -e "${GREEN}✓ Docker $(docker --version | cut -d' ' -f3)${NC}"

    # 安装 Docker Compose (plugin)
    if ! docker compose version &> /dev/null; then
        echo "安装 Docker Compose..."
        apt-get install -y docker-compose-plugin
    fi
    echo -e "${GREEN}✓ Docker Compose $(docker compose version --short)${NC}"

    # 安装 Git
    if ! command -v git &> /dev/null; then
        apt-get install -y git
    fi
    echo -e "${GREEN}✓ Git $(git --version | cut -d' ' -f3)${NC}"

    # 安装 dnsutils (for dig command)
    if ! command -v dig &> /dev/null; then
        apt-get install -y dnsutils
    fi
}

# 克隆代码
clone_repo() {
    echo ""
    echo -e "${YELLOW}[2/7] 克隆代码仓库...${NC}"

    if [ -d "$DEPLOY_DIR" ]; then
        echo "目录已存在，更新代码..."
        cd "$DEPLOY_DIR"
        git fetch origin
        git reset --hard origin/main
    else
        echo "克隆仓库到 $DEPLOY_DIR..."
        git clone "$REPO_URL" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
    fi

    echo -e "${GREEN}✓ 代码已就绪${NC}"
}

# 检查 DNS 配置
check_dns() {
    echo ""
    echo -e "${YELLOW}[3/7] 检查 DNS 配置...${NC}"

    SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me || curl -s --connect-timeout 5 icanhazip.com)
    echo "服务器公网 IP: $SERVER_IP"
    echo ""

    DNS_OK=true
    for domain in "${DOMAINS[@]}"; do
        DOMAIN_IP=$(dig +short "$domain" 2>/dev/null | head -1)
        if [ "$DOMAIN_IP" == "$SERVER_IP" ]; then
            echo -e "${GREEN}✓ $domain -> $DOMAIN_IP${NC}"
        elif [ -z "$DOMAIN_IP" ]; then
            echo -e "${RED}✗ $domain 未配置 DNS 记录${NC}"
            DNS_OK=false
        else
            echo -e "${RED}✗ $domain -> $DOMAIN_IP (应该是 $SERVER_IP)${NC}"
            DNS_OK=false
        fi
    done

    if [ "$DNS_OK" != "true" ]; then
        echo ""
        echo -e "${YELLOW}请在域名管理面板添加以下 A 记录:${NC}"
        for domain in "${DOMAINS[@]}"; do
            echo "  $domain  ->  $SERVER_IP"
        done
        echo ""
        read -p "DNS 已配置好? 按 Enter 继续，或 Ctrl+C 退出..."
    fi
}

# 配置环境变量
setup_env() {
    echo ""
    echo -e "${YELLOW}[4/7] 配置环境变量...${NC}"

    cd "$DEPLOY_DIR"

    if [ ! -f ".env.production" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.production
            echo -e "${YELLOW}已创建 .env.production，请编辑配置:${NC}"
            echo "  nano $DEPLOY_DIR/.env.production"
            echo ""
            echo "主要需要配置:"
            echo "  - MONGODB_URI (MongoDB 连接字符串)"
            echo "  - JWT_SECRET (随机密钥)"
            echo "  - 其他 API 密钥..."
            echo ""
            read -p "配置完成后按 Enter 继续..."
        else
            echo -e "${RED}未找到 .env.example 文件${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}✓ 环境变量已配置${NC}"
}

# 获取 SSL 证书
setup_ssl() {
    echo ""
    echo -e "${YELLOW}[5/7] 获取 SSL 证书...${NC}"

    cd "$DEPLOY_DIR"

    # 创建目录
    mkdir -p certbot/conf certbot/www

    for domain in "${DOMAINS[@]}"; do
        if [ -f "certbot/conf/live/$domain/fullchain.pem" ]; then
            echo -e "${GREEN}✓ $domain 证书已存在${NC}"
            continue
        fi

        echo "获取 $domain 的 SSL 证书..."

        # 创建临时 HTTP-only nginx 配置
        cat > nginx/conf.d/temp-http.conf << EOF
server {
    listen 80;
    server_name $domain;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Certbot verification';
        add_header Content-Type text/plain;
    }
}
EOF

        # 确保只运行 nginx
        docker compose up -d nginx
        sleep 5

        # 获取证书
        docker compose run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            -d "$domain" \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            --non-interactive

        # 删除临时配置
        rm -f nginx/conf.d/temp-http.conf

        # 停止 nginx
        docker compose down

        echo -e "${GREEN}✓ $domain SSL 证书获取成功${NC}"
    done
}

# 构建镜像
build_images() {
    echo ""
    echo -e "${YELLOW}[6/7] 构建 Docker 镜像...${NC}"

    cd "$DEPLOY_DIR"

    docker compose build --no-cache

    echo -e "${GREEN}✓ 镜像构建完成${NC}"
}

# 启动服务
start_services() {
    echo ""
    echo -e "${YELLOW}[7/7] 启动服务...${NC}"

    cd "$DEPLOY_DIR"

    docker compose up -d

    sleep 5

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}       安装完成！${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "访问地址:"
    echo -e "  ${BLUE}https://www.mareate.com${NC}       - Competition 比赛系统"
    echo -e "  ${BLUE}https://schedule.mareate.com${NC}  - 课程日历"
    echo ""
    echo -e "服务状态:"
    docker compose ps
    echo ""
    echo -e "常用命令:"
    echo "  cd $DEPLOY_DIR"
    echo "  ./scripts/deploy.sh logs     # 查看日志"
    echo "  ./scripts/deploy.sh status   # 查看状态"
    echo "  ./scripts/deploy.sh update   # 更新部署"
    echo "  ./scripts/deploy.sh restart  # 重启服务"
}

# 主函数
main() {
    check_root
    install_dependencies
    clone_repo
    check_dns
    setup_env
    setup_ssl
    build_images
    start_services
}

# 运行
main
