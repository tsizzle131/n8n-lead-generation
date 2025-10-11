#!/bin/bash

echo "============================================================================"
echo "PHASE 2.5 DATABASE FIX - Complete Guide"
echo "============================================================================"
echo ""
echo "📋 Issues Found:"
echo "  ❌ gmaps_linkedin_enrichments table missing"
echo "  ❌ linkedin_enriched column missing in gmaps_businesses"
echo ""
echo "🔧 Fix Steps:"
echo ""
echo "1. Opening Supabase SQL Editor in your browser..."
echo ""

# Open Supabase SQL Editor
open "https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo/sql"

sleep 2

echo "2. Copy the migration SQL:"
echo ""
echo "   File: migrations/phase_25_complete_migration.sql"
echo ""

# Show migration file location
pwd_path=$(pwd)
echo "   Full path: $pwd_path/migrations/phase_25_complete_migration.sql"
echo ""

# Copy migration to clipboard if pbcopy is available
if command -v pbcopy &> /dev/null; then
    cat migrations/phase_25_complete_migration.sql | pbcopy
    echo "   ✅ Migration SQL copied to clipboard!"
    echo ""
    echo "3. In the Supabase SQL Editor:"
    echo "   - Paste the SQL (Cmd+V)"
    echo "   - Click 'Run' button"
    echo ""
else
    echo "3. Manually copy the contents of:"
    echo "   migrations/phase_25_complete_migration.sql"
    echo ""
    echo "4. In the Supabase SQL Editor:"
    echo "   - Paste the SQL"
    echo "   - Click 'Run' button"
    echo ""
fi

echo "4. After migration completes, verify with:"
echo "   python3 verify_phase_25_schema.py"
echo ""
echo "============================================================================"
echo "📖 What the migration creates:"
echo "============================================================================"
echo "  ✅ gmaps_linkedin_enrichments table (full schema)"
echo "  ✅ linkedin_enriched column in gmaps_businesses"
echo "  ✅ Performance indexes on key columns"
echo "  ✅ Row Level Security (RLS) policies"
echo "  ✅ Auto-update triggers"
echo "  ✅ Documentation comments"
echo ""
echo "Once complete, Phase 2.5 will automatically run on all new campaigns!"
echo "============================================================================"
