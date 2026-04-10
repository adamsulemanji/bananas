#!/bin/bash
# Wait for the server to finish starting, then check it responds.
sleep 5
curl -sf http://localhost:3000 > /dev/null
