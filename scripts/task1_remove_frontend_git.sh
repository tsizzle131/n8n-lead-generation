#!/bin/bash
# Task 1: Remove frontend/.git directory
# Generated: 2025-10-11
# Risk: LOW - All safety checks passed

set -e  # Exit on error
cd "/Users/tristanwaite/n8n test"

echo "=== Task 1: Frontend .git Removal ==="
echo ""

# Step 1: Safety backup
echo "Step 1/6: Creating safety backup..."
git add frontend/ || true
git commit -m "Safety backup: Frontend files before .git removal" || echo "No changes to commit"
echo "✅ Step 1 complete"
echo ""

# Step 2: Remove .git
echo "Step 2/6: Removing frontend/.git..."
rm -rf frontend/.git
echo "✅ Step 2 complete"
echo ""

# Step 3: Fix submodule config
echo "Step 3/6: Cleaning submodule configuration..."
git config --remove-section submodule.frontend 2>/dev/null || echo "No submodule config found"
rm -rf .git/modules/frontend 2>/dev/null || echo "No modules directory"
git rm --cached frontend 2>/dev/null || echo "Not cached as submodule"
echo "✅ Step 3 complete"
echo ""

# Step 4: Stage frontend directory
echo "Step 4/6: Staging frontend as regular directory..."
git add frontend/
echo "✅ Step 4 complete"
echo ""

# Step 5: Commit
echo "Step 5/6: Committing changes..."
git commit -m "Convert frontend from broken submodule to regular directory

Removed frontend/.git (888KB) to eliminate duplicate git tracking.
Frontend now properly tracked by parent repository."
echo "✅ Step 5 complete"
echo ""

# Step 6: Verify
echo "Step 6/6: Verifying removal..."
if [ -d "frontend/.git" ]; then
    echo "❌ FAILED: frontend/.git still exists"
    exit 1
else
    echo "✅ frontend/.git removed successfully"
fi

git status | grep frontend && echo "✅ Frontend tracked by parent repo"
echo ""
echo "=== Task 1 Complete ==="
