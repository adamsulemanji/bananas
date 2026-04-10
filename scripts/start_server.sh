#!/bin/bash
set -e

cd /home/ec2-user/app

export NODE_ENV=production
# CORS origin in server.js — must match your domain
export PRODUCTION_URL=https://bananas.adamsulemanji.com

pm2 start server.js --name bananas
# Persist so PM2 restores the process after a reboot
pm2 save
