# Organization File Integration Guide

**Purpose:** Commands automatically read from and update TODO.md, STATUS.md, and ROADMAP.md to maintain organized, self-documenting workflows.

---

## 🎯 Integration Philosophy

**Self-Organizing System:**
- Commands understand project context from organization files
- Commands automatically update tracking as work progresses
- No manual status updates needed
- Complete audit trail of all work

**Three-Phase Integration:**
1. **Pre-Execution:** Read context from organization files
2. **During Execution:** Track progress and update in real-time
3. **Post-Execution:** Update all tracking files with results

---

## 📋 File Responsibilities

### TODO.md - Active Work Tracking
**Read By Commands:**
- Understand what tasks are active
- Identify related work items
- Understand blockers and dependencies

**Updated By Commands:**
- Mark tasks as in_progress when starting
- Mark tasks as completed when done
- Add newly discovered tasks
- Update blockers and next steps

### STATUS.md - Project Status
**Read By Commands:**
- Understand project health
- Check command availability
- Review testing coverage
- Assess integration status

**Updated By Commands:**
- Update command status (built, tested, integrated)
- Record validation scores
- Update test coverage metrics
- Track quality metrics

### ROADMAP.md - Strategic Planning
**Read By Commands:**
- Align work with current phase
- Understand phase goals
- Check success criteria
- Review dependencies

**Updated By Commands:**
- Update phase progress
- Mark objectives as complete
- Update timelines based on actual progress
- Add new phases or objectives discovered

---

## 🔄 Integration Patterns by Command Type

### Research Commands (/research)

**Pre-Execution:**
```markdown
1. Read TODO.md to understand research topic context
2. Check if topic appears in active tasks or blockers
3. Read ROADMAP.md to align research with current phase goals
```

**During Execution:**
```markdown
1. Mark TODO item as in_progress if exists
2. Add to STATUS.md: "Research in progress for [topic]"
```

**Post-Execution:**
```markdown
1. Mark TODO item as completed
2. Update STATUS.md with research findings count
3. Add new TODO items based on research plan
4. Add research output to ROADMAP.md if strategic
```

**Example Integration Block:**
```markdown
## Pre-Research Context Check

**Step 1: Read TODO.md**
Search TODO.md for mentions of [RESEARCH_TOPIC].
- If found: Mark as in_progress
- If not found: Add new item "[RESEARCH_TOPIC] research"

**Step 2: Read ROADMAP.md**
Identify current phase and align research goals.
- Current Phase: [extract from ROADMAP.md]
- Research aligns with: [phase objective]

**Step 3: Update STATUS.md**
Add research tracking:
- Status: Research in progress for [topic]
- Started: [timestamp]
```

---

### Implementation Commands (/build, /migrate)

**Pre-Execution:**
```markdown
1. Read TODO.md for implementation task details
2. Read STATUS.md for related command status
3. Read ROADMAP.md to verify task is in current phase
4. Check for blockers in TODO.md
```

**During Execution:**
```markdown
1. Update TODO.md: Mark task as in_progress
2. Update STATUS.md: Add "Building [feature]" status
3. Track validation scores in STATUS.md
```

**Post-Execution:**
```markdown
1. Update TODO.md: Mark completed, add follow-up tasks
2. Update STATUS.md: Record validation scores, test results
3. Update ROADMAP.md: Mark objectives complete if applicable
4. Add integration tasks to TODO.md if needed
```

---

### Quality Commands (/testgen, /refactor, /optimize)

**Pre-Execution:**
```markdown
1. Read STATUS.md for current test coverage/quality metrics
2. Read TODO.md for quality-related tasks
3. Read ROADMAP.md for quality goals
```

**During Execution:**
```markdown
1. Track baseline metrics from STATUS.md
2. Update TODO.md with in_progress status
```

**Post-Execution:**
```markdown
1. Update STATUS.md with new metrics (coverage %, code smells reduced)
2. Mark TODO.md tasks as completed
3. Add new quality tasks discovered
4. Update ROADMAP.md quality metrics if phase goals reached
```

---

### Documentation Commands (/document, /explain)

**Pre-Execution:**
```markdown
1. Read STATUS.md for documentation coverage gaps
2. Read TODO.md for doc-related tasks
3. Read ROADMAP.md for documentation goals
```

**Post-Execution:**
```markdown
1. Update STATUS.md documentation coverage
2. Mark TODO.md tasks as completed
3. Update ROADMAP.md if documentation phase complete
```

---

### Meta-Command (/workflow)

**Pre-Execution:**
```markdown
1. Read TODO.md to understand full task context
2. Read STATUS.md to check command availability
3. Read ROADMAP.md to align task with phase goals
4. Classify task based on organization file context
```

