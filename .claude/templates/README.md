# Organization Templates

This directory contains template files for initializing Claude Workflow System tracking in your project.

---

## Quick Start

### Option 1: Manual Initialization
```bash
# From your project root:
cp .claude/templates/TODO.template.md ./TODO.md
cp .claude/templates/STATUS.template.md ./STATUS.md
cp .claude/templates/ROADMAP.template.md ./ROADMAP.md

# Then customize the files for your project
```

### Option 2: Automated Initialization
```bash
# Run the init script:
bash .claude/init.sh

# This will:
# - Copy templates to root
# - Replace placeholders with your project info
# - Create symbolic links for documentation
```

---

## Template Files

### Root Level Templates

#### `TODO.template.md`
**Purpose:** Daily active task tracking
**Location:** Copy to `./TODO.md`
**Update Frequency:** Daily
**Contains:**
- Active tasks in progress
- Up next queue
- Blocked items
- Recently completed tasks

#### `STATUS.template.md`
**Purpose:** Overall project status and metrics
**Location:** Copy to `./STATUS.md`
**Update Frequency:** Weekly or after major milestones
**Contains:**
- Command status matrix
- Testing coverage metrics
- Documentation coverage
- Integration status
- Quality metrics

#### `ROADMAP.template.md`
**Purpose:** Strategic planning and phases
**Location:** Copy to `./ROADMAP.md`
**Update Frequency:** Monthly or per phase
**Contains:**
- Phase-based development plan
- Timeline and milestones
- Success metrics
- Risk assessment

### Command-Level Templates

#### `commands-TODO.template.md`
**Purpose:** Command development task tracking
**Location:** Copy to `.claude/commands/TODO.md` (or keep in templates)
**Update Frequency:** As commands are built/tested
**Contains:**
- Commands to build (with priorities)
- Testing queue
- Integration tasks
- Documentation tasks

#### `commands-STATUS.template.md`
**Purpose:** Detailed command status matrix
**Location:** Copy to `.claude/commands/STATUS.md` (or keep in templates)
**Update Frequency:** After each command is built/modified
**Contains:**
- Detailed command specifications
- Technical details (lines, waves, agents, gates)
- Validation criteria
- Quality metrics

#### `commands-REGISTRY.template.md`
**Purpose:** Command metadata catalog
**Location:** Copy to `.claude/commands/REGISTRY.md` (or keep in templates)
**Update Frequency:** When commands are added/updated
**Contains:**
- Command metadata (purpose, usage, integration points)
- Command dependencies
- Usage patterns and examples

---

## File Organization Philosophy

### Static (Never Change) - Keep in `.claude/`
- **commands/** - Command definitions (workflow.md, migrate.md, etc.)
- **templates/** - Template files (this directory)
- **docs/** - System documentation
- **examples/** - Reference implementations

### Dynamic (Change Per Project) - Copy to Root
- **TODO.md** - Active work tracking
- **STATUS.md** - Current project status
- **ROADMAP.md** - Strategic planning

### Hybrid (Optional) - You Choose
- **CLAUDE.md** - Can be a copy, symlink, or in `.claude/docs/`
- **commands tracking** - Can be in `.claude/commands/` or root

---

## Customization Guide

### Placeholders to Replace

When you copy templates to your project, replace these placeholders:

- `[PROJECT_NAME]` - Your project name
- `[CURRENT_DATE]` - Today's date (YYYY-MM-DD)
- `[YOUR_NAME]` - Your name or team name
- `[PHASE]` - Current development phase
- `[N/M]` - Progress ratios (e.g., 3/10 commands built)

### Adding Custom Sections

Feel free to add project-specific sections:
- **TODO.md:** Add custom task categories
- **STATUS.md:** Add project-specific metrics
- **ROADMAP.md:** Add domain-specific phases

---

## Best Practices

### Daily Workflow
1. **Morning:** Review TODO.md, check what's in progress
2. **During work:** Mark tasks as completed as you finish
3. **End of day:** Add new tasks discovered, update blockers

### Weekly Workflow
1. **Review STATUS.md:** Update metrics and command status
2. **Review TODO.md:** Move completed to archive, promote "up next"
3. **Plan next week:** Adjust priorities based on progress

### Monthly Workflow
1. **Review ROADMAP.md:** Assess phase progress
2. **Update timelines:** Adjust based on actual velocity
3. **Plan next phase:** Define milestones and success criteria

---

## Multi-Project Usage

If you work on multiple projects using this workflow system:

### Shared Package Structure
```
~/workflow-system/        # Master package (version controlled)
  .claude/
    commands/            # All command definitions
    templates/           # Templates
    docs/                # Documentation

~/project-a/             # Project A
  .claude/               # Symlink to ~/workflow-system/.claude
  TODO.md                # Project A's active tasks
  STATUS.md              # Project A's status
  ROADMAP.md             # Project A's roadmap

~/project-b/             # Project B
  .claude/               # Symlink to ~/workflow-system/.claude
  TODO.md                # Project B's active tasks
  STATUS.md              # Project B's status
  ROADMAP.md             # Project B's roadmap
```

### Benefits:
- ✅ One set of commands, multiple projects
- ✅ Commands update once, apply everywhere
- ✅ Project-specific tracking stays separate
- ✅ Easy to maintain and version control

---

## Version Control Recommendations

### Always Commit (Part of Package)
```gitignore
# These are part of the workflow system package
.claude/commands/
.claude/templates/
.claude/docs/
.claude/settings.local.json
```

### Usually Commit (Shared Team Tracking)
```gitignore
# Commit if team uses shared tracking
TODO.md
STATUS.md
ROADMAP.md
.claude/commands/TODO.md
.claude/commands/STATUS.md
```

### Usually Ignore (Personal Tracking)
```gitignore
# Add to .gitignore if tracking is personal
TODO.md
STATUS.md
ROADMAP.md

# Or use .local suffix for personal versions
TODO.local.md
STATUS.local.md
ROADMAP.local.md
```

---

## Migration from Old Structure

If you already have TODO/STATUS/ROADMAP in your project root:

### Keep Them (Recommended)
Your existing files are already project-specific and working. No migration needed!

### Convert to Template-Based
1. Back up your current files
2. Copy templates to root
3. Merge your content into the new structure
4. Archive old files

---

## Template Updates

When the workflow system package is updated:

### Command Updates
- ✅ Automatic (commands are in `.claude/commands/`)
- Just pull the latest package

### Template Updates
- ⚠️ Manual (your TODO/STATUS/ROADMAP are customized)
- Review `.claude/templates/` for new sections
- Merge useful changes into your project files

---

## Getting Help

- **System Documentation:** `.claude/docs/USAGE.md`
- **Examples:** `.claude/examples/`
- **Command Reference:** `CLAUDE.md` or `.claude/docs/USAGE.md`

---

**Last Updated:** 2025-10-12
**Template Version:** 1.0
