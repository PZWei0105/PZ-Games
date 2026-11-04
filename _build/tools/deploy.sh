#!/bin/bash
# Push the built site in /home/claude/pz-games to GitHub in size-limited commits:
# games first (so every shell version only points at games that are already up), then media, then the shell.
set -e
REPO=${REPO:-/home/claude/pz-games}
# attribution lines appended to every commit message (set MSG_TAIL to the current session's lines)
MSG_TAIL=${MSG_TAIL-$'\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_018zoa3VfF3vwAG6nb16azfH'}
cd "$REPO"

push() {
  for i in 1 2 3 4; do
    if timeout 900 git push origin main < /dev/null; then return 0; fi
    echo "push failed (try $i), retrying…"; sleep $((i * 5))
  done
  return 1
}
commit() { # $1 = message ; staged changes only
  if git diff --cached --quiet; then echo "nothing to commit for: $1"; return 1; fi
  git commit -q -m "$1$MSG_TAIL"
}

python3 - "$REPO" > /tmp/pz_batches.txt <<'EOF'
import os, sys
root = os.path.join(sys.argv[1], 'games')
items = []
for d in sorted(os.listdir(root)):
    p = os.path.join(root, d)
    items.append((sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(p) for f in fs), d))
out, batch, size = [], [], 0
for sz, d in items:
    if batch and size + sz > 24e6:
        out.append(batch); batch, size = [], 0
    batch.append(d); size += sz
if batch:
    out.append(batch)
for b in out:
    print(' '.join('games/' + d for d in b))
EOF

n=0
while read -r line; do
  n=$((n + 1))
  git add -A $line
  if commit "Add game builds (batch $n)"; then push; fi
done < /tmp/pz_batches.txt

git add -A media
if commit "Add screenshots, covers and key art"; then push; fi

git add -A .
if commit "${1:-Update PZ 遊戲收藏}"; then push; fi
git log --oneline | head -5