**During Execution:**
```markdown
1. Update TODO.md with sub-tasks for each wave
2. Update STATUS.md as each command executes
3. Track validation scores across all commands
```

**Post-Execution:**
```markdown
1. Comprehensive TODO.md update with all results
2. Update STATUS.md with:
   - All validation scores
   - Commands executed
   - Success rates
   - New tasks discovered
3. Update ROADMAP.md progress if phase milestones reached
4. Generate summary referencing all three files
```

---

## 📝 Standard Integration Blocks

### Block 1: Pre-Execution Context Reading

Add this to Wave 0 of every command:

```markdown
## Wave 0: Context & Organization Check

**Step 0.1: Read Organization Files**

Launch a general-purpose agent to read and analyze organization files:

**Agent Task:** "Read and analyze project organization files to understand context for this task."

Read the following files if they exist:
- `TODO.md` - Identify active tasks related to [COMMAND_CONTEXT]
- `STATUS.md` - Check project status, command availability, metrics
- `ROADMAP.md` - Identify current phase and relevant goals

Extract and report:
1. **Active Tasks:** Any TODO items related to this command
2. **Project Phase:** Current phase from ROADMAP.md
3. **Current Metrics:** Relevant baseline metrics from STATUS.md
4. **Blockers:** Any blockers that may affect this command
5. **Success Criteria:** Phase goals this command contributes to

**Output:** Context Summary for command execution
```

---

### Block 2: During-Execution Tracking

Add this after Wave 0:

```markdown
## Wave 0.5: Update Tracking Files (In Progress)

**Step 0.5.1: Update TODO.md**

If TODO item exists for this task:
- Change status from `[ ]` to `[▶]` (in progress indicator)
- Add timestamp: "Started: [current time]"
- Add sub-items for each wave if multi-wave command

If TODO item doesn't exist:
- Create new item: `[▶] [Command purpose] (Started: [timestamp])`

**Step 0.5.2: Update STATUS.md**

Add entry to "Current Work" section:
```
## 🔄 Current Work (Auto-updated)

**[Command Name]** - [Status]
- Started: [timestamp]
- Wave: [current wave]
- Progress: [X/Y waves complete]
```

---

### Block 3: Post-Execution Updates

Add this as final wave:

```markdown
## Wave [FINAL]: Update Organization Files

**Step [FINAL].1: Update TODO.md**

Mark task as completed:
- Change `[▶]` to `[x]`
- Add completion timestamp
- Move to "Completed Recently" section
- Add any new tasks discovered during execution

**Step [FINAL].2: Update STATUS.md**

Update relevant sections:

**For Research Commands:**
```markdown
## 🔬 Research Completed
- [Topic]: [Findings summary]
  - Files analyzed: X
  - Plan generated: [path]
  - Validation score: Y/100
```

**For Implementation Commands:**
```markdown
## 🔨 Recent Implementations
- [Feature/Fix]: [Description]
  - Files modified: X
  - Tests added: Y
  - Validation score: Z/100
  - Coverage: W%
```

**For Quality Commands:**
```markdown
## ✅ Quality Improvements
- [Command]: [Target]
  - Baseline: [before metrics]
  - Improved: [after metrics]
  - Validation score: X/100
```

**Step [FINAL].3: Update ROADMAP.md**

Check if command completion affects phase progress:
- If phase objective completed: Mark `[x]`
- If phase percentage changed: Update progress
- If new objectives discovered: Add to backlog

**Step [FINAL].4: Generate Summary Report**

Create summary that references all three files:

```markdown
## Execution Summary

**Task:** [Command purpose]
**Started:** [timestamp]
**Completed:** [timestamp]
**Duration:** [time]

**Context (from TODO.md):**
- Related to: [TODO item]
- Priority: [priority level]

**Results (updated in STATUS.md):**
- Validation Score: X/100
- Quality Metrics: [metrics]
- Files Modified: Y

**Strategic Impact (ROADMAP.md):**
- Phase: [current phase]
- Objectives completed: [list]
- Progress: [X%] → [Y%]

**Next Steps (added to TODO.md):**
1. [New task 1]
2. [New task 2]
```
```

---

## 🔧 Implementation Guide

### Adding Integration to Existing Commands

1. **Add Wave 0: Context Check**
   - Insert before Wave 1
   - Read organization files
   - Extract relevant context

2. **Add Wave 0.5: Start Tracking**
   - Mark TODO items as in progress
   - Add to STATUS.md current work

3. **Add Final Wave: Update Tracking**
   - Update TODO.md with completion
   - Update STATUS.md with results
   - Update ROADMAP.md with progress
   - Generate integrated summary

### Example: Enhanced /research Command

```markdown
# /research - Multi-Domain Research (with Organization Integration)

