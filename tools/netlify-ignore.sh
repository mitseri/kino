#!/bin/bash
# Netlify "ignore" step: exit 0 = SKIP this deploy, exit 1 = deploy.
# Waits for the GitHub "smoke" test of this commit; a failed test keeps the broken version off the site.
REF="${COMMIT_REF}"
[ -z "$REF" ] && exit 1
for i in $(seq 1 40); do
  J=$(curl -s "https://api.github.com/repos/mitseri/kino/commits/$REF/check-runs?check_name=smoke")
  ST=$(echo "$J" | grep -o '"status": *"[a-z_]*"' | head -1 | sed 's/.*"\([a-z_]*\)"$/\1/')
  CO=$(echo "$J" | grep -o '"conclusion": *"[a-z_]*"' | head -1 | sed 's/.*"\([a-z_]*\)"$/\1/')
  if [ "$ST" = "completed" ]; then
    if [ "$CO" = "success" ]; then echo "smoke passed — deploying"; exit 1; fi
    echo "smoke $CO — deploy skipped, the site keeps the previous version"; exit 0
  fi
  sleep 15
done
echo "smoke result not found in time — deploying anyway"; exit 1
