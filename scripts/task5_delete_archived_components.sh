#!/bin/bash
# Task 5: Delete Frontend Archived Components
set -e
cd "/Users/tristanwaite/n8n test"

echo "=== Task 5: Delete Archived Components ==="
echo ""

# Step 1: Safety backup
echo "Step 1/3: Creating safety backup..."
git add frontend/src/components/archived/ || true
git commit -m "Safety backup: Archived components before deletion" || echo "No changes"
echo "✅ Step 1 complete"
echo ""

# Step 2: Delete archived directory
echo "Step 2/3: Deleting frontend/src/components/archived/..."
git rm -r frontend/src/components/archived/
echo "✅ Step 2 complete (5 files removed)"
echo ""

# Step 3: Commit deletion
echo "Step 3/3: Committing deletion..."
git commit -m "Remove unused Apollo frontend components (1,568 lines)

Deleted frontend/src/components/archived/ (5 files):
- AudienceManager.tsx (433 lines)
- ContactTester.tsx (291 lines)
- Database.tsx (245 lines)
- PromptEditor.tsx (223 lines)
- Run.tsx (376 lines)

All verified completely unused (zero imports found).
All Apollo system components replaced by Google Maps system."
echo "✅ Step 3 complete"
echo ""

echo "=== Task 5 Complete ==="