## Wave 0: Context & Organization Check
[Context reading block as shown above]

## Wave 0.5: Update Tracking - Research Started
[Tracking update block as shown above]

## Wave 1: Parallel Research
[Existing research wave content]

## Wave 2: Synthesis
[Existing synthesis content]

## Wave 3: Planning
[Existing planning content]

## Wave 4: Validation
[Existing validation content]

## Wave 5: Update Organization Files & Report
[Post-execution update block as shown above]
```

---

## 📊 Benefits of Integration

### For Users:
✅ **Automatic Tracking** - No manual status updates needed
✅ **Complete Context** - Commands understand project state
✅ **Audit Trail** - Everything documented automatically
✅ **No Context Loss** - Organization files always current

### For Commands:
✅ **Better Decisions** - Commands know project context
✅ **Aligned Work** - Commands align with phase goals
✅ **Avoid Conflicts** - Commands see what's in progress
✅ **Quality Metrics** - Commands track improvements

### For Projects:
✅ **Self-Documenting** - Work documents itself
✅ **Always Current** - Status never stale
✅ **Strategic Alignment** - Work aligned with roadmap
✅ **Measurable Progress** - Metrics tracked automatically

---

## 🎯 Integration Checklist

When adding organization integration to a command:

### Pre-Execution (Wave 0)
- [ ] Read TODO.md for related tasks
- [ ] Read STATUS.md for baseline metrics
- [ ] Read ROADMAP.md for phase alignment
- [ ] Extract context summary

### Start Tracking (Wave 0.5)
- [ ] Mark TODO item as in progress
- [ ] Add to STATUS.md current work
- [ ] Record start timestamp

### During Execution
- [ ] Reference context throughout command
- [ ] Update wave progress in STATUS.md
- [ ] Track validation scores

### Post-Execution (Final Wave)
- [ ] Mark TODO items as completed
- [ ] Move completed items to "Recently Completed"
- [ ] Add new tasks discovered
- [ ] Update STATUS.md with results
- [ ] Update STATUS.md metrics
- [ ] Update ROADMAP.md progress if applicable
- [ ] Generate integrated summary report

---

## 🚀 Advanced Features

### Cross-Command Coordination

Commands can check TODO.md to avoid conflicts:
```markdown
**Check for Conflicts:**
- Read TODO.md for items marked `[▶]` (in progress)
- If related work in progress: Wait or coordinate
- If no conflicts: Proceed
```

### Smart Task Suggestions

Commands can suggest next tasks based on ROADMAP.md:
```markdown
**Suggest Next Steps:**
- Read ROADMAP.md current phase objectives
- Identify incomplete objectives
- Suggest TODO items to complete phase
```

### Automatic Phase Transitions

When phase complete, automatically start next phase:
```markdown
**Check Phase Completion:**
- Read ROADMAP.md current phase objectives
- If all objectives `[x]`: Mark phase complete
- Update current phase to next phase
- Notify user of phase transition
```

---

## 📝 File Format Standards

### TODO.md Status Indicators
- `[ ]` - Not started
- `[▶]` - In progress (auto-updated by commands)
- `[x]` - Completed
- `[⚠]` - Blocked
- `[?]` - Needs clarification

### STATUS.md Update Sections
```markdown
## 🔄 Current Work (Auto-updated by commands)
[Commands add entries here when starting]

## ✅ Recent Completions (Auto-updated by commands)
[Commands add entries here when completing]

## 📊 Metrics (Auto-updated by commands)
[Commands update metrics after execution]
```

### ROADMAP.md Progress Tracking
```markdown
## Phase X: [Name]
**Progress:** [X/Y] ([percentage]%) - *Auto-updated*
- [x] Objective 1 (Completed by: /command on YYYY-MM-DD)
- [▶] Objective 2 (In progress: /command)
- [ ] Objective 3
```

---

## 🧪 Testing Integration

### Validation Points:
1. **Pre-execution:** Context correctly extracted from files
2. **Start tracking:** TODO/STATUS properly updated with in-progress
3. **During execution:** Progress visible in STATUS.md
4. **Post-execution:** All three files properly updated
5. **Summary:** References all files correctly

### Test Scenarios:
- Command with existing TODO item
- Command without TODO item (creates one)
- Command completing phase objective
- Multiple commands running (no conflicts)
- Command discovering new tasks

---

**Last Updated:** 2025-10-12
**Version:** 1.0
**Status:** Ready for implementation in commands
