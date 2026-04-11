#!/bin/bash
set -e

# Ensure swap is active. Check whether it's mounted, not just whether the file exists.
# After a reboot the file persists but swapon is not re-run unless it's in /etc/fstab.
if ! swapon --show | grep -q /swapfile; then
  if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
fi

# Persist swap across reboots (idempotent)
grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

cd /home/ec2-user/app

# Deploy nginx config and reload
cp nginx.conf /etc/nginx/conf.d/bananas.conf
nginx -t
systemctl reload nginx

# Install only production dependencies (node_modules excluded from artifact)
npm ci --omit=dev

# Ensure ec2-user owns everything
chown -R ec2-user:ec2-user /home/ec2-user/app
