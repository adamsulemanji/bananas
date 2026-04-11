#!/bin/bash
# Stop the running app before deploying new code.
# Failures here are fine — first deploy won't have anything running.
su - ec2-user -c "pm2 stop bananas" 2>/dev/null || true
su - ec2-user -c "pm2 delete bananas" 2>/dev/null || true

# Wipe the old app directory so CodeDeploy installs into a clean slate.
# node_modules left over from a previous `npm ci` run causes "file already
# exists" conflicts on the next deployment even with overwrite: true, because
# CodeDeploy only overwrites files it placed — not files installed by hooks.
rm -rf /home/ec2-user/app
mkdir -p /home/ec2-user/app
chown ec2-user:ec2-user /home/ec2-user/app

exit 0
