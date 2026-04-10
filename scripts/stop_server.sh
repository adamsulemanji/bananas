#!/bin/bash
# Stop the running app before deploying new code.
# Failures here are fine — first deploy won't have anything running.
su - ec2-user -c "pm2 stop bananas" 2>/dev/null || true
su - ec2-user -c "pm2 delete bananas" 2>/dev/null || true
exit 0
