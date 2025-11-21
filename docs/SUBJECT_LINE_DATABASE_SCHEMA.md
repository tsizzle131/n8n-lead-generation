# Subject Line Database Schema Design

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Status:** Complete Design Specification

---

## Executive Summary

This document defines the complete database schema for the subject line system, supporting multi-variant A/B testing, performance tracking, quality scoring, and continuous optimization. The design integrates seamlessly with the existing `gmaps_businesses` table while providing comprehensive analytics capabilities.

**Key Features:**
- Multi-variant storage (3-5 subject line options per lead)
- A/B test tracking and performance metrics
- Quality score history with component breakdowns
- Psychological strategy tracking
- Campaign-level analytics and comparisons
- Backward-compatible migration strategy

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Definitions](#table-definitions)
4. [Indexes and Performance](#indexes-and-performance)
5. [Foreign Key Relationships](#foreign-key-relationships)
6. [Migration Strategy](#migration-strategy)
7. [Example Queries](#example-queries)
8. [Integration Points](#integration-points)
9. [Performance Considerations](#performance-considerations)
10. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### Design Principles

1. **Backward Compatible**: Existing `gmaps_businesses` table enhanced, not replaced
2. **Performance Optimized**: Strategic indexes for analytics queries
3. **Flexible Testing**: Support for 2-5 variants per lead
4. **Historical Tracking**: Complete audit trail of all generated content
5. **Analytics-Ready**: Designed for real-time performance dashboards

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                    SUBJECT LINE SYSTEM                       │
└──────────────────────────────────────────────────────────────┘

┌────────────────────┐
│ gmaps_businesses   │ ◄─── Enhanced (backward compatible)
│ (existing table)   │      • subject_line (VARCHAR)
└────────────────────┘      • subject_line_variants (JSONB)
         │                  • subject_line_variant_used (CHAR)
         │                  • subject_line_approach (VARCHAR)
         │                  • subject_line_quality_score (DECIMAL)
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌────────────────┐   ┌───────────────────┐
│ subject_line_  │   │ subject_line_     │
│ variants       │   │ performance       │
│ (all options)  │   │ (metrics)         │
└────────────────┘   └───────────────────┘
         │                  │
         │                  │
         ▼                  ▼
┌────────────────┐   ┌───────────────────┐
│ subject_line_  │   │ subject_line_     │
│ tests          │   │ test_results      │
│ (A/B configs)  │   │ (test outcomes)   │
└────────────────┘   └───────────────────┘
         │
         ▼
┌────────────────┐
│ subject_line_  │
│ quality_scores │
│ (score detail) │
└────────────────┘
```

---

## Entity Relationship Diagram

### Core Relationships

```
gmaps_campaigns (existing)
    ||
    || 1:N
    ||
    ▼▼
gmaps_businesses (existing, enhanced)
    ||
    || 1:N                    1:N ||
    ||                            ||
    ▼▼                            ▼▼
subject_line_variants ───────► subject_line_quality_scores
    ||                            (detailed scoring)
    || N:1
    ||
    ▼▼
subject_line_tests ────────► subject_line_test_results
(A/B test configs)            (test outcomes)
    ||
    || 1:N
    ||
    ▼▼
subject_line_performance
(opens, clicks, replies)


DETAILED RELATIONSHIPS:
═══════════════════════

1. gmaps_businesses (1) ──< (N) subject_line_variants
   Each business can have 1-5 variant subject lines

2. subject_line_variants (1) ──< (N) subject_line_quality_scores
   Each variant has detailed quality scoring

3. subject_line_tests (1) ──< (N) gmaps_businesses
   Each test can include multiple businesses

4. subject_line_tests (1) ──< (1) subject_line_test_results
   Each test has one summary result record

5. gmaps_businesses (1) ──< (N) subject_line_performance
   Each business can have multiple performance records (resend tracking)
```

### Cardinality Details

| Relationship | Type | Description |
|-------------|------|-------------|
| Campaign → Business | 1:N | One campaign has many businesses |
| Business → Variants | 1:N | One business has 1-5 subject line variants |
| Variant → Quality Score | 1:1 | Each variant has one quality score record |
| Business → Performance | 1:N | One business tracks performance per send |
| Test → Businesses | 1:N | One test includes many businesses |
| Test → Test Results | 1:1 | Each test has one results summary |

---

## Table Definitions

### 1. Enhanced `gmaps_businesses` Table

**Purpose:** Extend existing business table with subject line tracking fields

```sql
-- Enhancement to existing gmaps_businesses table
ALTER TABLE public.gmaps_businesses
ADD COLUMN IF NOT EXISTS subject_line_variants JSONB,
ADD COLUMN IF NOT EXISTS subject_line_variant_used CHAR(1),
ADD COLUMN IF NOT EXISTS subject_line_approach VARCHAR(50),
ADD COLUMN IF NOT EXISTS subject_line_quality_score DECIMAL(4,3);

-- Comments
COMMENT ON COLUMN public.gmaps_businesses.subject_line_variants IS
  'JSON array of all generated subject line variants with metadata';

COMMENT ON COLUMN public.gmaps_businesses.subject_line_variant_used IS
  'Which variant (A, B, C, D, E) was selected for sending';

COMMENT ON COLUMN public.gmaps_businesses.subject_line_approach IS
  'Psychological strategy used: question, observation, direct, connection, social_proof';

COMMENT ON COLUMN public.gmaps_businesses.subject_line_quality_score IS
  'Overall quality score (0.000-1.000) from scoring system';
```

**Example `subject_line_variants` JSON:**
```json
[
  {
    "variant_id": "A",
    "subject_line": "Quick question about Acme Corp's growth",
    "approach": "question",
    "length": 43,
    "quality_score": 0.850,
    "generated_at": "2025-10-16T10:30:00Z",
    "spam_risk_score": 0.95,
    "personalization_level": "high"
  },
  {
    "variant_id": "B",
    "subject_line": "Noticed Acme Corp's expansion into Austin",
    "approach": "observation",
    "length": 42,
    "quality_score": 0.820,
    "generated_at": "2025-10-16T10:30:05Z",
    "spam_risk_score": 0.98,
    "personalization_level": "medium"
  },
  {
    "variant_id": "C",
    "subject_line": "Acme Corp + automation opportunity?",
    "approach": "connection",
    "length": 37,
    "quality_score": 0.775,
    "generated_at": "2025-10-16T10:30:10Z",
    "spam_risk_score": 0.90,
    "personalization_level": "medium"
  }
]
```

**Field Details:**

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `subject_line_variants` | JSONB | YES | NULL | Array of all generated variants with metadata |
| `subject_line_variant_used` | CHAR(1) | YES | NULL | A, B, C, D, or E - which variant was sent |
| `subject_line_approach` | VARCHAR(50) | YES | NULL | Psychological strategy category |
| `subject_line_quality_score` | DECIMAL(4,3) | YES | NULL | Overall quality score (0.000-1.000) |

**Existing Fields Used:**
- `subject_line` (VARCHAR) - The actual subject line sent
- `icebreaker` (TEXT) - Paired icebreaker message
- `icebreaker_generated_at` (TIMESTAMPTZ) - Generation timestamp

---

### 2. `subject_line_variants` Table

**Purpose:** Store all generated subject line variants with full metadata

```sql
CREATE TABLE public.subject_line_variants (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,

  -- Variant Identification
  variant_id CHAR(1) NOT NULL CHECK (variant_id IN ('A', 'B', 'C', 'D', 'E')),

  -- Content
  subject_line VARCHAR(255) NOT NULL,
  icebreaker TEXT,

  -- Strategy & Approach
  approach VARCHAR(50) NOT NULL,
  psychological_strategy VARCHAR(100),

  -- Quality Metrics
  quality_score DECIMAL(4,3),
  length_chars INTEGER NOT NULL,
  personalization_level VARCHAR(20) CHECK (personalization_level IN ('none', 'low', 'medium', 'high')),

  -- Spam & Validation
  spam_risk_score DECIMAL(4,3),
  spam_triggers JSONB,
  validation_passed BOOLEAN DEFAULT TRUE,
  validation_issues JSONB,

  -- Generation Metadata
  model_used VARCHAR(50),
  temperature DECIMAL(3,2),
  prompt_version VARCHAR(20),
  generation_cost_usd DECIMAL(8,4),
  generation_duration_ms INTEGER,

  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(business_id, variant_id)
);

-- Indexes
CREATE INDEX idx_subject_variants_business ON subject_line_variants(business_id);
CREATE INDEX idx_subject_variants_campaign ON subject_line_variants(campaign_id);
CREATE INDEX idx_subject_variants_approach ON subject_line_variants(approach);
CREATE INDEX idx_subject_variants_quality ON subject_line_variants(quality_score DESC);
CREATE INDEX idx_subject_variants_generated ON subject_line_variants(generated_at DESC);

-- GIN index for JSONB spam_triggers
CREATE INDEX idx_subject_variants_spam_triggers ON subject_line_variants USING GIN(spam_triggers);

-- Comments
COMMENT ON TABLE public.subject_line_variants IS
  'Stores all generated subject line variants for A/B testing with complete metadata';

COMMENT ON COLUMN public.subject_line_variants.psychological_strategy IS
  'Specific strategy: curiosity, urgency, social_proof, reciprocity, authority, personalization';

COMMENT ON COLUMN public.subject_line_variants.spam_triggers IS
  'JSON array of any spam trigger words detected with severity levels';

COMMENT ON COLUMN public.subject_line_variants.validation_issues IS
  'JSON array of validation problems found (length, encoding, etc.)';
```

**Field Details:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique variant identifier |
| `business_id` | UUID | FK, NOT NULL | Links to gmaps_businesses |
| `campaign_id` | UUID | FK | Links to gmaps_campaigns |
| `variant_id` | CHAR(1) | A-E, NOT NULL | Variant letter |
| `subject_line` | VARCHAR(255) | NOT NULL | The actual subject line text |
| `icebreaker` | TEXT | - | Paired icebreaker message |
| `approach` | VARCHAR(50) | NOT NULL | question, observation, direct, connection |
| `psychological_strategy` | VARCHAR(100) | - | curiosity, urgency, social_proof, etc. |
| `quality_score` | DECIMAL(4,3) | 0.000-1.000 | Overall quality score |
| `length_chars` | INTEGER | NOT NULL | Character count |
| `personalization_level` | VARCHAR(20) | none/low/medium/high | Degree of personalization |
| `spam_risk_score` | DECIMAL(4,3) | 0.000-1.000 | Inverse of spam risk |
| `spam_triggers` | JSONB | - | Array of detected triggers |
| `validation_passed` | BOOLEAN | DEFAULT TRUE | Passed all checks? |
| `validation_issues` | JSONB | - | Array of validation problems |
| `model_used` | VARCHAR(50) | - | AI model (e.g., gpt-4-turbo) |
| `temperature` | DECIMAL(3,2) | - | AI temperature setting |
| `prompt_version` | VARCHAR(20) | - | Prompt version used |
| `generation_cost_usd` | DECIMAL(8,4) | - | API cost in USD |
| `generation_duration_ms` | INTEGER | - | Generation time in ms |

---

### 3. `subject_line_quality_scores` Table

**Purpose:** Store detailed quality scoring breakdown for each variant

```sql
CREATE TABLE public.subject_line_quality_scores (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  variant_id UUID NOT NULL REFERENCES subject_line_variants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,

  -- Overall Score
  overall_score DECIMAL(4,3) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
  grade VARCHAR(3) NOT NULL CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F')),
  is_acceptable BOOLEAN NOT NULL DEFAULT TRUE,

  -- Dimension Scores (0.000-1.000 scale)
  length_score DECIMAL(4,3),
  personalization_score DECIMAL(4,3),
  curiosity_score DECIMAL(4,3),
  spam_risk_score DECIMAL(4,3),
  clarity_score DECIMAL(4,3),
  action_score DECIMAL(4,3),

  -- Detailed Analysis
  has_name BOOLEAN,
  has_company BOOLEAN,
  has_question BOOLEAN,
  word_count INTEGER,
  vague_words_count INTEGER,
  spam_triggers_count INTEGER,

  -- Recommendations
  recommendations JSONB,
  improvement_suggestions JSONB,

  -- Scoring Metadata
  scoring_version VARCHAR(20),
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(variant_id)
);

-- Indexes
CREATE INDEX idx_quality_scores_variant ON subject_line_quality_scores(variant_id);
CREATE INDEX idx_quality_scores_business ON subject_line_quality_scores(business_id);
CREATE INDEX idx_quality_scores_overall ON subject_line_quality_scores(overall_score DESC);
CREATE INDEX idx_quality_scores_grade ON subject_line_quality_scores(grade);
CREATE INDEX idx_quality_scores_acceptable ON subject_line_quality_scores(is_acceptable);

-- GIN index for recommendations
CREATE INDEX idx_quality_scores_recommendations ON subject_line_quality_scores USING GIN(recommendations);

-- Comments
COMMENT ON TABLE public.subject_line_quality_scores IS
  'Detailed quality scoring breakdown for subject line variants';

COMMENT ON COLUMN public.subject_line_quality_scores.recommendations IS
  'JSON array of actionable recommendations for improvement';

COMMENT ON COLUMN public.subject_line_quality_scores.scoring_version IS
  'Version of scoring algorithm used (for historical comparison)';
```

**Field Details:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique score identifier |
| `variant_id` | UUID | FK, UNIQUE, NOT NULL | Links to subject_line_variants |
| `business_id` | UUID | FK, NOT NULL | Links to gmaps_businesses |
| `overall_score` | DECIMAL(4,3) | 0.000-1.000, NOT NULL | Weighted average score |
| `grade` | VARCHAR(3) | A+ to F, NOT NULL | Letter grade |
| `is_acceptable` | BOOLEAN | NOT NULL, DEFAULT TRUE | Meets minimum threshold? |
| `length_score` | DECIMAL(4,3) | 0.000-1.000 | Optimal length score |
| `personalization_score` | DECIMAL(4,3) | 0.000-1.000 | Name/company usage score |
| `curiosity_score` | DECIMAL(4,3) | 0.000-1.000 | Curiosity generation score |
| `spam_risk_score` | DECIMAL(4,3) | 0.000-1.000 | Anti-spam score (higher = safer) |
| `clarity_score` | DECIMAL(4,3) | 0.000-1.000 | Vagueness avoidance score |
| `action_score` | DECIMAL(4,3) | 0.000-1.000 | Action word presence score |
| `has_name` | BOOLEAN | - | Contains recipient first name? |
| `has_company` | BOOLEAN | - | Contains company name? |
| `has_question` | BOOLEAN | - | Contains question mark? |
| `word_count` | INTEGER | - | Number of words |
| `vague_words_count` | INTEGER | - | Count of vague words |
| `spam_triggers_count` | INTEGER | - | Number of spam triggers found |
| `recommendations` | JSONB | - | Array of improvement suggestions |
| `scoring_version` | VARCHAR(20) | - | Scoring algorithm version |

**Example `recommendations` JSON:**
```json
[
  {
    "dimension": "personalization",
    "severity": "medium",
    "message": "Consider adding recipient's first name",
    "example": "Mike, quick question about GrowthLab"
  },
  {
    "dimension": "length",
    "severity": "low",
    "message": "Subject is slightly long for mobile",
    "example": "Trim to 45 characters or less"
  }
]
```

---

### 4. `subject_line_tests` Table

**Purpose:** Define A/B test configurations for campaigns

```sql
CREATE TABLE public.subject_line_tests (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  campaign_id UUID NOT NULL REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,

  -- Test Configuration
  test_name VARCHAR(255) NOT NULL,
  test_description TEXT,
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('ab', 'abc', 'abcd', 'abcde', 'multivariate')),

  -- Hypothesis
  hypothesis TEXT,
  expected_winner CHAR(1),

  -- Variant Configuration
  variant_count INTEGER NOT NULL CHECK (variant_count BETWEEN 2 AND 5),
  variant_distribution JSONB, -- e.g., {"A": 0.25, "B": 0.25, "C": 0.25, "D": 0.25}

  -- Test Parameters
  approach_a VARCHAR(50),
  approach_b VARCHAR(50),
  approach_c VARCHAR(50),
  approach_d VARCHAR(50),
  approach_e VARCHAR(50),

  -- Sample Size
  target_sample_size INTEGER,
  actual_sample_size INTEGER DEFAULT 0,
  min_sample_per_variant INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

  -- Statistical Thresholds
  confidence_level DECIMAL(3,2) DEFAULT 0.95,
  minimum_effect_size DECIMAL(4,3) DEFAULT 0.050,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results Summary (populated after completion)
  winning_variant CHAR(1),
  statistical_significance BOOLEAN,
  p_value DECIMAL(6,5),

  -- Metadata
  created_by VARCHAR(255),
  notes TEXT
);

-- Indexes
CREATE INDEX idx_subject_tests_campaign ON subject_line_tests(campaign_id);
CREATE INDEX idx_subject_tests_status ON subject_line_tests(status);
CREATE INDEX idx_subject_tests_started ON subject_line_tests(started_at DESC);
CREATE INDEX idx_subject_tests_completed ON subject_line_tests(completed_at DESC);

-- Comments
COMMENT ON TABLE public.subject_line_tests IS
  'A/B test configurations for subject line optimization';

COMMENT ON COLUMN public.subject_line_tests.variant_distribution IS
  'JSON object specifying percentage allocation per variant';

COMMENT ON COLUMN public.subject_line_tests.confidence_level IS
  'Required confidence level for statistical significance (typically 0.95)';
```

**Field Details:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique test identifier |
| `campaign_id` | UUID | FK, NOT NULL | Links to gmaps_campaigns |
| `test_name` | VARCHAR(255) | NOT NULL | Descriptive test name |
| `test_type` | VARCHAR(50) | ab/abc/etc., NOT NULL | Number of variants |
| `hypothesis` | TEXT | - | What are we testing? |
| `expected_winner` | CHAR(1) | A-E | Predicted best variant |
| `variant_count` | INTEGER | 2-5, NOT NULL | How many variants |
| `variant_distribution` | JSONB | - | Traffic split percentages |
| `approach_a` through `approach_e` | VARCHAR(50) | - | Strategy per variant |
| `target_sample_size` | INTEGER | - | Desired total sends |
| `actual_sample_size` | INTEGER | DEFAULT 0 | Actual sends completed |
| `status` | VARCHAR(20) | NOT NULL | draft/active/completed/cancelled |
| `confidence_level` | DECIMAL(3,2) | DEFAULT 0.95 | Statistical threshold |
| `winning_variant` | CHAR(1) | A-E | Results after completion |
| `statistical_significance` | BOOLEAN | - | Did we reach significance? |
| `p_value` | DECIMAL(6,5) | - | Statistical p-value |

---

### 5. `subject_line_performance` Table

**Purpose:** Track email performance metrics per subject line send

```sql
CREATE TABLE public.subject_line_performance (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES subject_line_variants(id) ON DELETE SET NULL,
  test_id UUID REFERENCES subject_line_tests(id) ON DELETE SET NULL,

  -- Identification
  variant_letter CHAR(1) CHECK (variant_letter IN ('A', 'B', 'C', 'D', 'E')),
  approach VARCHAR(50),
  subject_line TEXT NOT NULL,
  icebreaker TEXT,

  -- Send Information
  sent_at TIMESTAMPTZ,
  send_method VARCHAR(50), -- 'instantly', 'smartlead', 'manual', etc.
  recipient_email VARCHAR(255),

  -- Engagement Metrics
  opened_at TIMESTAMPTZ,
  first_click_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  spam_reported_at TIMESTAMPTZ,

  -- Calculated Rates (for quick queries)
  is_opened BOOLEAN DEFAULT FALSE,
  is_clicked BOOLEAN DEFAULT FALSE,
  is_replied BOOLEAN DEFAULT FALSE,
  is_bounced BOOLEAN DEFAULT FALSE,
  is_unsubscribed BOOLEAN DEFAULT FALSE,
  is_spam_reported BOOLEAN DEFAULT FALSE,

  -- Time to Action (in seconds)
  time_to_open_seconds INTEGER,
  time_to_click_seconds INTEGER,
  time_to_reply_seconds INTEGER,

  -- Device & Client Info
  open_device VARCHAR(50), -- 'mobile', 'desktop', 'tablet', 'unknown'
  open_email_client VARCHAR(100), -- 'Gmail', 'Outlook', 'Apple Mail', etc.
  open_location VARCHAR(100), -- City/Country if available

  -- Metadata
  tracking_id VARCHAR(255), -- External tracking ID from email service
  raw_events JSONB, -- Raw event data from email service
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance queries
CREATE INDEX idx_perf_business ON subject_line_performance(business_id);
CREATE INDEX idx_perf_campaign ON subject_line_performance(campaign_id);
CREATE INDEX idx_perf_variant ON subject_line_performance(variant_id);
CREATE INDEX idx_perf_test ON subject_line_performance(test_id);
CREATE INDEX idx_perf_sent ON subject_line_performance(sent_at DESC);

-- Indexes for engagement queries
CREATE INDEX idx_perf_opened ON subject_line_performance(is_opened, opened_at DESC);
CREATE INDEX idx_perf_clicked ON subject_line_performance(is_clicked, first_click_at DESC);
CREATE INDEX idx_perf_replied ON subject_line_performance(is_replied, replied_at DESC);

-- Index for approach-based analytics
CREATE INDEX idx_perf_approach ON subject_line_performance(approach);
CREATE INDEX idx_perf_variant_letter ON subject_line_performance(variant_letter);

-- Composite index for test analysis
CREATE INDEX idx_perf_test_variant ON subject_line_performance(test_id, variant_letter);

-- GIN index for raw_events
CREATE INDEX idx_perf_raw_events ON subject_line_performance USING GIN(raw_events);

-- Comments
COMMENT ON TABLE public.subject_line_performance IS
  'Tracks email performance metrics for subject lines sent to recipients';

COMMENT ON COLUMN public.subject_line_performance.raw_events IS
  'JSON array of all tracking events from email service provider';

COMMENT ON COLUMN public.subject_line_performance.time_to_open_seconds IS
  'Seconds between sent_at and opened_at (for engagement speed analysis)';
```

**Field Details:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique performance record |
| `business_id` | UUID | FK, NOT NULL | Links to gmaps_businesses |
| `campaign_id` | UUID | FK, NOT NULL | Links to gmaps_campaigns |
| `variant_id` | UUID | FK | Links to subject_line_variants |
| `test_id` | UUID | FK | Links to subject_line_tests |
| `variant_letter` | CHAR(1) | A-E | Which variant was sent |
| `approach` | VARCHAR(50) | - | Psychological approach used |
| `subject_line` | TEXT | NOT NULL | Exact subject sent |
| `sent_at` | TIMESTAMPTZ | - | When email was sent |
| `opened_at` | TIMESTAMPTZ | - | When email was opened |
| `first_click_at` | TIMESTAMPTZ | - | When first link clicked |
| `replied_at` | TIMESTAMPTZ | - | When reply received |
| `bounced_at` | TIMESTAMPTZ | - | When bounce occurred |
| `is_opened` | BOOLEAN | DEFAULT FALSE | Quick flag for queries |
| `is_clicked` | BOOLEAN | DEFAULT FALSE | Quick flag for queries |
| `is_replied` | BOOLEAN | DEFAULT FALSE | Quick flag for queries |
| `time_to_open_seconds` | INTEGER | - | Speed to open (engagement quality) |
| `open_device` | VARCHAR(50) | - | Mobile/desktop/tablet |
| `open_email_client` | VARCHAR(100) | - | Gmail/Outlook/Apple Mail |
| `raw_events` | JSONB | - | All tracking events JSON |

---

### 6. `subject_line_test_results` Table

**Purpose:** Store aggregated A/B test results and statistical analysis

```sql
CREATE TABLE public.subject_line_test_results (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  test_id UUID NOT NULL UNIQUE REFERENCES subject_line_tests(id) ON DELETE CASCADE,

  -- Test Completion
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_duration_hours DECIMAL(10,2),

  -- Sample Sizes
  total_sent INTEGER NOT NULL,
  variant_a_sent INTEGER,
  variant_b_sent INTEGER,
  variant_c_sent INTEGER,
  variant_d_sent INTEGER,
  variant_e_sent INTEGER,

  -- Open Rates
  variant_a_open_rate DECIMAL(5,2),
  variant_b_open_rate DECIMAL(5,2),
  variant_c_open_rate DECIMAL(5,2),
  variant_d_open_rate DECIMAL(5,2),
  variant_e_open_rate DECIMAL(5,2),

  -- Click Rates
  variant_a_click_rate DECIMAL(5,2),
  variant_b_click_rate DECIMAL(5,2),
  variant_c_click_rate DECIMAL(5,2),
  variant_d_click_rate DECIMAL(5,2),
  variant_e_click_rate DECIMAL(5,2),

  -- Reply Rates
  variant_a_reply_rate DECIMAL(5,2),
  variant_b_reply_rate DECIMAL(5,2),
  variant_c_reply_rate DECIMAL(5,2),
  variant_d_reply_rate DECIMAL(5,2),
  variant_e_reply_rate DECIMAL(5,2),

  -- Statistical Analysis
  winning_variant CHAR(1) NOT NULL,
  runner_up_variant CHAR(1),

  statistical_significance BOOLEAN NOT NULL,
  p_value DECIMAL(6,5),
  confidence_level DECIMAL(5,4),

  improvement_percentage DECIMAL(6,2),
  absolute_difference DECIMAL(5,2),

  -- Detailed Stats (JSONB for flexibility)
  chi_square_results JSONB,
  variant_comparisons JSONB, -- Pairwise comparison results

  -- Conclusions
  conclusion TEXT,
  key_learnings JSONB,
  recommendation TEXT,

  -- Follow-up
  should_implement BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMPTZ,

  -- Metadata
  analyzed_by VARCHAR(255),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_test_results_test ON subject_line_test_results(test_id);
CREATE INDEX idx_test_results_completed ON subject_line_test_results(completed_at DESC);
CREATE INDEX idx_test_results_winning ON subject_line_test_results(winning_variant);
CREATE INDEX idx_test_results_significant ON subject_line_test_results(statistical_significance);

-- Comments
COMMENT ON TABLE public.subject_line_test_results IS
  'Aggregated A/B test results with statistical analysis';

COMMENT ON COLUMN public.subject_line_test_results.chi_square_results IS
  'Chi-square test results for statistical significance';

COMMENT ON COLUMN public.subject_line_test_results.variant_comparisons IS
  'Pairwise statistical comparisons between all variants';

COMMENT ON COLUMN public.subject_line_test_results.key_learnings IS
  'JSON array of insights and learnings from the test';
```

**Field Details:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique result identifier |
| `test_id` | UUID | FK, UNIQUE, NOT NULL | Links to subject_line_tests |
| `completed_at` | TIMESTAMPTZ | NOT NULL | When test completed |
| `total_sent` | INTEGER | NOT NULL | Total emails sent |
| `variant_a_sent` through `variant_e_sent` | INTEGER | - | Sends per variant |
| `variant_a_open_rate` through `variant_e_open_rate` | DECIMAL(5,2) | - | Open % per variant |
| `variant_a_click_rate` through `variant_e_click_rate` | DECIMAL(5,2) | - | Click % per variant |
| `variant_a_reply_rate` through `variant_e_reply_rate` | DECIMAL(5,2) | - | Reply % per variant |
| `winning_variant` | CHAR(1) | A-E, NOT NULL | Best performing variant |
| `statistical_significance` | BOOLEAN | NOT NULL | Reached significance? |
| `p_value` | DECIMAL(6,5) | - | Statistical p-value |
| `improvement_percentage` | DECIMAL(6,2) | - | Winner vs baseline % |
| `chi_square_results` | JSONB | - | Detailed statistical test |
| `key_learnings` | JSONB | - | Array of insights |

**Example `key_learnings` JSON:**
```json
[
  {
    "learning": "Question-based subjects (Variant A) significantly outperformed direct statements",
    "data": "32.5% open rate vs 24.1% (35% improvement)",
    "actionable": "Use question format as default for cold outreach"
  },
  {
    "learning": "Including company name increased relevance",
    "data": "Variants with company name averaged 28.7% vs 22.4% without",
    "actionable": "Always include company name when available"
  },
  {
    "learning": "Mobile optimization matters",
    "data": "62% of opens on mobile, subjects >50 chars had 18% lower open rate",
    "actionable": "Keep subjects under 45 characters for mobile"
  }
]
```

---

## Indexes and Performance

### Index Strategy

#### Primary Indexes (Critical Performance)

```sql
-- Business lookups (most common query pattern)
CREATE INDEX idx_subject_variants_business ON subject_line_variants(business_id);
CREATE INDEX idx_quality_scores_business ON subject_line_quality_scores(business_id);
CREATE INDEX idx_perf_business ON subject_line_performance(business_id);

-- Campaign-level analytics
CREATE INDEX idx_subject_variants_campaign ON subject_line_variants(campaign_id);
CREATE INDEX idx_perf_campaign ON subject_line_performance(campaign_id);

-- Time-based queries (dashboards, recent activity)
CREATE INDEX idx_subject_variants_generated ON subject_line_variants(generated_at DESC);
CREATE INDEX idx_perf_sent ON subject_line_performance(sent_at DESC);
CREATE INDEX idx_test_results_completed ON subject_line_test_results(completed_at DESC);
```

#### Analytical Indexes

```sql
-- Performance by approach (strategy analysis)
CREATE INDEX idx_subject_variants_approach ON subject_line_variants(approach);
CREATE INDEX idx_perf_approach ON subject_line_performance(approach);

-- Quality-based filtering
CREATE INDEX idx_subject_variants_quality ON subject_line_variants(quality_score DESC);
CREATE INDEX idx_quality_scores_overall ON subject_line_quality_scores(overall_score DESC);
CREATE INDEX idx_quality_scores_acceptable ON subject_line_quality_scores(is_acceptable);

-- Engagement analytics
CREATE INDEX idx_perf_opened ON subject_line_performance(is_opened, opened_at DESC);
CREATE INDEX idx_perf_clicked ON subject_line_performance(is_clicked, first_click_at DESC);
CREATE INDEX idx_perf_replied ON subject_line_performance(is_replied, replied_at DESC);
```

#### Test Analysis Indexes

```sql
-- A/B test queries
CREATE INDEX idx_perf_test ON subject_line_performance(test_id);
CREATE INDEX idx_perf_test_variant ON subject_line_performance(test_id, variant_letter);
CREATE INDEX idx_test_results_test ON subject_line_test_results(test_id);
CREATE INDEX idx_test_results_significant ON subject_line_test_results(statistical_significance);
```

#### JSONB Indexes (for JSON queries)

```sql
-- GIN indexes for JSONB columns
CREATE INDEX idx_subject_variants_spam_triggers ON subject_line_variants USING GIN(spam_triggers);
CREATE INDEX idx_quality_scores_recommendations ON subject_line_quality_scores USING GIN(recommendations);
CREATE INDEX idx_perf_raw_events ON subject_line_performance USING GIN(raw_events);
```

### Index Usage Patterns

| Query Pattern | Index Used | Est. Performance |
|--------------|------------|------------------|
| Get variants for business | `idx_subject_variants_business` | < 1ms |
| Campaign performance summary | `idx_perf_campaign` | < 10ms |
| Recent generations | `idx_subject_variants_generated` | < 5ms |
| Best performing approaches | `idx_perf_approach` + `idx_perf_opened` | < 20ms |
| A/B test results | `idx_perf_test_variant` | < 15ms |
| Quality score filtering | `idx_quality_scores_overall` | < 5ms |

### Maintenance

```sql
-- Analyze tables monthly for optimal query planning
ANALYZE subject_line_variants;
ANALYZE subject_line_quality_scores;
ANALYZE subject_line_performance;
ANALYZE subject_line_tests;
ANALYZE subject_line_test_results;

-- Reindex if performance degrades
REINDEX TABLE subject_line_variants;
REINDEX TABLE subject_line_performance;
```

---

## Foreign Key Relationships

### Constraint Definitions

```sql
-- subject_line_variants relationships
ALTER TABLE subject_line_variants
  ADD CONSTRAINT fk_variants_business
    FOREIGN KEY (business_id) REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_variants_campaign
    FOREIGN KEY (campaign_id) REFERENCES gmaps_campaigns(id) ON DELETE CASCADE;

-- subject_line_quality_scores relationships
ALTER TABLE subject_line_quality_scores
  ADD CONSTRAINT fk_quality_variant
    FOREIGN KEY (variant_id) REFERENCES subject_line_variants(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_quality_business
    FOREIGN KEY (business_id) REFERENCES gmaps_businesses(id) ON DELETE CASCADE;

-- subject_line_tests relationships
ALTER TABLE subject_line_tests
  ADD CONSTRAINT fk_tests_campaign
    FOREIGN KEY (campaign_id) REFERENCES gmaps_campaigns(id) ON DELETE CASCADE;

-- subject_line_performance relationships
ALTER TABLE subject_line_performance
  ADD CONSTRAINT fk_perf_business
    FOREIGN KEY (business_id) REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_perf_campaign
    FOREIGN KEY (campaign_id) REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_perf_variant
    FOREIGN KEY (variant_id) REFERENCES subject_line_variants(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_perf_test
    FOREIGN KEY (test_id) REFERENCES subject_line_tests(id) ON DELETE SET NULL;

-- subject_line_test_results relationships
ALTER TABLE subject_line_test_results
  ADD CONSTRAINT fk_results_test
    FOREIGN KEY (test_id) REFERENCES subject_line_tests(id) ON DELETE CASCADE;
```

### Cascade Behavior

| Parent Delete | Child Table | Action | Rationale |
|--------------|-------------|--------|-----------|
| `gmaps_businesses` | `subject_line_variants` | CASCADE | If business deleted, variants meaningless |
| `gmaps_campaigns` | `subject_line_tests` | CASCADE | Tests are campaign-specific |
| `subject_line_variants` | `subject_line_quality_scores` | CASCADE | Score is meaningless without variant |
| `subject_line_tests` | `subject_line_test_results` | CASCADE | Results are meaningless without test |
| `subject_line_variants` | `subject_line_performance` | SET NULL | Keep performance data even if variant deleted |
| `subject_line_tests` | `subject_line_performance` | SET NULL | Keep performance data even if test deleted |

---

## Migration Strategy

### Phase 1: Backward-Compatible Enhancement (Week 1)

**Goal:** Add new columns to existing table without disrupting current system

```sql
-- Migration: 001_enhance_gmaps_businesses.sql
-- Safe to run on production - adds nullable columns only

BEGIN;

-- Add new columns (all nullable for backward compatibility)
ALTER TABLE public.gmaps_businesses
ADD COLUMN IF NOT EXISTS subject_line_variants JSONB,
ADD COLUMN IF NOT EXISTS subject_line_variant_used CHAR(1),
ADD COLUMN IF NOT EXISTS subject_line_approach VARCHAR(50),
ADD COLUMN IF NOT EXISTS subject_line_quality_score DECIMAL(4,3);

-- Add check constraints
ALTER TABLE public.gmaps_businesses
ADD CONSTRAINT check_variant_used
  CHECK (subject_line_variant_used IS NULL OR subject_line_variant_used IN ('A', 'B', 'C', 'D', 'E'));

ALTER TABLE public.gmaps_businesses
ADD CONSTRAINT check_quality_score
  CHECK (subject_line_quality_score IS NULL OR (subject_line_quality_score >= 0 AND subject_line_quality_score <= 1));

-- Add comments
COMMENT ON COLUMN public.gmaps_businesses.subject_line_variants IS
  'JSON array of all generated subject line variants with metadata';

COMMENT ON COLUMN public.gmaps_businesses.subject_line_variant_used IS
  'Which variant (A, B, C, D, E) was selected for sending';

COMMENT ON COLUMN public.gmaps_businesses.subject_line_approach IS
  'Psychological strategy used: question, observation, direct, connection, social_proof';

COMMENT ON COLUMN public.gmaps_businesses.subject_line_quality_score IS
  'Overall quality score (0.000-1.000) from scoring system';

-- Basic index for new columns
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_variant_used
  ON gmaps_businesses(subject_line_variant_used)
  WHERE subject_line_variant_used IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_approach
  ON gmaps_businesses(subject_line_approach)
  WHERE subject_line_approach IS NOT NULL;

COMMIT;

-- Verification query
SELECT COUNT(*) as existing_records,
       COUNT(subject_line) as has_subject,
       COUNT(subject_line_variants) as has_variants
FROM gmaps_businesses;
```

**Rollback Plan:**
```sql
-- Safe rollback - just drops new columns
BEGIN;
ALTER TABLE public.gmaps_businesses
DROP COLUMN IF EXISTS subject_line_variants,
DROP COLUMN IF EXISTS subject_line_variant_used,
DROP COLUMN IF EXISTS subject_line_approach,
DROP COLUMN IF EXISTS subject_line_quality_score;
COMMIT;
```

### Phase 2: Core Tables Creation (Week 1)

**Goal:** Create new supporting tables

```sql
-- Migration: 002_create_subject_line_tables.sql

BEGIN;

-- 1. Create subject_line_variants table
CREATE TABLE public.subject_line_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
  variant_id CHAR(1) NOT NULL CHECK (variant_id IN ('A', 'B', 'C', 'D', 'E')),
  subject_line VARCHAR(255) NOT NULL,
  icebreaker TEXT,
  approach VARCHAR(50) NOT NULL,
  psychological_strategy VARCHAR(100),
  quality_score DECIMAL(4,3),
  length_chars INTEGER NOT NULL,
  personalization_level VARCHAR(20) CHECK (personalization_level IN ('none', 'low', 'medium', 'high')),
  spam_risk_score DECIMAL(4,3),
  spam_triggers JSONB,
  validation_passed BOOLEAN DEFAULT TRUE,
  validation_issues JSONB,
  model_used VARCHAR(50),
  temperature DECIMAL(3,2),
  prompt_version VARCHAR(20),
  generation_cost_usd DECIMAL(8,4),
  generation_duration_ms INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, variant_id)
);

-- 2. Create subject_line_quality_scores table
CREATE TABLE public.subject_line_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES subject_line_variants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
  overall_score DECIMAL(4,3) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
  grade VARCHAR(3) NOT NULL CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F')),
  is_acceptable BOOLEAN NOT NULL DEFAULT TRUE,
  length_score DECIMAL(4,3),
  personalization_score DECIMAL(4,3),
  curiosity_score DECIMAL(4,3),
  spam_risk_score DECIMAL(4,3),
  clarity_score DECIMAL(4,3),
  action_score DECIMAL(4,3),
  has_name BOOLEAN,
  has_company BOOLEAN,
  has_question BOOLEAN,
  word_count INTEGER,
  vague_words_count INTEGER,
  spam_triggers_count INTEGER,
  recommendations JSONB,
  improvement_suggestions JSONB,
  scoring_version VARCHAR(20),
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(variant_id)
);

-- 3. Create indexes for variants table
CREATE INDEX idx_subject_variants_business ON subject_line_variants(business_id);
CREATE INDEX idx_subject_variants_campaign ON subject_line_variants(campaign_id);
CREATE INDEX idx_subject_variants_approach ON subject_line_variants(approach);
CREATE INDEX idx_subject_variants_quality ON subject_line_variants(quality_score DESC);
CREATE INDEX idx_subject_variants_generated ON subject_line_variants(generated_at DESC);
CREATE INDEX idx_subject_variants_spam_triggers ON subject_line_variants USING GIN(spam_triggers);

-- 4. Create indexes for quality scores table
CREATE INDEX idx_quality_scores_variant ON subject_line_quality_scores(variant_id);
CREATE INDEX idx_quality_scores_business ON subject_line_quality_scores(business_id);
CREATE INDEX idx_quality_scores_overall ON subject_line_quality_scores(overall_score DESC);
CREATE INDEX idx_quality_scores_grade ON subject_line_quality_scores(grade);
CREATE INDEX idx_quality_scores_acceptable ON subject_line_quality_scores(is_acceptable);
CREATE INDEX idx_quality_scores_recommendations ON subject_line_quality_scores USING GIN(recommendations);

-- 5. Add table comments
COMMENT ON TABLE subject_line_variants IS
  'Stores all generated subject line variants for A/B testing with complete metadata';

COMMENT ON TABLE subject_line_quality_scores IS
  'Detailed quality scoring breakdown for subject line variants';

COMMIT;

-- Verification
SELECT 'subject_line_variants' as table_name, COUNT(*) as count FROM subject_line_variants
UNION ALL
SELECT 'subject_line_quality_scores', COUNT(*) FROM subject_line_quality_scores;
```

### Phase 3: Testing & Performance Tables (Week 2)

**Goal:** Add A/B testing and performance tracking

```sql
-- Migration: 003_create_testing_performance_tables.sql

BEGIN;

-- 1. Create subject_line_tests table
CREATE TABLE public.subject_line_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  test_description TEXT,
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('ab', 'abc', 'abcd', 'abcde', 'multivariate')),
  hypothesis TEXT,
  expected_winner CHAR(1),
  variant_count INTEGER NOT NULL CHECK (variant_count BETWEEN 2 AND 5),
  variant_distribution JSONB,
  approach_a VARCHAR(50),
  approach_b VARCHAR(50),
  approach_c VARCHAR(50),
  approach_d VARCHAR(50),
  approach_e VARCHAR(50),
  target_sample_size INTEGER,
  actual_sample_size INTEGER DEFAULT 0,
  min_sample_per_variant INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  confidence_level DECIMAL(3,2) DEFAULT 0.95,
  minimum_effect_size DECIMAL(4,3) DEFAULT 0.050,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  winning_variant CHAR(1),
  statistical_significance BOOLEAN,
  p_value DECIMAL(6,5),
  created_by VARCHAR(255),
  notes TEXT
);

-- 2. Create subject_line_performance table
CREATE TABLE public.subject_line_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES subject_line_variants(id) ON DELETE SET NULL,
  test_id UUID REFERENCES subject_line_tests(id) ON DELETE SET NULL,
  variant_letter CHAR(1) CHECK (variant_letter IN ('A', 'B', 'C', 'D', 'E')),
  approach VARCHAR(50),
  subject_line TEXT NOT NULL,
  icebreaker TEXT,
  sent_at TIMESTAMPTZ,
  send_method VARCHAR(50),
  recipient_email VARCHAR(255),
  opened_at TIMESTAMPTZ,
  first_click_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  spam_reported_at TIMESTAMPTZ,
  is_opened BOOLEAN DEFAULT FALSE,
  is_clicked BOOLEAN DEFAULT FALSE,
  is_replied BOOLEAN DEFAULT FALSE,
  is_bounced BOOLEAN DEFAULT FALSE,
  is_unsubscribed BOOLEAN DEFAULT FALSE,
  is_spam_reported BOOLEAN DEFAULT FALSE,
  time_to_open_seconds INTEGER,
  time_to_click_seconds INTEGER,
  time_to_reply_seconds INTEGER,
  open_device VARCHAR(50),
  open_email_client VARCHAR(100),
  open_location VARCHAR(100),
  tracking_id VARCHAR(255),
  raw_events JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create subject_line_test_results table
CREATE TABLE public.subject_line_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL UNIQUE REFERENCES subject_line_tests(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_duration_hours DECIMAL(10,2),
  total_sent INTEGER NOT NULL,
  variant_a_sent INTEGER,
  variant_b_sent INTEGER,
  variant_c_sent INTEGER,
  variant_d_sent INTEGER,
  variant_e_sent INTEGER,
  variant_a_open_rate DECIMAL(5,2),
  variant_b_open_rate DECIMAL(5,2),
  variant_c_open_rate DECIMAL(5,2),
  variant_d_open_rate DECIMAL(5,2),
  variant_e_open_rate DECIMAL(5,2),
  variant_a_click_rate DECIMAL(5,2),
  variant_b_click_rate DECIMAL(5,2),
  variant_c_click_rate DECIMAL(5,2),
  variant_d_click_rate DECIMAL(5,2),
  variant_e_click_rate DECIMAL(5,2),
  variant_a_reply_rate DECIMAL(5,2),
  variant_b_reply_rate DECIMAL(5,2),
  variant_c_reply_rate DECIMAL(5,2),
  variant_d_reply_rate DECIMAL(5,2),
  variant_e_reply_rate DECIMAL(5,2),
  winning_variant CHAR(1) NOT NULL,
  runner_up_variant CHAR(1),
  statistical_significance BOOLEAN NOT NULL,
  p_value DECIMAL(6,5),
  confidence_level DECIMAL(5,4),
  improvement_percentage DECIMAL(6,2),
  absolute_difference DECIMAL(5,2),
  chi_square_results JSONB,
  variant_comparisons JSONB,
  conclusion TEXT,
  key_learnings JSONB,
  recommendation TEXT,
  should_implement BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMPTZ,
  analyzed_by VARCHAR(255),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create all indexes
-- Tests indexes
CREATE INDEX idx_subject_tests_campaign ON subject_line_tests(campaign_id);
CREATE INDEX idx_subject_tests_status ON subject_line_tests(status);
CREATE INDEX idx_subject_tests_started ON subject_line_tests(started_at DESC);
CREATE INDEX idx_subject_tests_completed ON subject_line_tests(completed_at DESC);

-- Performance indexes
CREATE INDEX idx_perf_business ON subject_line_performance(business_id);
CREATE INDEX idx_perf_campaign ON subject_line_performance(campaign_id);
CREATE INDEX idx_perf_variant ON subject_line_performance(variant_id);
CREATE INDEX idx_perf_test ON subject_line_performance(test_id);
CREATE INDEX idx_perf_sent ON subject_line_performance(sent_at DESC);
CREATE INDEX idx_perf_opened ON subject_line_performance(is_opened, opened_at DESC);
CREATE INDEX idx_perf_clicked ON subject_line_performance(is_clicked, first_click_at DESC);
CREATE INDEX idx_perf_replied ON subject_line_performance(is_replied, replied_at DESC);
CREATE INDEX idx_perf_approach ON subject_line_performance(approach);
CREATE INDEX idx_perf_variant_letter ON subject_line_performance(variant_letter);
CREATE INDEX idx_perf_test_variant ON subject_line_performance(test_id, variant_letter);
CREATE INDEX idx_perf_raw_events ON subject_line_performance USING GIN(raw_events);

-- Test results indexes
CREATE INDEX idx_test_results_test ON subject_line_test_results(test_id);
CREATE INDEX idx_test_results_completed ON subject_line_test_results(completed_at DESC);
CREATE INDEX idx_test_results_winning ON subject_line_test_results(winning_variant);
CREATE INDEX idx_test_results_significant ON subject_line_test_results(statistical_significance);

-- 5. Add comments
COMMENT ON TABLE subject_line_tests IS 'A/B test configurations for subject line optimization';
COMMENT ON TABLE subject_line_performance IS 'Tracks email performance metrics for subject lines sent to recipients';
COMMENT ON TABLE subject_line_test_results IS 'Aggregated A/B test results with statistical analysis';

COMMIT;

-- Verification
SELECT 'subject_line_tests' as table_name, COUNT(*) as count FROM subject_line_tests
UNION ALL
SELECT 'subject_line_performance', COUNT(*) FROM subject_line_performance
UNION ALL
SELECT 'subject_line_test_results', COUNT(*) FROM subject_line_test_results;
```

### Phase 4: Data Migration (Week 2)

**Goal:** Migrate existing subject line data to new structure

```sql
-- Migration: 004_migrate_existing_data.sql
-- Migrate existing subject_line and icebreaker data to new structure

BEGIN;

-- Create temporary function to migrate data
CREATE OR REPLACE FUNCTION migrate_subject_lines_to_variants()
RETURNS TABLE(
  migrated_count INTEGER,
  skipped_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  business_record RECORD;
  variant_record subject_line_variants;
  migrated INTEGER := 0;
  skipped INTEGER := 0;
  errors INTEGER := 0;
BEGIN
  -- Loop through all businesses with existing subject lines
  FOR business_record IN
    SELECT id, campaign_id, subject_line, icebreaker, icebreaker_generated_at
    FROM gmaps_businesses
    WHERE subject_line IS NOT NULL
      AND subject_line_variants IS NULL  -- Only migrate if not already migrated
  LOOP
    BEGIN
      -- Insert as variant A (the original)
      INSERT INTO subject_line_variants (
        business_id,
        campaign_id,
        variant_id,
        subject_line,
        icebreaker,
        approach,
        length_chars,
        generated_at,
        prompt_version
      ) VALUES (
        business_record.id,
        business_record.campaign_id,
        'A',
        business_record.subject_line,
        business_record.icebreaker,
        'legacy',  -- Mark as migrated from legacy system
        LENGTH(business_record.subject_line),
        COALESCE(business_record.icebreaker_generated_at, NOW()),
        'legacy_v1'
      )
      ON CONFLICT (business_id, variant_id) DO NOTHING;

      -- Update gmaps_businesses with variant metadata
      UPDATE gmaps_businesses
      SET
        subject_line_variants = jsonb_build_array(
          jsonb_build_object(
            'variant_id', 'A',
            'subject_line', business_record.subject_line,
            'approach', 'legacy',
            'length', LENGTH(business_record.subject_line),
            'migrated', true
          )
        ),
        subject_line_variant_used = 'A',
        subject_line_approach = 'legacy'
      WHERE id = business_record.id;

      migrated := migrated + 1;

    EXCEPTION
      WHEN OTHERS THEN
        errors := errors + 1;
        RAISE WARNING 'Error migrating business %: %', business_record.id, SQLERRM;
    END;
  END LOOP;

  -- Count skipped records (already migrated)
  SELECT COUNT(*) INTO skipped
  FROM gmaps_businesses
  WHERE subject_line IS NOT NULL
    AND subject_line_variants IS NOT NULL;

  RETURN QUERY SELECT migrated, skipped, errors;
END;
$$ LANGUAGE plpgsql;

-- Execute migration
SELECT * FROM migrate_subject_lines_to_variants();

-- Drop temporary function
DROP FUNCTION migrate_subject_lines_to_variants();

-- Verification query
SELECT
  COUNT(*) as total_businesses,
  COUNT(subject_line) as has_subject_line,
  COUNT(subject_line_variants) as has_variants,
  COUNT(CASE WHEN subject_line_variant_used = 'A' THEN 1 END) as migrated_as_variant_a
FROM gmaps_businesses;

COMMIT;
```

### Phase 5: Validation & Rollback Procedures

```sql
-- Validation queries to run after each phase

-- 1. Check all foreign keys are valid
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text LIKE '%subject_line%'
ORDER BY conrelid::regclass, conname;

-- 2. Check all indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename LIKE '%subject_line%'
ORDER BY tablename, indexname;

-- 3. Check data integrity
SELECT
  'gmaps_businesses' as table_name,
  COUNT(*) as total,
  COUNT(subject_line) as has_subject,
  COUNT(subject_line_variants) as has_variants
FROM gmaps_businesses
UNION ALL
SELECT 'subject_line_variants', COUNT(*), 0, 0 FROM subject_line_variants
UNION ALL
SELECT 'subject_line_quality_scores', COUNT(*), 0, 0 FROM subject_line_quality_scores
UNION ALL
SELECT 'subject_line_performance', COUNT(*), 0, 0 FROM subject_line_performance;

-- 4. Check for orphaned records
SELECT 'Orphaned variants' as check_name, COUNT(*) as count
FROM subject_line_variants v
LEFT JOIN gmaps_businesses b ON v.business_id = b.id
WHERE b.id IS NULL
UNION ALL
SELECT 'Orphaned quality scores', COUNT(*)
FROM subject_line_quality_scores q
LEFT JOIN subject_line_variants v ON q.variant_id = v.id
WHERE v.id IS NULL;
```

**Complete Rollback Script:**
```sql
-- EMERGENCY ROLLBACK - Reverts all migrations
-- WARNING: This will delete all subject line analytics data
-- Run only if critical issues found

BEGIN;

-- Drop all new tables (in reverse dependency order)
DROP TABLE IF EXISTS subject_line_test_results CASCADE;
DROP TABLE IF EXISTS subject_line_performance CASCADE;
DROP TABLE IF EXISTS subject_line_tests CASCADE;
DROP TABLE IF EXISTS subject_line_quality_scores CASCADE;
DROP TABLE IF EXISTS subject_line_variants CASCADE;

-- Remove new columns from gmaps_businesses
ALTER TABLE gmaps_businesses
DROP COLUMN IF EXISTS subject_line_variants,
DROP COLUMN IF EXISTS subject_line_variant_used,
DROP COLUMN IF EXISTS subject_line_approach,
DROP COLUMN IF EXISTS subject_line_quality_score;

COMMIT;

-- Verify rollback
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%subject_line%';
-- Should return 0 rows
```

---

## Example Queries

### Basic Queries

#### 1. Get All Variants for a Business
```sql
SELECT
  v.variant_id,
  v.subject_line,
  v.approach,
  v.quality_score,
  v.length_chars,
  v.spam_risk_score,
  q.overall_score,
  q.grade,
  q.is_acceptable
FROM subject_line_variants v
LEFT JOIN subject_line_quality_scores q ON v.id = q.variant_id
WHERE v.business_id = 'business-uuid-here'
ORDER BY v.variant_id;
```

#### 2. Get Quality Score Details
```sql
SELECT
  v.subject_line,
  v.variant_id,
  q.overall_score,
  q.grade,
  q.length_score,
  q.personalization_score,
  q.curiosity_score,
  q.spam_risk_score,
  q.clarity_score,
  q.recommendations
FROM subject_line_variants v
JOIN subject_line_quality_scores q ON v.id = q.variant_id
WHERE v.business_id = 'business-uuid-here'
ORDER BY q.overall_score DESC;
```

#### 3. Find High-Quality Variants
```sql
SELECT
  b.name as business_name,
  v.subject_line,
  v.approach,
  q.overall_score,
  q.grade,
  v.generated_at
FROM subject_line_variants v
JOIN subject_line_quality_scores q ON v.id = q.variant_id
JOIN gmaps_businesses b ON v.business_id = b.id
WHERE q.overall_score >= 0.85
  AND q.is_acceptable = TRUE
  AND v.spam_risk_score >= 0.90
ORDER BY q.overall_score DESC
LIMIT 100;
```

### Campaign Analytics

#### 4. Campaign Subject Line Performance Summary
```sql
SELECT
  c.name as campaign_name,
  COUNT(DISTINCT b.id) as total_businesses,
  COUNT(DISTINCT v.id) as total_variants,
  ROUND(AVG(v.quality_score), 3) as avg_quality_score,
  ROUND(AVG(v.length_chars), 1) as avg_length,
  COUNT(DISTINCT v.approach) as unique_approaches,
  COUNT(CASE WHEN v.spam_risk_score >= 0.90 THEN 1 END) as low_spam_risk_count
FROM gmaps_campaigns c
JOIN gmaps_businesses b ON c.id = b.campaign_id
JOIN subject_line_variants v ON b.id = v.business_id
WHERE c.id = 'campaign-uuid-here'
GROUP BY c.id, c.name;
```

#### 5. Approach Performance by Campaign
```sql
SELECT
  v.approach,
  COUNT(*) as variant_count,
  ROUND(AVG(v.quality_score), 3) as avg_quality_score,
  ROUND(AVG(v.length_chars), 1) as avg_length,
  ROUND(AVG(v.spam_risk_score), 3) as avg_spam_safety,
  COUNT(CASE WHEN q.is_acceptable THEN 1 END) as acceptable_count,
  ROUND(100.0 * COUNT(CASE WHEN q.is_acceptable THEN 1 END) / COUNT(*), 2) as acceptable_percentage
FROM subject_line_variants v
LEFT JOIN subject_line_quality_scores q ON v.id = q.variant_id
WHERE v.campaign_id = 'campaign-uuid-here'
GROUP BY v.approach
ORDER BY avg_quality_score DESC;
```

### A/B Testing Queries

#### 6. Get Active Tests
```sql
SELECT
  t.test_name,
  t.test_type,
  t.variant_count,
  t.status,
  t.target_sample_size,
  t.actual_sample_size,
  ROUND(100.0 * t.actual_sample_size / NULLIF(t.target_sample_size, 0), 2) as progress_percentage,
  t.started_at,
  EXTRACT(EPOCH FROM (NOW() - t.started_at)) / 3600 as hours_running
FROM subject_line_tests t
WHERE t.status = 'active'
ORDER BY t.started_at DESC;
```

#### 7. Test Performance Comparison
```sql
SELECT
  p.variant_letter,
  p.approach,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN p.is_opened THEN 1 END) as opened,
  ROUND(100.0 * COUNT(CASE WHEN p.is_opened THEN 1 END) / COUNT(*), 2) as open_rate,
  COUNT(CASE WHEN p.is_clicked THEN 1 END) as clicked,
  ROUND(100.0 * COUNT(CASE WHEN p.is_clicked THEN 1 END) / COUNT(*), 2) as click_rate,
  COUNT(CASE WHEN p.is_replied THEN 1 END) as replied,
  ROUND(100.0 * COUNT(CASE WHEN p.is_replied THEN 1 END) / COUNT(*), 2) as reply_rate,
  ROUND(AVG(p.time_to_open_seconds) / 60.0, 1) as avg_minutes_to_open
FROM subject_line_performance p
WHERE p.test_id = 'test-uuid-here'
  AND p.sent_at IS NOT NULL
GROUP BY p.variant_letter, p.approach
ORDER BY open_rate DESC;
```

#### 8. Test Winner Analysis
```sql
WITH test_stats AS (
  SELECT
    tr.test_id,
    t.test_name,
    tr.winning_variant,
    tr.statistical_significance,
    tr.p_value,
    tr.improvement_percentage,
    tr.conclusion
  FROM subject_line_test_results tr
  JOIN subject_line_tests t ON tr.test_id = t.id
  WHERE t.status = 'completed'
    AND tr.statistical_significance = TRUE
)
SELECT
  ts.test_name,
  ts.winning_variant,
  v.subject_line as winning_subject,
  v.approach as winning_approach,
  ts.improvement_percentage,
  ts.p_value,
  ts.conclusion
FROM test_stats ts
JOIN subject_line_tests t ON ts.test_id = t.id
JOIN gmaps_campaigns c ON t.campaign_id = c.id
JOIN subject_line_performance p ON p.test_id = ts.test_id AND p.variant_letter = ts.winning_variant
JOIN subject_line_variants v ON p.variant_id = v.id
WHERE v.variant_id = ts.winning_variant
LIMIT 1;
```

### Performance Analytics

#### 9. Open Rate by Approach (All Time)
```sql
SELECT
  p.approach,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN p.is_opened THEN 1 END) as total_opened,
  ROUND(100.0 * COUNT(CASE WHEN p.is_opened THEN 1 END) / COUNT(*), 2) as open_rate,
  COUNT(CASE WHEN p.is_clicked THEN 1 END) as total_clicked,
  ROUND(100.0 * COUNT(CASE WHEN p.is_clicked THEN 1 END) / COUNT(*), 2) as click_rate,
  COUNT(CASE WHEN p.is_replied THEN 1 END) as total_replied,
  ROUND(100.0 * COUNT(CASE WHEN p.is_replied THEN 1 END) / COUNT(*), 2) as reply_rate
FROM subject_line_performance p
WHERE p.sent_at IS NOT NULL
  AND p.sent_at >= NOW() - INTERVAL '30 days'
GROUP BY p.approach
ORDER BY open_rate DESC;
```

#### 10. Subject Line Length vs Open Rate
```sql
WITH length_buckets AS (
  SELECT
    v.length_chars,
    CASE
      WHEN v.length_chars <= 30 THEN '1. Very Short (≤30)'
      WHEN v.length_chars <= 40 THEN '2. Short (31-40)'
      WHEN v.length_chars <= 50 THEN '3. Medium (41-50)'
      WHEN v.length_chars <= 60 THEN '4. Long (51-60)'
      ELSE '5. Very Long (>60)'
    END as length_bucket,
    p.is_opened,
    p.is_clicked,
    p.is_replied
  FROM subject_line_variants v
  JOIN subject_line_performance p ON v.id = p.variant_id
  WHERE p.sent_at IS NOT NULL
)
SELECT
  length_bucket,
  COUNT(*) as total_sent,
  ROUND(AVG(length_chars), 1) as avg_length,
  COUNT(CASE WHEN is_opened THEN 1 END) as opened,
  ROUND(100.0 * COUNT(CASE WHEN is_opened THEN 1 END) / COUNT(*), 2) as open_rate,
  COUNT(CASE WHEN is_clicked THEN 1 END) as clicked,
  ROUND(100.0 * COUNT(CASE WHEN is_clicked THEN 1 END) / COUNT(*), 2) as click_rate
FROM length_buckets
GROUP BY length_bucket
ORDER BY length_bucket;
```

#### 11. Device-Specific Performance
```sql
SELECT
  p.open_device,
  COUNT(*) as total_opened,
  ROUND(AVG(p.time_to_open_seconds) / 60.0, 1) as avg_minutes_to_open,
  COUNT(CASE WHEN p.is_clicked THEN 1 END) as clicked,
  ROUND(100.0 * COUNT(CASE WHEN p.is_clicked THEN 1 END) / COUNT(*), 2) as click_through_rate,
  COUNT(CASE WHEN p.is_replied THEN 1 END) as replied,
  ROUND(100.0 * COUNT(CASE WHEN p.is_replied THEN 1 END) / COUNT(*), 2) as reply_rate
FROM subject_line_performance p
WHERE p.is_opened = TRUE
  AND p.open_device IS NOT NULL
GROUP BY p.open_device
ORDER BY total_opened DESC;
```

### Quality Analysis

#### 12. Quality Score Distribution
```sql
SELECT
  q.grade,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage,
  ROUND(AVG(q.overall_score), 3) as avg_score,
  ROUND(AVG(q.length_score), 3) as avg_length_score,
  ROUND(AVG(q.personalization_score), 3) as avg_personalization_score,
  ROUND(AVG(q.curiosity_score), 3) as avg_curiosity_score,
  ROUND(AVG(q.spam_risk_score), 3) as avg_spam_risk_score
FROM subject_line_quality_scores q
GROUP BY q.grade
ORDER BY q.grade;
```

#### 13. Common Recommendations
```sql
SELECT
  recommendation->>'dimension' as dimension,
  recommendation->>'severity' as severity,
  recommendation->>'message' as message,
  COUNT(*) as occurrence_count
FROM subject_line_quality_scores,
  jsonb_array_elements(recommendations) as recommendation
GROUP BY recommendation->>'dimension',
         recommendation->>'severity',
         recommendation->>'message'
ORDER BY occurrence_count DESC
LIMIT 20;
```

### Dashboard Queries

#### 14. Executive Dashboard Summary
```sql
WITH recent_activity AS (
  SELECT
    COUNT(DISTINCT v.business_id) as total_leads_with_subjects,
    COUNT(v.id) as total_variants_generated,
    ROUND(AVG(v.quality_score), 3) as avg_quality_score,
    COUNT(CASE WHEN q.is_acceptable THEN 1 END) as acceptable_variants,
    COUNT(DISTINCT p.id) as total_emails_sent,
    COUNT(CASE WHEN p.is_opened THEN 1 END) as total_opened,
    COUNT(CASE WHEN p.is_clicked THEN 1 END) as total_clicked,
    COUNT(CASE WHEN p.is_replied THEN 1 END) as total_replied
  FROM subject_line_variants v
  LEFT JOIN subject_line_quality_scores q ON v.id = q.variant_id
  LEFT JOIN subject_line_performance p ON v.id = p.variant_id
  WHERE v.generated_at >= NOW() - INTERVAL '30 days'
),
test_summary AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'active') as active_tests,
    COUNT(*) FILTER (WHERE status = 'completed' AND statistical_significance = TRUE) as significant_winners
  FROM subject_line_tests t
  LEFT JOIN subject_line_test_results tr ON t.id = tr.test_id
  WHERE t.created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  ra.total_leads_with_subjects,
  ra.total_variants_generated,
  ra.avg_quality_score,
  ROUND(100.0 * ra.acceptable_variants / NULLIF(ra.total_variants_generated, 0), 2) as acceptable_percentage,
  ra.total_emails_sent,
  ROUND(100.0 * ra.total_opened / NULLIF(ra.total_emails_sent, 0), 2) as overall_open_rate,
  ROUND(100.0 * ra.total_clicked / NULLIF(ra.total_opened, 0), 2) as click_through_rate,
  ROUND(100.0 * ra.total_replied / NULLIF(ra.total_sent, 0), 2) as reply_rate,
  ts.active_tests,
  ts.significant_winners
FROM recent_activity ra, test_summary ts;
```

#### 15. Top Performing Subject Lines
```sql
SELECT
  v.subject_line,
  v.approach,
  v.psychological_strategy,
  COUNT(p.id) as times_sent,
  COUNT(CASE WHEN p.is_opened THEN 1 END) as times_opened,
  ROUND(100.0 * COUNT(CASE WHEN p.is_opened THEN 1 END) / COUNT(p.id), 2) as open_rate,
  COUNT(CASE WHEN p.is_replied THEN 1 END) as times_replied,
  ROUND(100.0 * COUNT(CASE WHEN p.is_replied THEN 1 END) / COUNT(p.id), 2) as reply_rate,
  q.overall_score,
  q.grade
FROM subject_line_variants v
JOIN subject_line_quality_scores q ON v.id = q.variant_id
LEFT JOIN subject_line_performance p ON v.id = p.variant_id
WHERE p.sent_at IS NOT NULL
GROUP BY v.id, v.subject_line, v.approach, v.psychological_strategy, q.overall_score, q.grade
HAVING COUNT(p.id) >= 10  -- At least 10 sends
ORDER BY open_rate DESC, reply_rate DESC
LIMIT 25;
```

---

## Integration Points

### Application Code Integration

#### Python (AI Processor)

```python
# ai_processor.py - Updated to store variants

async def generate_subject_variants(
    self,
    contact_info: Dict[str, Any],
    website_summaries: List[str],
    campaign_id: str,
    variant_count: int = 3
) -> List[Dict[str, Any]]:
    """Generate multiple subject line variants for A/B testing"""

    approaches = ["question", "observation", "direct", "connection"]
    variants = []

    for i in range(variant_count):
        approach = approaches[i]

        # Generate variant with specific approach
        result = await self.generate_icebreaker(
            contact_info,
            website_summaries,
            approach_override=approach
        )

        # Score the variant
        quality_score = self.scorer.score_subject_line(
            result['subject_line'],
            contact_info
        )

        variant = {
            "variant_id": chr(65 + i),  # A, B, C, D, E
            "subject_line": result['subject_line'],
            "icebreaker": result['icebreaker'],
            "approach": approach,
            "quality_score": quality_score['overall_score'],
            "quality_grade": quality_score['grade'],
            "length_chars": len(result['subject_line']),
            "spam_risk_score": quality_score['dimensions']['spam_risk'],
            "generated_at": datetime.now().isoformat(),
            "model_used": self.model,
            "temperature": self.temperature
        }

        variants.append(variant)

    # Store in database
    await self.store_variants(contact_info['business_id'], campaign_id, variants)

    return variants

async def store_variants(
    self,
    business_id: str,
    campaign_id: str,
    variants: List[Dict[str, Any]]
):
    """Store variants in subject_line_variants table"""

    for variant in variants:
        # Insert variant
        variant_record = await self.supabase.table("subject_line_variants").insert({
            "business_id": business_id,
            "campaign_id": campaign_id,
            "variant_id": variant['variant_id'],
            "subject_line": variant['subject_line'],
            "icebreaker": variant['icebreaker'],
            "approach": variant['approach'],
            "quality_score": variant['quality_score'],
            "length_chars": variant['length_chars'],
            "spam_risk_score": variant['spam_risk_score'],
            "model_used": variant['model_used'],
            "temperature": variant['temperature']
        }).execute()

        variant_id = variant_record.data[0]['id']

        # Insert quality score details
        await self.supabase.table("subject_line_quality_scores").insert({
            "variant_id": variant_id,
            "business_id": business_id,
            "overall_score": variant['quality_score'],
            "grade": variant['quality_grade'],
            # ... other dimension scores ...
        }).execute()

    # Update gmaps_businesses with variants JSON
    await self.supabase.table("gmaps_businesses").update({
        "subject_line_variants": variants,
        "subject_line_variant_used": variants[0]['variant_id'],  # Default to A
        "subject_line_approach": variants[0]['approach'],
        "subject_line_quality_score": variants[0]['quality_score']
    }).eq("id", business_id).execute()
```

#### Node.js (Backend API)

```javascript
// supabase-db.js - Subject line analytics endpoints

async function getSubjectLinePerformance(campaignId) {
  const { data, error } = await supabase
    .from('subject_line_performance')
    .select(`
      variant_letter,
      approach,
      subject_line,
      is_opened,
      is_clicked,
      is_replied,
      time_to_open_seconds,
      subject_line_variants (
        quality_score,
        length_chars
      )
    `)
    .eq('campaign_id', campaignId);

  if (error) throw error;

  // Aggregate by variant
  const byVariant = {};
  data.forEach(record => {
    const variant = record.variant_letter;
    if (!byVariant[variant]) {
      byVariant[variant] = {
        variant,
        approach: record.approach,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        avgTimeToOpen: []
      };
    }

    byVariant[variant].sent++;
    if (record.is_opened) byVariant[variant].opened++;
    if (record.is_clicked) byVariant[variant].clicked++;
    if (record.is_replied) byVariant[variant].replied++;
    if (record.time_to_open_seconds) {
      byVariant[variant].avgTimeToOpen.push(record.time_to_open_seconds);
    }
  });

  // Calculate rates
  Object.values(byVariant).forEach(variant => {
    variant.openRate = (variant.opened / variant.sent * 100).toFixed(2);
    variant.clickRate = (variant.clicked / variant.sent * 100).toFixed(2);
    variant.replyRate = (variant.replied / variant.sent * 100).toFixed(2);
    variant.avgTimeToOpenMin = variant.avgTimeToOpen.length > 0
      ? (variant.avgTimeToOpen.reduce((a, b) => a + b, 0) / variant.avgTimeToOpen.length / 60).toFixed(1)
      : null;
  });

  return Object.values(byVariant);
}

async function createABTest(campaignId, testConfig) {
  const { data, error } = await supabase
    .from('subject_line_tests')
    .insert({
      campaign_id: campaignId,
      test_name: testConfig.name,
      test_description: testConfig.description,
      test_type: testConfig.variantCount === 2 ? 'ab' : `abc${testConfig.variantCount > 3 ? 'd' : ''}`,
      hypothesis: testConfig.hypothesis,
      variant_count: testConfig.variantCount,
      variant_distribution: testConfig.distribution,
      approach_a: testConfig.approaches[0],
      approach_b: testConfig.approaches[1],
      approach_c: testConfig.approaches[2] || null,
      target_sample_size: testConfig.sampleSize,
      confidence_level: 0.95,
      status: 'draft',
      created_by: testConfig.createdBy
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function recordEmailPerformance(performanceData) {
  const { data, error } = await supabase
    .from('subject_line_performance')
    .insert({
      business_id: performanceData.businessId,
      campaign_id: performanceData.campaignId,
      variant_id: performanceData.variantId,
      test_id: performanceData.testId,
      variant_letter: performanceData.variantLetter,
      approach: performanceData.approach,
      subject_line: performanceData.subjectLine,
      sent_at: performanceData.sentAt,
      recipient_email: performanceData.recipientEmail,
      tracking_id: performanceData.trackingId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateEmailEngagement(performanceId, eventType, eventData) {
  const updates = {
    updated_at: new Date().toISOString()
  };

  switch(eventType) {
    case 'opened':
      updates.opened_at = eventData.timestamp;
      updates.is_opened = true;
      updates.open_device = eventData.device;
      updates.open_email_client = eventData.emailClient;
      updates.time_to_open_seconds = eventData.timeToOpenSeconds;
      break;
    case 'clicked':
      updates.first_click_at = eventData.timestamp;
      updates.is_clicked = true;
      updates.time_to_click_seconds = eventData.timeToClickSeconds;
      break;
    case 'replied':
      updates.replied_at = eventData.timestamp;
      updates.is_replied = true;
      updates.time_to_reply_seconds = eventData.timeToReplySeconds;
      break;
    case 'bounced':
      updates.bounced_at = eventData.timestamp;
      updates.is_bounced = true;
      break;
  }

  const { data, error } = await supabase
    .from('subject_line_performance')
    .update(updates)
    .eq('id', performanceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  getSubjectLinePerformance,
  createABTest,
  recordEmailPerformance,
  updateEmailEngagement
};
```

#### React (Frontend Dashboard)

```typescript
// SubjectLineAnalytics.tsx - Dashboard component

import React, { useEffect, useState } from 'react';

interface VariantPerformance {
  variant: string;
  approach: string;
  sent: number;
  openRate: string;
  clickRate: string;
  replyRate: string;
  avgTimeToOpenMin: string | null;
}

export const SubjectLineAnalytics: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const [performance, setPerformance] = useState<VariantPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPerformance() {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/subject-line-performance`);
        const data = await response.json();
        setPerformance(data);
      } catch (error) {
        console.error('Failed to fetch performance:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [campaignId]);

  if (loading) return <div>Loading performance data...</div>;

  // Find best performing variant
  const bestVariant = performance.reduce((best, current) =>
    parseFloat(current.openRate) > parseFloat(best.openRate) ? current : best
  , performance[0]);

  return (
    <div className="subject-line-analytics">
      <h2>Subject Line Performance</h2>

      <div className="performance-summary">
        <div className="stat-card highlight">
          <h3>Top Performer</h3>
          <div className="variant-badge">Variant {bestVariant.variant}</div>
          <div className="stat-value">{bestVariant.openRate}%</div>
          <div className="stat-label">Open Rate</div>
          <div className="approach-tag">{bestVariant.approach}</div>
        </div>
      </div>

      <table className="performance-table">
        <thead>
          <tr>
            <th>Variant</th>
            <th>Approach</th>
            <th>Sent</th>
            <th>Open Rate</th>
            <th>Click Rate</th>
            <th>Reply Rate</th>
            <th>Avg. Time to Open</th>
          </tr>
        </thead>
        <tbody>
          {performance.map(variant => (
            <tr key={variant.variant} className={variant.variant === bestVariant.variant ? 'highlight' : ''}>
              <td><strong>Variant {variant.variant}</strong></td>
              <td><span className="tag">{variant.approach}</span></td>
              <td>{variant.sent}</td>
              <td>{variant.openRate}%</td>
              <td>{variant.clickRate}%</td>
              <td>{variant.replyRate}%</td>
              <td>{variant.avgTimeToOpenMin ? `${variant.avgTimeToOpenMin} min` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Performance Considerations

### Query Optimization

#### Materialized Views for Fast Dashboards

```sql
-- Create materialized view for campaign performance summary
CREATE MATERIALIZED VIEW mv_campaign_subject_performance AS
SELECT
  c.id as campaign_id,
  c.name as campaign_name,
  COUNT(DISTINCT p.business_id) as unique_businesses,
  COUNT(p.id) as total_sent,
  COUNT(CASE WHEN p.is_opened THEN 1 END) as total_opened,
  ROUND(100.0 * COUNT(CASE WHEN p.is_opened THEN 1 END) / COUNT(p.id), 2) as open_rate,
  COUNT(CASE WHEN p.is_clicked THEN 1 END) as total_clicked,
  ROUND(100.0 * COUNT(CASE WHEN p.is_clicked THEN 1 END) / COUNT(p.id), 2) as click_rate,
  COUNT(CASE WHEN p.is_replied THEN 1 END) as total_replied,
  ROUND(100.0 * COUNT(CASE WHEN p.is_replied THEN 1 END) / COUNT(p.id), 2) as reply_rate,
  ROUND(AVG(p.time_to_open_seconds) / 60.0, 1) as avg_minutes_to_open,
  MAX(p.sent_at) as last_sent_at,
  NOW() as refreshed_at
FROM gmaps_campaigns c
LEFT JOIN subject_line_performance p ON c.id = p.campaign_id
WHERE p.sent_at IS NOT NULL
GROUP BY c.id, c.name;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_mv_campaign_perf_campaign ON mv_campaign_subject_performance(campaign_id);

-- Refresh function (call nightly or on-demand)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_subject_performance;
```

#### Partitioning for Large-Scale Performance Data

```sql
-- Partition subject_line_performance by sent_at month
-- This improves query performance when filtering by date

CREATE TABLE subject_line_performance_partitioned (
  -- Same structure as subject_line_performance
  -- Add partition key
) PARTITION BY RANGE (sent_at);

-- Create partitions for each month
CREATE TABLE subject_line_performance_2025_10
  PARTITION OF subject_line_performance_partitioned
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE subject_line_performance_2025_11
  PARTITION OF subject_line_performance_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Auto-create future partitions with pg_partman extension
```

### Caching Strategy

#### Application-Level Caching

```javascript
// Redis caching for frequent queries

const redis = require('redis');
const client = redis.createClient();

async function getCampaignPerformance(campaignId) {
  const cacheKey = `campaign:${campaignId}:perf`;

  // Check cache
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from database
  const data = await fetchFromDatabase(campaignId);

  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(data));

  return data;
}
```

### Data Retention Policies

```sql
-- Archive old performance data (keep last 12 months in main table)
CREATE TABLE subject_line_performance_archive (
  LIKE subject_line_performance INCLUDING ALL
);

-- Monthly archive job
CREATE OR REPLACE FUNCTION archive_old_performance_data()
RETURNS void AS $$
BEGIN
  -- Move records older than 12 months to archive
  WITH moved AS (
    DELETE FROM subject_line_performance
    WHERE sent_at < NOW() - INTERVAL '12 months'
    RETURNING *
  )
  INSERT INTO subject_line_performance_archive
  SELECT * FROM moved;

  RAISE NOTICE 'Archived % records', (SELECT COUNT(*) FROM moved);
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('archive-performance', '0 2 1 * *', 'SELECT archive_old_performance_data()');
```

---

## Future Enhancements

### Phase 2 Features (6-12 months)

1. **Machine Learning Integration**
   - Predictive open rate modeling
   - Auto-optimization of variant selection
   - Subject line generation fine-tuning

2. **Advanced Analytics**
   - Time series analysis of open rates
   - Cohort analysis by industry/company size
   - Predictive A/B test duration estimation

3. **Real-Time Optimization**
   - Dynamic variant allocation based on early results
   - Real-time quality scoring updates
   - Live A/B test monitoring dashboard

4. **Integration Enhancements**
   - Instantly.ai webhook integration for real-time tracking
   - Smartlead API integration
   - Email provider ESP integration (SendGrid, Mailgun)

### Schema Evolution

#### Version 2.0 Schema Additions

```sql
-- Machine learning predictions
CREATE TABLE subject_line_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES subject_line_variants(id),
  model_version VARCHAR(50),
  predicted_open_rate DECIMAL(5,2),
  predicted_click_rate DECIMAL(5,2),
  confidence_score DECIMAL(4,3),
  predicted_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test automation
CREATE TABLE test_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(255),
  condition_json JSONB,
  action_json JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subject line templates library
CREATE TABLE subject_line_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255),
  template_pattern VARCHAR(500),
  approach VARCHAR(50),
  psychological_strategy VARCHAR(100),
  avg_open_rate DECIMAL(5,2),
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Conclusion

This schema design provides:

1. **Comprehensive Tracking**: Every subject line variant, quality score, test configuration, and performance metric
2. **Backward Compatibility**: Existing `gmaps_businesses` table enhanced, not replaced
3. **Performance Optimized**: Strategic indexes for common query patterns
4. **Analytics Ready**: Designed for dashboard and reporting needs
5. **Scalable**: Partitioning strategy for growth
6. **Flexible**: JSONB fields for evolving metadata needs

### Next Steps

1. **Week 1**: Execute Phase 1 & 2 migrations (backward-compatible enhancement + core tables)
2. **Week 2**: Execute Phase 3 migration (testing & performance tables)
3. **Week 2**: Migrate existing data with Phase 4 script
4. **Week 3**: Update application code to use new tables
5. **Week 4**: Build analytics dashboards
6. **Month 2**: Launch first A/B tests
7. **Month 3+**: Continuous optimization based on learnings

---

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Next Review:** 2025-11-01
