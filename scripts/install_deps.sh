#!/bin/bash
set -e

# Add swap if not already present — t4g.nano has only 512MB RAM, npm ci OOMs without it
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi

cd /home/ec2-user/app

# Deploy nginx config and reload
cp nginx.conf /etc/nginx/conf.d/bananas.conf
nginx -t
systemctl reload nginx

# Install only production dependencies (node_modules excluded from artifact)
npm ci --omit=dev

# Ensure ec2-user owns everything
chown -R ec2-user:ec2-user /home/ec2-user/app
