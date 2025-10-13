#!/bin/bash

# Claude Workflow System Initialization Script
# This script sets up organization files from templates

set -e  # Exit on error

echo "🤖 Claude Workflow System - Project Initialization"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project info
read -p "Project name (or press Enter to skip): " PROJECT_NAME
if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="[PROJECT_NAME]"
fi

CURRENT_DATE=$(date +%Y-%m-%d)

echo ""
echo "${BLUE}Initializing with:${NC}"
echo "  Project: $PROJECT_NAME"
echo "  Date: $CURRENT_DATE"
echo ""

# Check if templates directory exists
if [ ! -d ".claude/templates" ]; then
    echo "${YELLOW}Error: .claude/templates directory not found.${NC}"
    echo "Make sure you're running this from a project with Claude Workflow System installed."
    exit 1
fi

# Function to copy and customize template
copy_template() {
    local template_file=$1
    local target_file=$2
    local file_desc=$3

    if [ -f "$target_file" ]; then
        read -p "${YELLOW}$target_file already exists. Overwrite? (y/N):${NC} " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "  Skipping $file_desc"
            return
        fi
    fi

    echo "${GREEN}✓${NC} Creating $file_desc..."
    cp "$template_file" "$target_file"

    # Replace placeholders
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed syntax
        sed -i '' "s/\[PROJECT_NAME\]/$PROJECT_NAME/g" "$target_file"
        sed -i '' "s/\[CURRENT_DATE\]/$CURRENT_DATE/g" "$target_file"
    else
        # Linux sed syntax
        sed -i "s/\[PROJECT_NAME\]/$PROJECT_NAME/g" "$target_file"
        sed -i "s/\[CURRENT_DATE\]/$CURRENT_DATE/g" "$target_file"
    fi
}

echo "📋 Setting up root organization files..."
echo ""

# Copy root templates
copy_template ".claude/templates/TODO.template.md" "TODO.md" "TODO.md (active tasks)"
copy_template ".claude/templates/STATUS.template.md" "STATUS.md" "STATUS.md (project status)"
copy_template ".claude/templates/ROADMAP.template.md" "ROADMAP.md" "ROADMAP.md (strategic roadmap)"

echo ""
echo "📋 Organization files created!"
echo ""
echo "${GREEN}✅ Initialization complete!${NC}"
echo ""
echo "${BLUE}Next steps:${NC}"
echo "  1. Edit TODO.md with your current tasks"
echo "  2. Update STATUS.md with your project status"
echo "  3. Customize ROADMAP.md with your phases and goals"
echo "  4. Review CLAUDE.md for system documentation"
echo "  5. Start using commands like /workflow, /research, /build"
echo ""
echo "${BLUE}Quick Reference:${NC}"
echo "  • Templates: .claude/templates/"
echo "  • Commands: .claude/commands/"
echo "  • Documentation: CLAUDE.md"
echo "  • Active Tasks: TODO.md"
echo "  • Project Status: STATUS.md"
echo "  • Strategic Plan: ROADMAP.md"
echo ""
echo "💡 Tip: Run '.claude/init.sh' again anytime to reset from templates"
echo ""
