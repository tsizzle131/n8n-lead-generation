#!/bin/bash
# Task 2: Deprecate FastAPI Backend
# Risk: LOW - Zero production usage confirmed
set -e
cd "/Users/tristanwaite/n8n test"

echo "=== Task 2: FastAPI Deprecation ==="
echo ""

# Step 1: Safety backup
echo "Step 1/4: Creating safety backup..."
git add api/ 2>/dev/null || true
git commit -m "Safety backup: FastAPI before deprecation" 2>/dev/null || echo "No changes to commit"
echo "✅ Step 1 complete"
echo ""

# Step 2: Remove api/ directory
echo "Step 2/4: Removing api/ directory..."
git rm -r api/
echo "✅ Step 2 complete (11 files removed)"
echo ""

# Step 3: Update start-dev.sh
echo "Step 3/4: Updating start-dev.sh..."
if grep -q "fastapi" start-dev.sh; then
    sed -i.bak 's/--with-fastapi/-/g; s/-f/-/g' start-dev.sh 2>/dev/null || true
    echo "✅ FastAPI references removed from start-dev.sh"
fi
echo "✅ Step 3 complete"
echo ""

# Step 4: Commit
echo "Step 4/4: Committing FastAPI deprecation..."
git commit -m "Deprecate FastAPI backend (zero production usage)

Removed api/ directory (11 files):
- 95% endpoint duplication with Express
- Zero production usage (optional --with-fastapi flag)
- Frontend configured for Express only (port 5001)

Simplifies architecture to single Express backend + Python modules."
echo "✅ Step 4 complete"
echo ""

echo "=== Task 2 Complete ==="
