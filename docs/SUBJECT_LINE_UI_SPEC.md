# Subject Line Management & A/B Testing UI/UX Specification

## Table of Contents
1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [User Flows](#user-flows)
4. [Interface Specifications](#interface-specifications)
5. [API Integration Points](#api-integration-points)
6. [Responsive Design](#responsive-design)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Technical Implementation Notes](#technical-implementation-notes)

---

## Overview

### Purpose
This specification defines the frontend UI/UX for managing AI-generated subject lines, conducting A/B tests, and tracking performance metrics within the lead generation system.

### Design Principles
- **Progressive Disclosure**: Show complexity only when needed
- **Data-Driven Decisions**: Surface actionable insights prominently
- **Quick Actions**: Enable common tasks in 1-2 clicks
- **Visual Hierarchy**: Use color, size, and position to guide attention
- **Confidence Building**: Show statistical significance and quality scores clearly

### User Personas
1. **Campaign Creator**: Needs to quickly select good subject lines without deep analysis
2. **Marketing Optimizer**: Wants to run tests and analyze performance data
3. **Business Owner**: Needs simple overview of what's working

---

## Component Architecture

### Component Hierarchy

```
SubjectLineManager/
├── SubjectLineSelector/           # Used during campaign creation
│   ├── VariantCard/              # Individual subject line variant
│   ├── QualityScoreBadge/        # Score visualization
│   ├── PreviewModal/             # Mobile/desktop preview
│   └── BulkActions/              # Select all, deselect, etc.
│
├── ABTestConfigurator/           # Test setup interface
│   ├── TestMetadataForm/        # Name, description
│   ├── VariantSelector/         # Choose variants to test
│   ├── SampleSizeCalculator/    # Statistical power calculator
│   ├── MetricsSelector/         # Success criteria
│   └── DurationPicker/          # Test timeline
│
├── PerformanceDashboard/         # Results and analytics
│   ├── TestOverview/            # Current test status
│   ├── VariantComparison/       # Side-by-side metrics
│   ├── StatisticalSignificance/ # Confidence indicators
│   ├── TimeSeriesChart/         # Performance over time
│   └── WinnerDeclaration/       # Declare winning variant
│
├── SubjectLineLibrary/           # Historical repository
│   ├── LibrarySearch/           # Filter and search
│   ├── PerformanceCard/         # Past subject line card
│   ├── CategoryFilter/          # By industry, strategy
│   └── CopyActions/             # Copy, adapt, reuse
│
└── QualityScoringDisplay/        # Detailed score breakdown
    ├── OverallScoreMeter/       # Gauge or progress bar
    ├── ComponentBreakdown/      # Individual score factors
    ├── ImprovementSuggestions/  # Actionable tips
    └── SpamRiskWarning/         # Alert component
```

---

## User Flows

### Flow 1: Campaign Creation with Subject Line Selection

```
START: User creates new campaign
  │
  ├─> Enter campaign details (location, industry, etc.)
  │
  ├─> AI generates 3-5 subject line variants per lead
  │   │
  │   ├─> System shows SubjectLineSelector component
  │   │   │
  │   │   ├─> User sees variants with quality scores
  │   │   ├─> Color-coded badges (green=excellent, yellow=good, red=poor)
  │   │   ├─> Hover for detailed score breakdown
  │   │   │
  │   │   └─> User actions:
  │   │       ├─> [Quick Select] Click "Use Best" (auto-selects highest score)
  │   │       ├─> [Manual Select] Click individual variant to select
  │   │       ├─> [Preview] Open modal to see mobile/desktop rendering
  │   │       └─> [Setup A/B Test] Button to configure testing
  │   │
  │   └─> Selected subject line saved to campaign
  │
  └─> Continue with campaign creation
      │
      └─> END: Campaign created with subject lines
```

### Flow 2: Setting Up A/B Test

```
START: User clicks "Setup A/B Test"
  │
  ├─> ABTestConfigurator opens
  │   │
  │   ├─> Step 1: Test Metadata
  │   │   ├─> Enter test name (e.g., "Q1 2025 Local Biz Test")
  │   │   └─> Enter description (optional)
  │   │
  │   ├─> Step 2: Select Variants (2-5 variants)
  │   │   ├─> Checkboxes for each generated variant
  │   │   ├─> Show preview of each
  │   │   └─> Minimum 2, maximum 5 variants
  │   │
  │   ├─> Step 3: Configure Sample Size
  │   │   ├─> Slider or input: "Test on X% of leads"
  │   │   ├─> Calculator shows: "X leads per variant"
  │   │   └─> Statistical power indicator
  │   │
  │   ├─> Step 4: Success Metrics
  │   │   ├─> Checkboxes: Open Rate (default)
  │   │   ├─> Reply Rate (optional)
  │   │   └─> Conversion Rate (if tracking available)
  │   │
  │   ├─> Step 5: Test Duration
  │   │   ├─> Date picker: Start/End dates
  │   │   ├─> Or duration: "Run for X days"
  │   │   └─> Estimated completion date shown
  │   │
  │   └─> Review & Launch
  │       ├─> Summary of test configuration
  │       ├─> Estimated cost (if applicable)
  │       └─> [Launch Test] or [Save as Draft]
  │
  └─> END: Test created and running
```

### Flow 3: Monitoring Test Performance

```
START: User navigates to PerformanceDashboard
  │
  ├─> See list of active and completed tests
  │   │
  │   ├─> Click on specific test
  │   │   │
  │   │   ├─> Test Overview Section
  │   │   │   ├─> Test name, status, progress bar
  │   │   │   ├─> Leads tested per variant
  │   │   │   └─> Days remaining
  │   │   │
  │   │   ├─> Variant Comparison Table
  │   │   │   ├─> Columns: Variant, Open Rate, Reply Rate, Score
  │   │   │   ├─> Sort by any metric
  │   │   │   ├─> Color coding: Green=winning, Yellow=testing, Red=losing
  │   │   │   └─> Statistical significance badges
  │   │   │
  │   │   ├─> Time Series Chart
  │   │   │   ├─> Line chart showing performance over time
  │   │   │   ├─> Toggle metrics (open rate, reply rate)
  │   │   │   └─> Hover for specific data points
  │   │   │
  │   │   └─> Actions
  │   │       ├─> [Declare Winner] (if statistically significant)
  │   │       ├─> [Stop Test] (end early)
  │   │       ├─> [Export Results] (CSV/PDF)
  │   │       └─> [Apply Winner to Campaign] (use for remaining leads)
  │   │
  │   └─> If winner declared:
  │       ├─> Celebration animation
  │       ├─> Winner badge on variant
  │       ├─> Automatically added to Subject Line Library
  │       └─> Option to apply to similar campaigns
  │
  └─> END: Test monitored and action taken
```

### Flow 4: Using Subject Line Library

```
START: User needs subject line inspiration
  │
  ├─> Navigate to SubjectLineLibrary
  │   │
  │   ├─> See grid of past high-performing subject lines
  │   │   │
  │   │   ├─> Filter options (left sidebar):
  │   │   │   ├─> Industry (restaurants, retail, healthcare, etc.)
  │   │   │   ├─> Strategy (curiosity, urgency, personalization, etc.)
  │   │   │   ├─> Performance (top 10%, top 25%, all)
  │   │   │   └─> Date range (last 30 days, 90 days, all time)
  │   │   │
  │   │   ├─> Sort options (dropdown):
  │   │   │   ├─> Open rate (high to low)
  │   │   │   ├─> Reply rate (high to low)
  │   │   │   ├─> Most recent
  │   │   │   └─> Most used
  │   │   │
  │   │   └─> Each PerformanceCard shows:
  │   │       ├─> Subject line text
  │   │       ├─> Performance metrics (badges)
  │   │       ├─> Industry/strategy tags
  │   │       ├─> Times used count
  │   │       └─> Action buttons
  │   │
  │   ├─> User actions on card:
  │   │   ├─> [Copy] - Copy to clipboard
  │   │   ├─> [Adapt] - Open AI editor to personalize
  │   │   ├─> [View Details] - See full test results
  │   │   └─> [Use in Campaign] - Apply to active campaign
  │   │
  │   └─> Search functionality:
  │       ├─> Free-text search across subject lines
  │       └─> Instant filtering as user types
  │
  └─> END: Subject line copied or adapted for use
```

---

## Interface Specifications

### 1. Subject Line Selector Component

**Location**: Campaign creation flow, after lead generation settings

**Layout**: Card-based grid or list view

#### Variant Card Design

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────┐                                                     │
│ │ 92   │  Quick win for [Business Name]'s visibility        │
│ │ ⭐   │                                                     │
│ └──────┘                                                     │
│  QUALITY                                                     │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Strategy: Curiosity + Personalization                   │ │
│ │ Length: 48 characters (Optimal)                         │ │
│ │ Spam Risk: Low                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Select This Variant]  [Preview]  [See Breakdown]          │
└─────────────────────────────────────────────────────────────┘
```

**Visual Design Details**:

**Quality Score Badge**:
- Large circular or square badge (top-left)
- Score: 0-100 scale
- Color coding:
  - 90-100: `#10B981` (green) - Excellent
  - 75-89: `#3B82F6` (blue) - Good
  - 60-74: `#F59E0B` (amber) - Fair
  - Below 60: `#EF4444` (red) - Poor
- Star icon inside circle for top performers (95+)

**Subject Line Text**:
- Font: System default, 16px, medium weight
- Dynamic highlighting:
  - Personalization tokens in blue `[Business Name]`
  - Power words in bold
  - Emojis displayed naturally

**Metadata Section** (collapsible):
- Light gray background `#F3F4F6`
- Small text (14px)
- Icons for each metric
- Strategy tags as colored pills

**Action Buttons**:
- Primary: "Select This Variant" (full-width, prominent)
- Secondary: "Preview" (icon + text)
- Tertiary: "See Breakdown" (text link)

**Hover State**:
- Subtle elevation (shadow)
- Border highlight in brand color
- Cursor changes to pointer

**Selected State**:
- Blue border (2px, `#3B82F6`)
- Checkmark badge (top-right corner)
- Slight background tint

#### Bulk Actions Bar

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Showing 5 variants | 1 selected                          │
│                                                              │
│ [Use Best Variant]  [Setup A/B Test]  [Generate More]      │
└─────────────────────────────────────────────────────────────┘
```

**Position**: Sticky at top when scrolling through variants

**Functionality**:
- "Use Best Variant": Auto-selects highest scoring variant
- "Setup A/B Test": Opens test configurator with all variants
- "Generate More": Creates 3-5 additional variants

#### Preview Modal

```
┌─────────────────────────────────────────────────────────────┐
│                    Subject Line Preview             [Close] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────────────────────────┐   │
│  │   Mobile    │    │         Desktop                  │   │
│  │   View      │    │         View                     │   │
│  └─────────────┘    └──────────────────────────────────┘   │
│                                                              │
│  [iPhone 14]        [Gmail Web Interface]                   │
│  ┌───────────┐      ┌──────────────────────────────────┐   │
│  │ ┌───┐ BN  │      │ From: Your Business              │   │
│  │ │   │     │      │ Subject: Quick win for [Business │   │
│  │ └───┘ Qui…│      │          Name]'s visibility      │   │
│  │ 48 min ago │      │                                  │   │
│  └───────────┘      │ Preview text appears here...     │   │
│                      └──────────────────────────────────┘   │
│                                                              │
│  Character Count: 48 / 60 recommended                       │
│  ✓ Fits in mobile preview without truncation                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Side-by-side mobile and desktop views
- Device selector dropdown (iPhone, Android, etc.)
- Email client selector (Gmail, Outlook, Apple Mail)
- Real-time character count
- Truncation warnings
- Preview text simulation

### 2. A/B Test Configurator Component

**Layout**: Multi-step wizard or single-page form with sections

**Recommended**: Single-page with progressive disclosure

#### Step 1: Test Metadata

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 A/B Test Configuration                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Test Details                                                │
│                                                              │
│ Test Name *                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Q1 2025 Local Business Outreach                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Description (Optional)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Testing curiosity-based vs. urgency-based subject       │ │
│ │ lines for restaurant owners in Los Angeles             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Step 2: Variant Selection

```
┌─────────────────────────────────────────────────────────────┐
│ Select Variants to Test (2-5 variants)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ☑ Variant A (Score: 92)                                     │
│   Quick win for [Business Name]'s visibility               │
│   Strategy: Curiosity + Personalization                     │
│                                                              │
│ ☑ Variant B (Score: 88)                                     │
│   [Business Name]: Act now for better results              │
│   Strategy: Urgency + Personalization                       │
│                                                              │
│ ☐ Variant C (Score: 85)                                     │
│   Transform [Business Name] starting today                  │
│   Strategy: Transformation + Urgency                        │
│                                                              │
│ ☐ Variant D (Score: 82)                                     │
│   [First Name], ready to boost [Business Name]?            │
│   Strategy: Question + Personalization                      │
│                                                              │
│ Selected: 2 variants                                        │
│ ⚠️ Minimum 2 variants required for A/B test                 │
│ 💡 Tip: Test 2-3 different strategies for best insights    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Checkbox selection with visual preview
- Cannot select fewer than 2 or more than 5
- Inline variant preview (collapsible for space)
- Real-time counter showing selected count
- Helpful tips based on selection

#### Step 3: Sample Size Configuration

```
┌─────────────────────────────────────────────────────────────┐
│ Sample Size & Distribution                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Test on what percentage of leads?                           │
│                                                              │
│ [━━━━━━━━━━━━━━━━━━━━━━━━] 50%                              │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁                                 │
│ 0%                                                    100%   │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📊 Test Details                                       │   │
│ │                                                       │   │
│ │ Total Leads: 1,000                                    │   │
│ │ Test Sample: 500 leads (50%)                          │   │
│ │ Per Variant: 250 leads each (2 variants)             │   │
│ │ Remaining: 500 leads for winner                       │   │
│ │                                                       │   │
│ │ Statistical Power: ⭐⭐⭐⭐⭐ Excellent               │   │
│ │ Confidence: 95% at 20% effect size                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ℹ️ Recommendation: 50% sample size provides reliable        │
│    results while saving half your leads for the winner      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Visual slider (smooth, no steps)
- Real-time calculation panel updates
- Statistical power indicator (star rating)
- Color-coded confidence levels
- Smart recommendations based on lead count
- Explanation of what each metric means (tooltips)

#### Step 4: Success Metrics

```
┌─────────────────────────────────────────────────────────────┐
│ Success Metrics                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ What metrics will determine the winner?                     │
│                                                              │
│ ☑ Open Rate (Primary Metric)                               │
│   ℹ️ Percentage of recipients who open the email           │
│                                                              │
│ ☑ Reply Rate                                                │
│   ℹ️ Percentage of recipients who reply (most important)    │
│                                                              │
│ ☐ Click Rate                                                │
│   ℹ️ Percentage who click links in email (requires links)   │
│                                                              │
│ ☐ Conversion Rate                                           │
│   ℹ️ Percentage who complete desired action                 │
│   ⚠️ Requires conversion tracking setup                     │
│                                                              │
│ Winner Selection Strategy:                                  │
│ ◉ Highest combined score (weighted by importance)           │
│ ○ Best open rate only                                       │
│ ○ Best reply rate only                                      │
│ ○ Manual selection after review                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Checkbox for each available metric
- Tooltips explaining each metric
- Disable unavailable metrics with explanation
- Winner selection strategy (radio buttons)
- Recommended defaults pre-selected

#### Step 5: Test Duration

```
┌─────────────────────────────────────────────────────────────┐
│ Test Duration                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ How long should the test run?                               │
│                                                              │
│ ◉ Specific Duration                                         │
│   ┌──────────────────┐                                      │
│   │ 7 days         ▼ │                                      │
│   └──────────────────┘                                      │
│   Estimated end: January 23, 2025                           │
│                                                              │
│ ○ Until Statistical Significance                            │
│   ⚠️ May take 14-30 days depending on engagement            │
│                                                              │
│ ○ Custom Date Range                                         │
│   Start: [Jan 16, 2025]  End: [Jan 23, 2025]               │
│                                                              │
│ 💡 Recommendation: 7-14 days allows for weekly patterns     │
│    and gives time for delayed opens                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Radio button selection for duration type
- Dropdown for preset durations (3, 7, 14, 30 days)
- Date pickers for custom ranges
- Estimated completion date
- Warning for "until significance" option
- Recommendations with reasoning

#### Review & Launch

```
┌─────────────────────────────────────────────────────────────┐
│ Review Test Configuration                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✓ Test Name: Q1 2025 Local Business Outreach               │
│ ✓ Variants: 2 selected                                      │
│   • Variant A: Quick win for [Business Name]'s visibility  │
│   • Variant B: [Business Name]: Act now for better results │
│                                                              │
│ ✓ Sample Size: 500 leads (50% of total)                    │
│   • 250 leads per variant                                   │
│   • 500 leads reserved for winner                           │
│                                                              │
│ ✓ Success Metrics: Open Rate, Reply Rate                   │
│   • Winner: Highest combined score                          │
│                                                              │
│ ✓ Duration: 7 days                                          │
│   • Estimated completion: January 23, 2025                  │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ⚠️  Important Reminders                               │   │
│ │                                                       │   │
│ │ • Test will begin immediately upon launch             │   │
│ │ • Leads will be randomly assigned to variants         │   │
│ │ • You can monitor progress in the dashboard           │   │
│ │ • Test can be stopped early if needed                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ [← Back to Edit]    [Save as Draft]    [Launch Test Now →] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Checkmarks for completed sections
- Collapsible details for each section
- Important reminders in alert box
- Three action options (back, save, launch)
- Confirmation dialog on launch (not shown)

### 3. Performance Dashboard Component

**Location**: Main navigation item "A/B Tests" or "Performance"

**Layout**: Master-detail layout with test list and detail view

#### Test List View

```
┌─────────────────────────────────────────────────────────────┐
│ A/B Tests                                    [+ New Test]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Filter: [All Tests ▼]  [Active]  [Completed]  [Archived]   │
│ Sort: [Recent First ▼]                                      │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🟢 Q1 2025 Local Business Outreach      ACTIVE        │   │
│ │    2 variants • 250/500 leads tested • 5 days left    │   │
│ │    Leading: Variant A (+12% open rate)                │   │
│ │    [View Details →]                                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🔵 Holiday Campaign Test              COMPLETED       │   │
│ │    3 variants • 750 leads tested • Ended Jan 10       │   │
│ │    Winner: Variant B (+18% reply rate) ⭐             │   │
│ │    [View Details →]                                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ⚪ December Retail Test                 DRAFT         │   │
│ │    2 variants • Not yet launched                      │   │
│ │    [Edit] [Launch]                                    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Status indicators (colored dots)
- Quick stats for each test
- Leading variant preview (for active tests)
- Winner badge (for completed tests)
- Action buttons inline
- Filter and sort controls

#### Test Detail View

**Test Overview Section**:

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Tests                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 Q1 2025 Local Business Outreach                          │
│    Status: ACTIVE • Started Jan 16 • 5 days remaining       │
│                                                              │
│ Progress: [━━━━━━━━━━━━━━━━░░░░░░] 50% (250/500 leads)      │
│                                                              │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ Open Rate   │  │ Reply Rate  │  │ Confidence  │          │
│ │   24.5%     │  │    8.2%     │  │    92%      │          │
│ │  ↑ +3.2%    │  │  ↑ +1.8%    │  │   HIGH      │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│ [Stop Test]  [Export Results]  [Declare Winner]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Clear status and timeline
- Progress bar with exact counts
- Key metric cards with trend indicators
- Confidence level prominently displayed
- Primary actions always visible

**Variant Comparison Table**:

```
┌─────────────────────────────────────────────────────────────┐
│ Variant Performance                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Variant │ Leads │ Opens │ Replies │ Score │ Status     │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🟢 A    │  250  │ 26.4% │   9.2%  │  92   │ LEADING ⭐ │ │
│ │         │       │ ↑↑    │  ↑↑     │       │            │ │
│ │ Quick win for [Business Name]'s visibility             │ │
│ │                                                         │ │
│ │ 🟡 B    │  250  │ 22.8% │   7.4%  │  88   │ TESTING    │ │
│ │         │       │ →     │  →      │       │            │ │
│ │ [Business Name]: Act now for better results            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Statistical Significance:                                   │
│ • Variant A vs B: 92% confidence ⭐ (Significant)           │
│ • Recommended: Continue test for 2 more days                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Color-coded status indicators
- Trend arrows (↑↑ significant up, ↑ up, → neutral, ↓ down)
- Expandable rows showing full subject line
- Leading variant highlighted
- Statistical significance explanation below table
- Sortable columns

**Time Series Chart**:

```
┌─────────────────────────────────────────────────────────────┐
│ Performance Over Time                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Metric: [Open Rate ▼]  Grouping: [Daily ▼]                 │
│                                                              │
│  30% │                                                       │
│      │                         ●                             │
│  25% │                     ●       ●                         │
│      │         ●       ●               ● (Variant A)         │
│  20% │     ●       ●                                         │
│      │ ○       ○       ○       ○       ○ (Variant B)         │
│  15% │                                                       │
│      │                                                       │
│  10% │                                                       │
│      └──────────────────────────────────────────────────     │
│       Jan 16   17     18     19     20                       │
│                                                              │
│ 💡 Insight: Variant A shows consistently higher performance │
│    with growing gap over time                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Dropdown to switch metrics (open rate, reply rate, etc.)
- Grouping options (hourly, daily, weekly)
- Interactive chart (hover for exact values)
- Multiple line colors for variants
- AI-generated insights below chart
- Responsive design (stacks on mobile)

**Winner Declaration Panel** (appears when significant):

```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 Ready to Declare Winner!                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Variant A is performing significantly better:               │
│                                                              │
│ • +15.8% higher open rate (p < 0.05) ✓                      │
│ • +24.3% higher reply rate (p < 0.01) ✓✓                    │
│ • 95% confidence level reached ✓                            │
│                                                              │
│ What happens when you declare a winner:                     │
│ ✓ Test will stop immediately                                │
│ ✓ Variant A will be used for remaining 500 leads            │
│ ✓ Results saved to Subject Line Library                     │
│ ✓ You can apply this winner to similar campaigns            │
│                                                              │
│ [Cancel]          [Declare Variant A Winner →]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Celebration emoji and positive framing
- Clear explanation of statistical significance
- Bulleted list of what will happen
- Checkmarks for confidence indicators
- Two clear action buttons
- Confirmation dialog before finalizing

### 4. Subject Line Library Component

**Location**: Main navigation item "Library" or "Subject Lines"

**Layout**: Grid view with sidebar filters

#### Library View

```
┌──────────────────────────────────────────────────────────────┐
│ Subject Line Library                          [Export CSV]  │
├─────────────┬────────────────────────────────────────────────┤
│             │                                                │
│ 🔍 Search   │  Sort: [Best Performing ▼]   View: [Grid][List]│
│ ┌─────────┐ │                                                │
│ │         │ │  ┌──────────────┐  ┌──────────────┐           │
│ └─────────┘ │  │ ⭐ 96 / 100   │  │ ⭐ 94 / 100   │           │
│             │  │              │  │              │           │
│ Industry    │  │ Quick win for│  │ Ready to     │           │
│ ☑ All       │  │ [Business]'s │  │ transform    │           │
│ ☐ Restaurant│  │ visibility   │  │ [Business]?  │           │
│ ☐ Retail    │  │              │  │              │           │
│ ☐ Healthcare│  │ 📊 28% open  │  │ 📊 26% open  │           │
│ ☐ Services  │  │ 💬 12% reply │  │ 💬 11% reply │           │
│             │  │              │  │              │           │
│ Strategy    │  │ 🏷️ Curiosity │  │ 🏷️ Question │           │
│ ☑ All       │  │    Personal  │  │    Transform │           │
│ ☐ Curiosity │  │              │  │              │           │
│ ☐ Urgency   │  │ Used: 3x     │  │ Used: 5x     │           │
│ ☐ Question  │  │ Last: Jan 10 │  │ Last: Jan 8  │           │
│ ☐ Transform │  │              │  │              │           │
│             │  │ [Copy] [View]│  │ [Copy] [View]│           │
│ Performance │  └──────────────┘  └──────────────┘           │
│ ◉ Top 10%   │                                                │
│ ○ Top 25%   │  ┌──────────────┐  ┌──────────────┐           │
│ ○ All       │  │ ⭐ 92 / 100   │  │ ⭐ 91 / 100   │           │
│             │  │              │  │              │           │
│ Date Range  │  │ [Business]:  │  │ Exclusive    │           │
│ ○ Last 30d  │  │ Act now for  │  │ opportunity  │           │
│ ◉ Last 90d  │  │ results      │  │ for [Name]   │           │
│ ○ All Time  │  │              │  │              │           │
│             │  │ 📊 25% open  │  │ 📊 24% open  │           │
│             │  │ 💬 10% reply │  │ 💬 10% reply │           │
│ [Clear All] │  │              │  │              │           │
│             │  │ 🏷️ Urgency   │  │ 🏷️ Exclusive │           │
│             │  │    Personal  │  │    Personal  │           │
│             │  │              │  │              │           │
│             │  │ Used: 2x     │  │ Used: 4x     │           │
│             │  │ Last: Jan 12 │  │ Last: Jan 5  │           │
│             │  │              │  │              │           │
│             │  │ [Copy] [View]│  │ [Copy] [View]│           │
│             │  └──────────────┘  └──────────────┘           │
│             │                                                │
│             │  Showing 4 of 127 subject lines                │
│             │  [Load More]                                   │
└─────────────┴────────────────────────────────────────────────┘
```

**Features**:

**Search Bar**:
- Real-time filtering
- Searches subject line text and tags
- Instant results as you type

**Filters (Left Sidebar)**:
- Collapsible sections
- Checkbox for multi-select
- Radio buttons for single-select
- Active filter count badge
- "Clear All" button at bottom

**Performance Cards**:
- Large score badge (top-left)
- Subject line text (truncated if long)
- Key metrics (open rate, reply rate) with icons
- Strategy tags as colored pills
- Usage stats (times used, last used date)
- Action buttons (Copy, View Details)

**Grid Layout**:
- 2-4 columns depending on screen width
- Equal height cards
- Hover state: elevation and highlight
- Responsive: stacks to single column on mobile

**Sort Options**:
- Best Performing (default)
- Most Recent
- Most Used
- Alphabetical

**View Toggle**:
- Grid view (cards)
- List view (table with more details)

#### Detail Modal

When user clicks "View Details" on a card:

```
┌─────────────────────────────────────────────────────────────┐
│ Subject Line Details                             [Close X] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Quick win for [Business Name]'s visibility                 │
│                                                              │
│ ┌──────┐   Quality Score: 96 / 100                          │
│ │ 96   │   ⭐ Top 5% Performer                               │
│ │ ⭐   │                                                     │
│ └──────┘                                                     │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📊 Performance History                                │   │
│ │                                                       │   │
│ │ Campaigns Used: 3                                     │   │
│ │ Total Leads: 1,247                                    │   │
│ │                                                       │   │
│ │ Average Open Rate:  28.4% (▲ 15% vs. baseline)       │   │
│ │ Average Reply Rate: 11.8% (▲ 22% vs. baseline)       │   │
│ │                                                       │   │
│ │ Win Rate: 2 out of 3 A/B tests (67%)                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ Strategy Breakdown:                                          │
│ • Primary: Curiosity (score: 95)                            │
│ • Secondary: Personalization (score: 90)                    │
│                                                              │
│ Best Performing In:                                          │
│ 🏆 Restaurants (32% open rate)                              │
│ 🥈 Retail (26% open rate)                                   │
│                                                              │
│ Usage History:                                               │
│ • Jan 10, 2025 - Restaurant Campaign (300 leads)            │
│ • Dec 28, 2024 - Holiday Retail Test (500 leads) ⭐ Winner  │
│ • Dec 15, 2024 - Local Services (447 leads)                │
│                                                              │
│ [Copy to Clipboard]  [Use in New Campaign]  [Adapt with AI]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Full subject line text (no truncation)
- Large quality score display
- Performance history aggregated across campaigns
- Win rate from A/B tests
- Strategy breakdown
- Best performing industries/segments
- Complete usage history with links
- Winner badge for A/B test victories
- Three primary actions

### 5. Quality Scoring Display Component

**Location**: Inline with variant cards, expandable detail view

**Compact View** (on variant card):

```
┌──────┐
│ 92   │  Quality Score: 92 / 100
│ ⭐   │  Click for breakdown →
└──────┘
```

**Expanded View** (modal or sidebar):

```
┌─────────────────────────────────────────────────────────────┐
│ Quality Score Breakdown                          [Close X] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Overall Score: 92 / 100                                     │
│ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░] 92%             │
│ ⭐ Excellent - This subject line is highly effective        │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📝 Components                             Score      │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │                                                       │   │
│ │ Personalization                           [95] ⭐    │   │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]            │   │
│ │ ✓ Includes [Business Name]                            │   │
│ │ ✓ Contextually relevant                               │   │
│ │                                                       │   │
│ │ Emotional Trigger                         [88] ✓     │   │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░]              │   │
│ │ ✓ Uses "quick win" (positive anticipation)            │   │
│ │ ⚠️ Could add urgency for stronger impact              │   │
│ │                                                       │   │
│ │ Length & Readability                      [90] ✓     │   │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░]             │   │
│ │ ✓ 48 characters (optimal: 30-60)                      │   │
│ │ ✓ Clear and scannable                                 │   │
│ │                                                       │   │
│ │ Spam Risk                                 [98] ⭐    │   │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]           │   │
│ │ ✓ No spam trigger words                               │   │
│ │ ✓ Balanced capitalization                             │   │
│ │                                                       │   │
│ │ Clarity & Relevance                       [92] ⭐    │   │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]              │   │
│ │ ✓ Clear value proposition                             │   │
│ │ ✓ Relevant to business owners                         │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 💡 Improvement Suggestions:                                 │
│                                                              │
│ 1. Add time-sensitive language for urgency                  │
│    Example: "Quick win for [Business] this week"           │
│    Potential score: 95                                      │
│                                                              │
│ 2. Consider adding emoji for visual appeal                  │
│    Example: "🚀 Quick win for [Business]'s visibility"     │
│    Potential score: 94 (Note: Some industries prefer plain) │
│                                                              │
│ ⚠️  No critical issues detected                             │
│ ✓  Safe to use in cold outreach                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:

**Overall Score**:
- Large score display with color coding
- Progress bar visualization
- Verbal rating (Excellent, Good, Fair, Poor)
- Context about what the score means

**Component Scores**:
- 5-7 key components with individual scores
- Progress bars for each (color-coded)
- Checkmarks (✓) for strengths
- Warnings (⚠️) for weaknesses
- Brief explanation for each component

**Color Coding**:
- 90-100: Green (`#10B981`) with ⭐
- 75-89: Blue (`#3B82F6`) with ✓
- 60-74: Amber (`#F59E0B`) with ⚠️
- Below 60: Red (`#EF4444`) with ❌

**Improvement Suggestions**:
- Actionable, specific recommendations
- Example of improved subject line
- Predicted score after improvement
- Caveats or considerations

**Spam Risk Warning** (if high risk):
```
┌───────────────────────────────────────────────────────────┐
│ ⚠️  SPAM RISK WARNING                                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ This subject line has a HIGH spam risk (score: 42)       │
│                                                           │
│ Issues detected:                                          │
│ ❌ Contains spam trigger: "FREE"                          │
│ ❌ Excessive capitalization: 4 words all caps             │
│ ❌ Multiple exclamation marks: !!!                        │
│                                                           │
│ Recommendations:                                          │
│ • Remove or replace "FREE" with "No cost" or "Included"  │
│ • Use normal capitalization                               │
│ • Remove excessive punctuation                            │
│                                                           │
│ [Generate Alternative]  [Ignore Warning]                 │
└───────────────────────────────────────────────────────────┘
```

**Features**:
- Prominent warning styling (red/amber border)
- Specific issues listed with ❌
- Concrete recommendations
- Actions to fix (generate alternative) or proceed

### 6. Export Integration

**CSV Export with Subject Lines**:

When user exports campaign leads, include subject line columns:

```csv
business_name,email,phone,subject_line,subject_line_score,subject_line_strategy,open_tracking_url
Joe's Pizza,joe@joespizza.com,555-0123,"Quick win for Joe's Pizza's visibility",92,"Curiosity + Personalization","https://track.instantly.ai/..."
```

**Export Configuration Dialog**:

```
┌─────────────────────────────────────────────────────────────┐
│ Export Campaign Leads                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Format: [CSV ▼]  [JSON]  [Instantly.ai Compatible]         │
│                                                              │
│ Include Subject Lines:                                      │
│ ☑ Subject line text                                         │
│ ☑ Quality scores                                            │
│ ☑ Strategy tags                                             │
│ ☐ Full score breakdown (detailed)                           │
│                                                              │
│ ☑ Instantly.ai format (recommended)                         │
│   • Compatible with Instantly.ai campaign import            │
│   • Includes all required columns                           │
│   • Pre-configured tracking URLs                            │
│                                                              │
│ Columns to include:                                         │
│ ☑ Business Name                                             │
│ ☑ Email Address                                             │
│ ☑ Phone Number                                              │
│ ☑ Facebook URL                                              │
│ ☑ LinkedIn URL                                              │
│ ☑ Subject Line                                              │
│ ☑ Icebreaker                                                │
│ ☐ Raw data fields                                           │
│                                                              │
│ [Cancel]                            [Download CSV (1.2MB)] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Multiple format options
- Checkbox controls for what to include
- Instantly.ai compatibility toggle
- File size preview
- Column selection with defaults

**Instantly.ai Integration** (future enhancement):

```
┌─────────────────────────────────────────────────────────────┐
│ Export to Instantly.ai                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ☑ Connected to Instantly.ai account                         │
│   (john@example.com)                                        │
│                                                              │
│ Campaign Settings:                                           │
│                                                              │
│ Campaign Name *                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Q1 2025 Local Business Outreach                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Select Workspace                                            │
│ [My Workspace ▼]                                            │
│                                                              │
│ Lead Mapping:                                               │
│ • Email Address → instantly_email ✓                         │
│ • First Name → instantly_first_name ✓                       │
│ • Subject Line → custom_subject_line ✓                      │
│ • Icebreaker → custom_icebreaker_1 ✓                        │
│                                                              │
│ A/B Test Configuration:                                     │
│ ◉ Use subject line from this system                         │
│ ○ Let Instantly.ai generate subject lines                   │
│                                                              │
│ ☑ Enable open tracking                                      │
│ ☑ Enable click tracking                                     │
│ ☑ Enable reply tracking                                     │
│                                                              │
│ 1,247 leads ready to export                                 │
│                                                              │
│ [Cancel]                  [Export to Instantly.ai →]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## API Integration Points

### Frontend to Backend Communication

#### 1. Subject Line Generation

**Endpoint**: `POST /api/campaigns/:campaignId/generate-subject-lines`

**Request**:
```json
{
  "leadId": "lead-123",
  "businessName": "Joe's Pizza",
  "industry": "restaurant",
  "location": "Los Angeles, CA",
  "variantCount": 5,
  "strategies": ["curiosity", "urgency", "personalization"]
}
```

**Response**:
```json
{
  "variants": [
    {
      "id": "var-1",
      "text": "Quick win for Joe's Pizza's visibility",
      "score": 92,
      "strategies": ["curiosity", "personalization"],
      "breakdown": {
        "personalization": 95,
        "emotional_trigger": 88,
        "length": 90,
        "spam_risk": 98,
        "clarity": 92
      },
      "suggestions": [
        "Add time-sensitive language for urgency",
        "Consider adding emoji for visual appeal"
      ]
    },
    // ... 4 more variants
  ]
}
```

#### 2. A/B Test Creation

**Endpoint**: `POST /api/ab-tests`

**Request**:
```json
{
  "campaignId": "camp-123",
  "name": "Q1 2025 Local Business Outreach",
  "description": "Testing curiosity vs urgency strategies",
  "variants": [
    {
      "id": "var-1",
      "text": "Quick win for [Business Name]'s visibility"
    },
    {
      "id": "var-2",
      "text": "[Business Name]: Act now for better results"
    }
  ],
  "sampleSize": 0.5,
  "metrics": ["open_rate", "reply_rate"],
  "winnerStrategy": "combined_score",
  "duration": 7,
  "startDate": "2025-01-16"
}
```

**Response**:
```json
{
  "testId": "test-123",
  "status": "active",
  "leadsPerVariant": 250,
  "estimatedCompletion": "2025-01-23",
  "trackingUrls": {
    "var-1": "https://track.example.com/test-123/var-1",
    "var-2": "https://track.example.com/test-123/var-2"
  }
}
```

#### 3. Test Performance Data

**Endpoint**: `GET /api/ab-tests/:testId/performance`

**Response**:
```json
{
  "testId": "test-123",
  "status": "active",
  "progress": 0.5,
  "daysRemaining": 5,
  "variants": [
    {
      "id": "var-1",
      "text": "Quick win for [Business Name]'s visibility",
      "leadsTested": 250,
      "opens": 66,
      "openRate": 0.264,
      "replies": 23,
      "replyRate": 0.092,
      "score": 92,
      "status": "leading"
    },
    {
      "id": "var-2",
      "text": "[Business Name]: Act now for better results",
      "leadsTested": 250,
      "opens": 57,
      "openRate": 0.228,
      "replies": 18,
      "replyRate": 0.074,
      "score": 88,
      "status": "testing"
    }
  ],
  "statisticalSignificance": {
    "variantAvsB": {
      "confidence": 0.92,
      "significant": true,
      "pValue": 0.03
    }
  },
  "timeSeries": [
    {
      "date": "2025-01-16",
      "var-1": { "openRate": 0.20, "replyRate": 0.08 },
      "var-2": { "openRate": 0.18, "replyRate": 0.06 }
    },
    // ... more daily data
  ]
}
```

#### 4. Declare Winner

**Endpoint**: `POST /api/ab-tests/:testId/declare-winner`

**Request**:
```json
{
  "winnerId": "var-1",
  "applyToRemainingLeads": true
}
```

**Response**:
```json
{
  "testId": "test-123",
  "status": "completed",
  "winner": {
    "id": "var-1",
    "text": "Quick win for [Business Name]'s visibility",
    "finalScore": 92,
    "performance": {
      "openRate": 0.264,
      "replyRate": 0.092
    }
  },
  "addedToLibrary": true,
  "remainingLeadsUpdated": 500
}
```

#### 5. Subject Line Library Query

**Endpoint**: `GET /api/subject-lines/library`

**Query Parameters**:
- `industry`: Filter by industry (optional)
- `strategy`: Filter by strategy (optional)
- `performance`: Filter by performance tier (optional)
- `dateRange`: Filter by date range (optional)
- `search`: Search query (optional)
- `sort`: Sort order (optional)
- `limit`: Results per page (default 20)
- `offset`: Pagination offset (default 0)

**Response**:
```json
{
  "total": 127,
  "subjectLines": [
    {
      "id": "sl-1",
      "text": "Quick win for [Business Name]'s visibility",
      "score": 96,
      "strategies": ["curiosity", "personalization"],
      "performance": {
        "averageOpenRate": 0.284,
        "averageReplyRate": 0.118,
        "campaignsUsed": 3,
        "totalLeads": 1247,
        "winRate": 0.67
      },
      "bestPerformingIn": [
        { "industry": "restaurant", "openRate": 0.32 },
        { "industry": "retail", "openRate": 0.26 }
      ],
      "usageHistory": [
        {
          "campaignId": "camp-101",
          "date": "2025-01-10",
          "leads": 300,
          "wasWinner": false
        },
        {
          "campaignId": "camp-95",
          "date": "2024-12-28",
          "leads": 500,
          "wasWinner": true
        }
      ]
    },
    // ... more subject lines
  ]
}
```

#### 6. Export with Subject Lines

**Endpoint**: `POST /api/campaigns/:campaignId/export`

**Request**:
```json
{
  "format": "csv",
  "includeSubjectLines": true,
  "includeScores": true,
  "includeStrategies": true,
  "instantlyCompatible": true,
  "columns": [
    "business_name",
    "email",
    "phone",
    "subject_line",
    "subject_line_score",
    "icebreaker"
  ]
}
```

**Response**: CSV file download with configured columns

---

## Responsive Design

### Breakpoints

```css
/* Mobile First Approach */

/* Small devices (phones, 0-639px) */
@media (max-width: 639px) {
  /* Single column layout */
  /* Stack all components vertically */
  /* Full-width buttons */
  /* Simplified tables (card view) */
}

/* Medium devices (tablets, 640-1023px) */
@media (min-width: 640px) and (max-width: 1023px) {
  /* 2-column grid for cards */
  /* Collapsible sidebar for filters */
  /* Horizontal scrolling for tables */
}

/* Large devices (desktops, 1024px and up) */
@media (min-width: 1024px) {
  /* 3-4 column grid for cards */
  /* Fixed sidebar for filters */
  /* Full table view */
  /* Side-by-side comparisons */
}

/* Extra large devices (wide screens, 1536px and up) */
@media (min-width: 1536px) {
  /* 4-5 column grid */
  /* Enhanced data visualizations */
  /* Multi-panel layouts */
}
```

### Mobile Considerations

#### Subject Line Selector
- **Desktop**: Grid with 2-3 cards per row
- **Tablet**: 2 cards per row, collapsible details
- **Mobile**: Single column, compact cards, swipeable

#### A/B Test Configurator
- **Desktop**: Single-page form with all steps visible
- **Tablet**: Same as desktop with adjusted spacing
- **Mobile**: Multi-step wizard (one section at a time)

#### Performance Dashboard
- **Desktop**: Side-by-side comparison tables and charts
- **Tablet**: Stacked layout, horizontal scroll for tables
- **Mobile**: Card-based view, one variant at a time, simplified charts

#### Subject Line Library
- **Desktop**: Sidebar filters + 3-4 column grid
- **Tablet**: Collapsible filter drawer + 2 column grid
- **Mobile**: Bottom sheet filters + single column, search prominent

### Touch Optimization

- Minimum touch target: 44x44px (Apple HIG)
- Increased spacing between interactive elements on mobile
- Swipe gestures for navigation (cards, modals)
- Pull-to-refresh for live data updates
- Haptic feedback for important actions (declare winner, etc.)

### Typography

```css
/* Base scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Responsive scaling on mobile */
@media (max-width: 639px) {
  html {
    font-size: 14px; /* Base size reduced for small screens */
  }
}
```

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

#### 1. Perceivable

**Color Contrast**:
- Text: Minimum 4.5:1 contrast ratio
- Large text (18pt+): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio
- Score badges: Meet contrast requirements in all states

**Color Coding**:
- Never rely on color alone
- Use icons + color for status (✓, ⚠️, ❌)
- Add patterns/textures to charts for color-blind users
- Text labels on all data points

**Alternative Text**:
- All charts have data table alternatives
- Icons have aria-labels
- Images have descriptive alt text

#### 2. Operable

**Keyboard Navigation**:
- All interactive elements keyboard accessible
- Logical tab order throughout interface
- Visible focus indicators (blue outline, 2px)
- Skip links for repetitive navigation
- Keyboard shortcuts for common actions:
  - `Ctrl/Cmd + K`: Global search
  - `Ctrl/Cmd + N`: New test
  - `Ctrl/Cmd + E`: Export
  - `Esc`: Close modals

**Focus Management**:
- Focus trapped in modals
- Focus returns to trigger element on close
- Logical focus order in multi-step forms

**Time Limits**:
- No automatic timeouts on forms
- Ability to pause/stop/extend auto-updating data

#### 3. Understandable

**Clear Labels**:
- All form inputs have labels
- Placeholder text not used as labels
- Required fields marked with * and aria-required
- Error messages specific and actionable

**Error Handling**:
```html
<!-- Example: Form validation error -->
<div role="alert" aria-live="polite">
  <p>Please correct the following errors:</p>
  <ul>
    <li><a href="#test-name">Test name is required</a></li>
    <li><a href="#variants">Select at least 2 variants</a></li>
  </ul>
</div>
```

**Consistent Navigation**:
- Consistent placement of UI elements
- Predictable behavior of interactive components
- Clear indication of current page/section

#### 4. Robust

**Semantic HTML**:
```html
<!-- Use proper HTML5 elements -->
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<article>...</article>
<aside aria-label="Filters">...</aside>
```

**ARIA Labels**:
```html
<!-- Example: Score badge -->
<div
  class="score-badge"
  role="img"
  aria-label="Quality score: 92 out of 100, Excellent"
>
  <span aria-hidden="true">92</span>
  <span aria-hidden="true">⭐</span>
</div>

<!-- Example: Performance comparison -->
<table role="table" aria-label="Variant performance comparison">
  <caption>A/B test results for Q1 2025 campaign</caption>
  <thead>
    <tr>
      <th scope="col">Variant</th>
      <th scope="col">Open Rate</th>
      <th scope="col">Reply Rate</th>
    </tr>
  </thead>
  <tbody>
    <!-- ... rows ... -->
  </tbody>
</table>

<!-- Example: Chart alternative -->
<div class="chart-container">
  <canvas id="performance-chart" aria-label="Performance over time chart"></canvas>
  <details>
    <summary>View data table</summary>
    <table><!-- Accessible table of chart data --></table>
  </details>
</div>
```

**Screen Reader Announcements**:
```html
<!-- Live regions for dynamic updates -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
>
  Variant A is now leading with 26.4% open rate
</div>
```

### Screen Reader Testing

Test with:
- VoiceOver (macOS/iOS)
- NVDA (Windows)
- JAWS (Windows)
- TalkBack (Android)

### Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible on all focusable elements
- [ ] Color contrast meets WCAG AA standards
- [ ] Alternative text provided for all non-text content
- [ ] Forms have proper labels and error handling
- [ ] ARIA attributes used correctly
- [ ] Skip links provided for repetitive navigation
- [ ] Live regions for dynamic content updates
- [ ] No flashing content (seizure risk)
- [ ] Tested with screen readers
- [ ] Tested with keyboard only
- [ ] Tested with zoom up to 200%
- [ ] Works with browser accessibility features

---

## Technical Implementation Notes

### Technology Stack

**Recommended**:
- React 18+ (with TypeScript)
- Component library: Shadcn UI or Tailwind UI
- Charts: Recharts or Chart.js
- State management: React Query + Zustand
- Forms: React Hook Form + Zod validation
- Tables: TanStack Table
- Date pickers: React Day Picker

### Component Library Structure

```
src/components/
├── subject-lines/
│   ├── SubjectLineSelector/
│   │   ├── index.tsx
│   │   ├── VariantCard.tsx
│   │   ├── QualityScoreBadge.tsx
│   │   ├── PreviewModal.tsx
│   │   └── BulkActions.tsx
│   │
│   ├── ABTestConfigurator/
│   │   ├── index.tsx
│   │   ├── TestMetadataForm.tsx
│   │   ├── VariantSelector.tsx
│   │   ├── SampleSizeCalculator.tsx
│   │   ├── MetricsSelector.tsx
│   │   └── DurationPicker.tsx
│   │
│   ├── PerformanceDashboard/
│   │   ├── index.tsx
│   │   ├── TestOverview.tsx
│   │   ├── VariantComparison.tsx
│   │   ├── StatisticalSignificance.tsx
│   │   ├── TimeSeriesChart.tsx
│   │   └── WinnerDeclaration.tsx
│   │
│   ├── SubjectLineLibrary/
│   │   ├── index.tsx
│   │   ├── LibrarySearch.tsx
│   │   ├── PerformanceCard.tsx
│   │   ├── CategoryFilter.tsx
│   │   └── CopyActions.tsx
│   │
│   └── QualityScoringDisplay/
│       ├── index.tsx
│       ├── OverallScoreMeter.tsx
│       ├── ComponentBreakdown.tsx
│       ├── ImprovementSuggestions.tsx
│       └── SpamRiskWarning.tsx
│
└── shared/
    ├── Button/
    ├── Card/
    ├── Modal/
    ├── Table/
    └── Chart/
```

### State Management

**Global State** (Zustand):
```typescript
interface SubjectLineStore {
  // Current test state
  activeTest: ABTest | null;
  setActiveTest: (test: ABTest) => void;

  // Library state
  library: SubjectLine[];
  filters: LibraryFilters;
  setFilters: (filters: LibraryFilters) => void;

  // UI state
  selectedVariants: string[];
  toggleVariant: (variantId: string) => void;
  clearSelection: () => void;
}
```

**Server State** (React Query):
```typescript
// Fetch test performance
const { data: performance, isLoading } = useQuery({
  queryKey: ['ab-test', testId, 'performance'],
  queryFn: () => fetchTestPerformance(testId),
  refetchInterval: 60000, // Refresh every minute
});

// Create test mutation
const createTest = useMutation({
  mutationFn: (config: ABTestConfig) => createABTest(config),
  onSuccess: (data) => {
    queryClient.invalidateQueries(['ab-tests']);
    router.push(`/tests/${data.testId}`);
  },
});
```

### Performance Optimizations

**Lazy Loading**:
```typescript
// Lazy load heavy components
const PerformanceDashboard = lazy(() => import('./PerformanceDashboard'));
const SubjectLineLibrary = lazy(() => import('./SubjectLineLibrary'));
```

**Virtualization**:
```typescript
// Use virtual scrolling for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

// In SubjectLineLibrary with 1000+ items
const rowVirtualizer = useVirtualizer({
  count: filteredSubjectLines.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // Estimated card height
});
```

**Memoization**:
```typescript
// Expensive calculations
const statisticalSignificance = useMemo(() => {
  return calculateSignificance(variantA, variantB);
}, [variantA, variantB]);

// Chart data transformation
const chartData = useMemo(() => {
  return formatTimeSeriesData(rawData);
}, [rawData]);
```

### Real-Time Updates

**WebSocket Connection** (for live test data):
```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:5001/tests/live');

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    queryClient.setQueryData(['ab-test', update.testId], (old) => ({
      ...old,
      ...update,
    }));
  };

  return () => ws.close();
}, [testId]);
```

### Testing Strategy

**Unit Tests** (Jest + React Testing Library):
```typescript
describe('QualityScoreBadge', () => {
  it('renders excellent badge for score >= 90', () => {
    render(<QualityScoreBadge score={92} />);
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByLabelText(/excellent/i)).toBeInTheDocument();
  });

  it('applies correct color for score range', () => {
    const { container } = render(<QualityScoreBadge score={85} />);
    expect(container.firstChild).toHaveClass('bg-blue-500');
  });
});
```

**Integration Tests**:
```typescript
describe('A/B Test Creation Flow', () => {
  it('allows user to create test with valid config', async () => {
    const user = userEvent.setup();
    render(<ABTestConfigurator />);

    // Fill in test name
    await user.type(
      screen.getByLabelText(/test name/i),
      'Q1 2025 Test'
    );

    // Select variants
    await user.click(screen.getByLabelText(/variant a/i));
    await user.click(screen.getByLabelText(/variant b/i));

    // Configure sample size
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: 50 } });

    // Launch test
    await user.click(screen.getByRole('button', { name: /launch test/i }));

    // Verify API call
    await waitFor(() => {
      expect(mockCreateTest).toHaveBeenCalledWith({
        name: 'Q1 2025 Test',
        variants: expect.any(Array),
        sampleSize: 0.5,
        // ...
      });
    });
  });
});
```

**E2E Tests** (Playwright):
```typescript
test('complete A/B test workflow', async ({ page }) => {
  // Navigate to campaigns
  await page.goto('/campaigns');

  // Create campaign
  await page.click('text=New Campaign');
  // ... fill campaign details ...

  // Generate subject lines
  await page.click('text=Generate Subject Lines');
  await page.waitForSelector('[data-testid="variant-card"]');

  // Setup A/B test
  await page.click('text=Setup A/B Test');
  await page.fill('[name="testName"]', 'E2E Test');
  await page.check('[data-variant-id="var-1"]');
  await page.check('[data-variant-id="var-2"]');
  await page.click('text=Launch Test');

  // Verify test created
  await expect(page.locator('text=Test created successfully')).toBeVisible();

  // Navigate to dashboard
  await page.click('text=View Dashboard');
  await expect(page.locator('h1:has-text("E2E Test")')).toBeVisible();
});
```

### Analytics Integration

Track user interactions for UX improvements:

```typescript
// Track component usage
analytics.track('Subject Line Selected', {
  variantId: variant.id,
  score: variant.score,
  strategy: variant.strategies,
  selectionMethod: 'manual', // or 'auto'
});

analytics.track('A/B Test Created', {
  variantCount: config.variants.length,
  sampleSize: config.sampleSize,
  metrics: config.metrics,
  duration: config.duration,
});

analytics.track('Winner Declared', {
  testId: test.id,
  confidence: significance.confidence,
  improvement: calculateImprovement(winner, loser),
  daysToSignificance: test.durationDays,
});
```

---

## Implementation Priority

### Phase 1: MVP (Week 1-2)
1. SubjectLineSelector component
2. QualityScoreBadge display
3. Basic CSV export with subject lines
4. API integration for generation

### Phase 2: Testing (Week 3-4)
1. ABTestConfigurator (all steps)
2. PerformanceDashboard (basic view)
3. Database schema for tests
4. Statistical significance calculation

### Phase 3: Library & Polish (Week 5-6)
1. SubjectLineLibrary with filtering
2. Detailed performance tracking
3. Advanced visualizations
4. Responsive design refinements

### Phase 4: Enhancement (Week 7-8)
1. Real-time updates via WebSocket
2. Instantly.ai direct integration
3. Advanced analytics
4. Accessibility audit and fixes

---

## Design System

### Color Palette

```css
/* Primary Brand Colors */
--color-primary-50: #eff6ff;
--color-primary-500: #3b82f6;  /* Main brand blue */
--color-primary-700: #1d4ed8;

/* Semantic Colors */
--color-success-500: #10b981;  /* Green - Excellent scores, winning variants */
--color-warning-500: #f59e0b;  /* Amber - Fair scores, warnings */
--color-error-500: #ef4444;    /* Red - Poor scores, critical issues */
--color-info-500: #3b82f6;     /* Blue - Good scores, informational */

/* Neutral Colors */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-500: #6b7280;
--color-gray-900: #111827;
```

### Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

### Border Radius

```css
--radius-sm: 0.125rem;  /* 2px */
--radius-base: 0.25rem; /* 4px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-full: 9999px;  /* Fully rounded */
```

---

## Conclusion

This specification provides a comprehensive blueprint for implementing subject line management and A/B testing UI/UX. The design prioritizes:

1. **Ease of Use**: Simple defaults with progressive disclosure for advanced features
2. **Data-Driven**: Statistical significance and quality scores prominently displayed
3. **Visual Clarity**: Color-coded indicators, clear typography, organized layouts
4. **Responsiveness**: Mobile-first design that adapts across devices
5. **Accessibility**: WCAG 2.1 AA compliant with semantic HTML and ARIA labels
6. **Performance**: Optimized loading, caching, and real-time updates

Implementation should follow the phased approach, starting with MVP components and progressively adding advanced features based on user feedback and analytics.

---

## Appendix: Wireframe ASCII Art

### Subject Line Selector (Mobile View)

```
┌─────────────────────────┐
│ Subject Line Variants   │
├─────────────────────────┤
│                         │
│ ┌──────────────────────┐│
│ │  92 ⭐               ││
│ │                      ││
│ │  Quick win for       ││
│ │  [Business]'s        ││
│ │  visibility          ││
│ │                      ││
│ │  📊 Curiosity +      ││
│ │     Personalization  ││
│ │                      ││
│ │ [Select] [Preview]   ││
│ └──────────────────────┘│
│                         │
│ ┌──────────────────────┐│
│ │  88 ✓                ││
│ │                      ││
│ │  [Business]: Act now ││
│ │  for better results  ││
│ │                      ││
│ │  📊 Urgency +        ││
│ │     Personalization  ││
│ │                      ││
│ │ [Select] [Preview]   ││
│ └──────────────────────┘│
│                         │
│   < Swipe for more >    │
│                         │
│ [Use Best] [Setup Test] │
└─────────────────────────┘
```

### Performance Dashboard (Desktop View)

```
┌────────────────────────────────────────────────────────────────┐
│ ← Back        Q1 2025 Local Business Outreach     [Stop Test] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Progress: [━━━━━━━━━━━━━━░░░░░░] 50%      5 days remaining    │
│                                                                │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│ │ Open Rate    │  │ Reply Rate   │  │ Confidence   │         │
│ │   24.5%      │  │    8.2%      │  │    92%       │         │
│ │  ↑ +3.2%     │  │  ↑ +1.8%     │  │   HIGH       │         │
│ └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ Variant Performance                                        ││
│ ├────────────────────────────────────────────────────────────┤│
│ │ Variant │ Leads │ Opens │ Replies │ Score │ Status        ││
│ │─────────┼───────┼───────┼─────────┼───────┼───────────────┤│
│ │ 🟢 A    │  250  │ 26.4% │   9.2%  │  92   │ LEADING ⭐    ││
│ │ Quick win for [Business Name]'s visibility                ││
│ │                                                            ││
│ │ 🟡 B    │  250  │ 22.8% │   7.4%  │  88   │ TESTING       ││
│ │ [Business Name]: Act now for better results               ││
│ └────────────────────────────────────────────────────────────┘│
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ Performance Over Time                                      ││
│ │                                                            ││
│ │  30% │                         ●                           ││
│ │      │                     ●       ●                       ││
│ │  25% │         ●       ●               ● (Variant A)       ││
│ │      │     ●       ○       ○       ○       ○ (Variant B)   ││
│ │  20% │                                                     ││
│ │      └──────────────────────────────────────────────       ││
│ │       Jan 16   17     18     19     20                     ││
│ └────────────────────────────────────────────────────────────┘│
│                                                                │
│ 💡 Insight: Variant A shows consistently higher performance   │
│                                                                │
│ [Export Results]                  [Declare Winner →]          │
└────────────────────────────────────────────────────────────────┘
```

---

**End of Specification**
