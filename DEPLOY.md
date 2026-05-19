# Deployment Guide

## Overview

Both apps run on a single AWS Lightsail Ubuntu instance, managed by PM2 and served via nginx.

| App | Repo | Server Path | PM2 Name | Port |
|-----|------|-------------|----------|------|
| TradeFlow | `NathanDevEdge/tradeflow-v1` | `~/tradeflow` | `tradeflow` | 3001 |
| DevEdge Website | `NathanDevEdge/DevEdge-Official-Website` | `/var/www/devedge` | `devedge` | 3000 |

---

## Standard Deploy (after pushing to GitHub)

SSH into the server via the AWS Lightsail browser console, then run one of:

```bash
deploy-tradeflow   # update TradeFlow only
deploy-devedge     # update DevEdge website only
deploy-all         # update both apps
```

Each alias automatically:
1. Pulls latest code from `main`
2. Installs any new packages (`pnpm install`)
3. Rebuilds (`pnpm build`)
4. Restarts the PM2 process with updated env vars

---

## First-Time Setup on a New Server

### 1. Clone repos

```bash
# TradeFlow
cd ~
git clone https://github.com/NathanDevEdge/tradeflow-v1.git tradeflow

# DevEdge Website
cd /var/www
git clone https://github.com/NathanDevEdge/DevEdge-Official-Website.git devedge
```

### 2. Add .env files

```bash
# TradeFlow
nano ~/tradeflow/.env

# DevEdge Website
nano /var/www/devedge/.env
```

### 3. Install, build and start

```bash
# TradeFlow
cd ~/tradeflow && pnpm install && pnpm build
pm2 start deploy/ecosystem.config.cjs

# DevEdge Website
cd /var/www/devedge && pnpm install && pnpm build
pm2 start ecosystem.config.cjs
```

### 4. Save PM2 process list

```bash
pm2 save
pm2 startup  # follow the printed command to enable auto-start on reboot
```

### 5. Add deploy aliases

```bash
cat >> ~/.bashrc << 'EOF'

# Deploy aliases
alias deploy-tradeflow="cd ~/tradeflow && git pull && pnpm install && pnpm build && pm2 restart tradeflow --update-env"
alias deploy-devedge="cd /var/www/devedge && git pull && pnpm install && pnpm build && pm2 restart devedge --update-env"
alias deploy-all="deploy-tradeflow && deploy-devedge"
EOF
source ~/.bashrc
```

---

## Useful Commands

```bash
pm2 list                          # status of all apps
pm2 logs tradeflow --lines 50     # live TradeFlow logs
pm2 logs devedge --lines 50       # live DevEdge logs
pm2 restart tradeflow             # restart without rebuild
pm2 restart devedge

sudo nginx -t                     # test nginx config
sudo systemctl reload nginx       # reload nginx (no downtime)
sudo systemctl restart nginx      # full restart

pnpm build                        # rebuild current directory
```

---

## Adding a New App

1. Clone the repo to `/var/www/<appname>` or `~/<appname>`
2. Create a `.env` file
3. Add an `ecosystem.config.cjs` with a unique `name` and `PORT`
4. Run `pnpm install && pnpm build && pm2 start ecosystem.config.cjs && pm2 save`
5. Add a new nginx `location` block or `server` block pointing to the new port
6. Add a deploy alias to `~/.bashrc`
