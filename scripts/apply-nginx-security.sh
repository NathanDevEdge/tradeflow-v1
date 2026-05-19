#!/usr/bin/env bash
# Run this ON THE SERVER as root (or with sudo) to apply nginx security headers.
# Usage: sudo bash scripts/apply-nginx-security.sh

set -euo pipefail

NGINX_CONF="/etc/nginx/sites-enabled/tradeflow"
BACKUP="${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"

echo "→ Backing up existing config to $BACKUP"
cp "$NGINX_CONF" "$BACKUP"

echo "→ Patching nginx config…"

# Add security headers after the ssl_dhparam line (which is always present after certbot)
# Use perl for multi-line sed-style replacement (available on Ubuntu)
perl -i -0pe '
  # Add security headers block after ssl_dhparam line if not already present
  unless (/Strict-Transport-Security/) {
    s/(ssl_dhparam[^\n]*\n)/$1\n    # Security headers\n    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;\n    add_header X-Frame-Options           "SAMEORIGIN"                                   always;\n    add_header X-Content-Type-Options    "nosniff"                                      always;\n    add_header Referrer-Policy           "strict-origin-when-cross-origin"              always;\n    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()"     always;\n/;
  }
' "$NGINX_CONF"

# Disable server_tokens (hide nginx version)
if ! grep -q "server_tokens off" "$NGINX_CONF"; then
  perl -i -0pe 's/(ssl_dhparam[^\n]*\n)/$1    server_tokens off;\n/' "$NGINX_CONF"
fi

# Ensure X-Forwarded-Proto header is forwarded (needed for trust proxy)
if ! grep -q "X-Forwarded-Proto" "$NGINX_CONF"; then
  perl -i -0pe 's/(proxy_set_header\s+X-Forwarded-For[^\n]*\n)/$1        proxy_set_header   X-Forwarded-Proto \$scheme;\n/' "$NGINX_CONF"
fi

echo "→ Testing nginx config…"
nginx -t

echo "→ Reloading nginx…"
systemctl reload nginx

echo "✓ Done. Security headers applied."
echo "  Verify with: curl -I https://tradeflow.devedge.com.au"
