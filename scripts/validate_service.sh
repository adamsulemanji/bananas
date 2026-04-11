#!/bin/bash
# Retry for up to ~55 seconds so Next.js has time to finish preparing on a small instance.
# ValidateService timeout in appspec.yml is 60s — this stays comfortably inside it.
for i in 1 2 3 4 5 6 7; do
  sleep 7
  if curl -sf --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
    echo "Server is up (attempt $i)"
    exit 0
  fi
  echo "Attempt $i: server not ready yet"
done

echo "Server did not respond after all attempts"
exit 1
