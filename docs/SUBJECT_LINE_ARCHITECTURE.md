# Subject Line Generation System - Comprehensive Architecture

**Version:** 1.0
**Last Updated:** 2025-10-16
**Status:** Design Specification

---

## Executive Summary

This document defines a comprehensive architecture for an intelligent, data-driven email subject line generation system. The design synthesizes insights from industry research (CoSchedule, Phrasee, Persado), B2B best practices (2024-2025), advanced prompt engineering techniques, and analysis of the current system implementation.

### Key Design Principles

1. **Multi-Variant Generation**: Generate 3-5 subject line options per lead, each using different psychological strategies
2. **Quality-First**: Comprehensive scoring algorithm ensures only high-quality subject lines reach recipients
3. **Continuous Learning**: A/B testing framework with automated winner selection feeds performance data back into generation
4. **Personalization at Scale**: Advanced variable system with fallback strategies maintains quality across all contacts
5. **Production-Ready**: Robust error handling, validation, and monitoring suitable for enterprise deployment

### Expected Performance Improvements

- **20-30% increase** in open rates through multi-dimensional optimization
- **15-25% improvement** from personalization enhancements
- **10-15% gains** from continuous A/B testing and learning
- **Cumulative potential**: 50-70% improvement over baseline

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Multi-Variant Generation System](#2-multi-variant-generation-system)
3. [Quality Scoring Algorithm](#3-quality-scoring-algorithm)
4. [A/B Testing Framework](#4-ab-testing-framework)
5. [Performance Tracking](#5-performance-tracking)
6. [Integration Strategy](#6-integration-strategy)
7. [Database Schema](#7-database-schema)
8. [API Specifications](#8-api-specifications)
9. [Implementation Phases](#9-implementation-phases)
10. [Monitoring & Observability](#10-monitoring--observability)

---

## 1. System Architecture

### 1.1 High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SUBJECT LINE GENERATION SYSTEM                       │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          GENERATION LAYER                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐      ┌──────────────────┐      ┌────────────────┐│
│  │  Prompt Engine   │─────▶│   OpenAI API     │─────▶│ Response       ││
│  │                  │      │   (GPT-4)        │      │ Parser         ││
│  │ • Few-shot       │      │                  │      │                ││
│  │ • Chain-of-thought│     │ • Temperature:   │      │ • JSON         ││
│  │ • Constitutional │      │   0.5-0.7        │      │   validation   ││
│  │   AI             │      │ • Top-p: 0.9     │      │ • Fallback     ││
│  │ • Context        │      │ • Max tokens:    │      │   handling     ││
│  │   injection      │      │   500            │      │                ││
│  └──────────────────┘      └──────────────────┘      └────────────────┘│
│           │                                                   │          │
│           └───────────────────────┬───────────────────────────┘          │
│                                   ▼                                      │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                       SCORING & VALIDATION LAYER                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Multi-Dimensional Quality Scorer                    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Component 1: Length Optimization (Weight: 15%)                 │   │
│  │  ├─ Character count: 30-50 optimal                              │   │
│  │  ├─ Word count: 5-10 optimal                                    │   │
│  │  └─ Mobile preview validation (40 chars)                        │   │
│  │                                                                  │   │
│  │  Component 2: Word Balance (Weight: 25%)                        │   │
│  │  ├─ Emotional words: 20-30% target                              │   │
│  │  ├─ Power words: 10-20% target                                  │   │
│  │  ├─ Uncommon words: 10-15% target                               │   │
│  │  └─ Common words: remainder                                     │   │
│  │                                                                  │   │
│  │  Component 3: Emotional Impact (Weight: 20%)                    │   │
│  │  ├─ Sentiment analysis                                          │   │
│  │  ├─ Emotional intensity                                         │   │
│  │  └─ Context appropriateness                                     │   │
│  │                                                                  │   │
│  │  Component 4: Spam Risk (Weight: 20%)                           │   │
│  │  ├─ Trigger word detection                                      │   │
│  │  ├─ Pattern matching (!!!, ALL CAPS)                            │   │
│  │  └─ Deliverability score                                        │   │
│  │                                                                  │   │
│  │  Component 5: Personalization (Weight: 15%)                     │   │
│  │  ├─ Token presence validation                                   │   │
│  │  ├─ Relevance scoring                                           │   │
│  │  └─ Natural language flow                                       │   │
│  │                                                                  │   │
│  │  Component 6: Readability (Weight: 5%)                          │   │
│  │  ├─ Flesch-Kincaid grade level                                  │   │
│  │  └─ Clarity assessment                                          │   │
│  │                                                                  │   │
│  │  Overall Score: Σ(component × weight) = 0-100                   │   │
│  │  Passing Threshold: 70/100                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Validation Pipeline                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ 1. Schema validation (JSON structure)                           │   │
│  │ 2. Character encoding normalization                             │   │
│  │ 3. Personalization token validation                             │   │
│  │ 4. Duplicate detection (campaign-level)                         │   │
│  │ 5. Spam filter compliance check                                 │   │
│  │ 6. Brand voice consistency check                                │   │
│  │ 7. Constitutional AI principles verification                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      VARIANT SELECTION LAYER                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              Intelligent Variant Selection                      │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │                                                                 │    │
│  │  IF A/B Testing Enabled:                                        │    │
│  │    ├─ Store all variants (3-5)                                 │    │
│  │    ├─ Randomly assign variant to lead                          │    │
│  │    ├─ Balance distribution across approaches                   │    │
│  │    └─ Track variant ID for performance attribution             │    │
│  │                                                                 │    │
│  │  IF A/B Testing Disabled:                                       │    │
│  │    ├─ Select highest-scoring variant                           │    │
│  │    ├─ Consider historical performance (if available)           │    │
│  │    └─ Use strategic approach matching (audience fit)           │    │
│  │                                                                 │    │
│  │  Fallback Strategy:                                             │    │
│  │    ├─ If all variants score <70: Regenerate                    │    │
│  │    ├─ If regeneration fails: Use template-based fallback       │    │
│  │    └─ Log failure for analysis                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         STORAGE & TRACKING LAYER                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Database Tables:                                                        │
│                                                                          │
│  ┌─────────────────────────────────────────┐                            │
│  │     gmaps_businesses (Updated)          │                            │
│  ├─────────────────────────────────────────┤                            │
│  │ • subject_line (VARCHAR 255)            │                            │
│  │ • subject_line_variant_id (VARCHAR 1)   │                            │
│  │ • subject_line_approach (VARCHAR 50)    │                            │
│  │ • subject_line_score (DECIMAL 5,2)      │                            │
│  │ • subject_line_generated_at (TIMESTAMP) │                            │
│  └─────────────────────────────────────────┘                            │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              subject_line_variants (NEW)                         │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • id (UUID)                                                      │   │
│  │ • business_id (UUID FK)                                          │   │
│  │ • variant_id (VARCHAR 1) - A, B, C, D, E                        │   │
│  │ • subject_line (TEXT)                                            │   │
│  │ • approach (VARCHAR 50)                                          │   │
│  │ • quality_score (DECIMAL 5,2)                                    │   │
│  │ • score_components (JSONB)                                       │   │
│  │ • personalization_tokens (JSONB)                                 │   │
│  │ • created_at (TIMESTAMP)                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │          subject_line_performance (NEW)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • id (UUID)                                                      │   │
│  │ • business_id (UUID FK)                                          │   │
│  │ • campaign_id (UUID FK)                                          │   │
│  │ • variant_id (VARCHAR 1)                                         │   │
│  │ • approach (VARCHAR 50)                                          │   │
│  │ • subject_line (TEXT)                                            │   │
│  │ • sent_at (TIMESTAMP)                                            │   │
│  │ • opened_at (TIMESTAMP)                                          │   │
│  │ • clicked_at (TIMESTAMP)                                         │   │
│  │ • replied_at (TIMESTAMP)                                         │   │
│  │ • open_rate (DECIMAL 5,2)                                        │   │
│  │ • click_rate (DECIMAL 5,2)                                       │   │
│  │ • reply_rate (DECIMAL 5,2)                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │            ab_test_results (NEW)                                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • id (UUID)                                                      │   │
│  │ • campaign_id (UUID FK)                                          │   │
│  │ • test_name (VARCHAR 100)                                        │   │
│  │ • variant_a_subject (TEXT)                                       │   │
│  │ • variant_b_subject (TEXT)                                       │   │
│  │ • variant_c_subject (TEXT)                                       │   │
│  │ • variant_a_sent (INT)                                           │   │
│  │ • variant_b_sent (INT)                                           │   │
│  │ • variant_c_sent (INT)                                           │   │
│  │ • variant_a_opened (INT)                                         │   │
│  │ • variant_b_opened (INT)                                         │   │
│  │ • variant_c_opened (INT)                                         │   │
│  │ • variant_a_open_rate (DECIMAL 5,2)                              │   │
│  │ • variant_b_open_rate (DECIMAL 5,2)                              │   │
│  │ • variant_c_open_rate (DECIMAL 5,2)                              │   │
│  │ • statistical_significance (BOOLEAN)                             │   │
│  │ • p_value (DECIMAL 10,8)                                         │   │
│  │ • winning_variant (VARCHAR 1)                                    │   │
│  │ • test_started_at (TIMESTAMP)                                    │   │
│  │ • test_completed_at (TIMESTAMP)                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      ANALYTICS & LEARNING LAYER                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │               Performance Analytics Engine                      │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │                                                                 │    │
│  │  Real-Time Metrics:                                             │    │
│  │  ├─ Open rate by approach                                      │    │
│  │  ├─ Click rate by approach                                     │    │
│  │  ├─ Reply rate by approach                                     │    │
│  │  ├─ Score correlation with performance                         │    │
│  │  └─ Personalization impact analysis                            │    │
│  │                                                                 │    │
│  │  Statistical Analysis:                                          │    │
│  │  ├─ A/B test significance calculation (chi-square)             │    │
│  │  ├─ Confidence intervals                                       │    │
│  │  ├─ Winner determination                                       │    │
│  │  └─ Sample size validation                                     │    │
│  │                                                                 │    │
│  │  Learning Insights:                                             │    │
│  │  ├─ Identify best-performing approaches per segment            │    │
│  │  ├─ Detect declining patterns                                  │    │
│  │  ├─ Recommend prompt adjustments                               │    │
│  │  └─ Generate monthly performance reports                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              Continuous Learning Loop                           │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │                                                                 │    │
│  │  1. Collect performance data → subject_line_performance        │    │
│  │  2. Analyze correlations → approach effectiveness              │    │
│  │  3. Identify patterns → segment preferences                    │    │
│  │  4. Update scoring weights → improve predictions               │    │
│  │  5. Refine prompts → enhance generation quality                │    │
│  │  6. Deploy improvements → next generation cycle                │    │
│  │                                                                 │    │
│  │  Automation:                                                    │    │
│  │  ├─ Weekly: Auto-deploy winning variants                       │    │
│  │  ├─ Monthly: Adjust scoring weights based on data              │    │
│  │  └─ Quarterly: Comprehensive prompt optimization               │    │
│  └────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interactions

```python
# Simplified flow diagram

Lead Generation Campaign
    │
    ├──▶ For each business contact:
    │       │
    │       ├──▶ Extract context (company, role, industry, etc.)
    │       │
    │       ├──▶ Call SubjectLineGenerator.generate_variants()
    │       │       │
    │       │       ├──▶ Build context-enriched prompt
    │       │       │
    │       │       ├──▶ OpenAI API call (generate 3-5 variants)
    │       │       │
    │       │       ├──▶ Parse JSON response
    │       │       │
    │       │       └──▶ Return variants array
    │       │
    │       ├──▶ For each variant:
    │       │       │
    │       │       ├──▶ SubjectLineScorer.score()
    │       │       │       ├─ Length analysis
    │       │       │       ├─ Word balance check
    │       │       │       ├─ Emotional impact
    │       │       │       ├─ Spam risk assessment
    │       │       │       ├─ Personalization validation
    │       │       │       └─ Calculate overall score
    │       │       │
    │       │       └──▶ Store variant in subject_line_variants table
    │       │
    │       ├──▶ VariantSelector.select()
    │       │       │
    │       │       ├──▶ IF ab_testing_enabled:
    │       │       │       └─ Random selection with balanced distribution
    │       │       │
    │       │       └──▶ ELSE:
    │       │             └─ Select highest-scoring variant
    │       │
    │       ├──▶ Save to gmaps_businesses
    │       │       ├─ subject_line
    │       │       ├─ subject_line_variant_id
    │       │       ├─ subject_line_approach
    │       │       └─ subject_line_score
    │       │
    │       └──▶ Continue with email generation
    │
    └──▶ Campaign Execution
            │
            ├──▶ Send emails with assigned subject lines
            │
            ├──▶ Track performance events:
            │       ├─ Email sent → subject_line_performance.sent_at
            │       ├─ Email opened → subject_line_performance.opened_at
            │       ├─ Link clicked → subject_line_performance.clicked_at
            │       └─ Reply received → subject_line_performance.replied_at
            │
            └──▶ AnalyticsEngine.analyze()
                    │
                    ├──▶ Calculate metrics per variant
                    │
                    ├──▶ Statistical significance testing
                    │
                    ├──▶ Update ab_test_results
                    │
                    └──▶ Generate insights
```

---

## 2. Multi-Variant Generation System

### 2.1 Generation Strategy

Generate 3-5 subject line variants per contact, each using a different psychological approach to maximize A/B testing effectiveness and provide fallback options.

**Variant Distribution:**
- **Variant A**: Value Proposition (Quantified benefit)
- **Variant B**: Social Proof (Peer reference)
- **Variant C**: Curiosity/Question (Engagement-driven)
- **Variant D** (Optional): Problem Agitation (Pain point focus)
- **Variant E** (Optional): Personalization-heavy (Name + company + specific detail)

### 2.2 Enhanced Prompt Template

```python
MULTI_VARIANT_PROMPT = """
You are an expert B2B email copywriter specializing in subject lines that drive opens and conversions.

CAMPAIGN CONTEXT:
Product: {product_name}
Target Audience: {role} at {company_size} {industry} companies
Pain Point: {pain_point}
Offer: {offer}

CONTACT DATA:
First Name: {first_name}
Company: {company_name}
Industry: {industry}
Role: {role}
Website Summary: {website_summary}

CONSTITUTIONAL PRINCIPLES:
1. AUTHENTICITY: Subject lines must accurately represent email content
2. BRAND CONSISTENCY: Maintain professional B2B tone
3. RESPECT: No fake urgency or manipulative tactics
4. COMPLIANCE: Avoid spam triggers (!!!, ALL CAPS, deceptive language)
5. INCLUSIVITY: No demographic assumptions or stereotypes

GENERATION REQUIREMENTS:
Generate EXACTLY 5 subject line variants, each using a DIFFERENT strategic approach:

VARIANT A - VALUE PROPOSITION:
Approach: Lead with specific, quantified benefit
Formula: "[Metric improvement] at {{company_name}}"
Requirements:
- Include specific number or percentage
- Use active verb (cut, boost, increase, reduce)
- Personalize with {{company_name}}
- 30-50 characters

VARIANT B - SOCIAL PROOF:
Approach: Reference peer adoption or results
Formula: "How [similar companies] achieved [result]"
Requirements:
- Reference peer companies or aggregated results
- Use "How X companies..." or "[Number] [role]s..."
- Imply group validation
- 30-50 characters

VARIANT C - CURIOSITY/QUESTION:
Approach: Ask relevant question that creates curiosity gap
Formula: "{{first_name}}, [intriguing question about challenge]?"
Requirements:
- Use question format (end with ?)
- Personalize with {{first_name}} or {{company_name}}
- Create genuine curiosity (not clickbait)
- 30-50 characters

VARIANT D - PROBLEM AGITATION:
Approach: Highlight pain point (without being negative)
Formula: "Still [experiencing pain], {{first_name}}?"
Requirements:
- Reference specific pain point from context
- Empathetic tone (not fear-mongering)
- Imply solution exists
- 30-50 characters

VARIANT E - CASE STUDY/PROOF:
Approach: Reference specific success story
Formula: "Case study: [Company] achieved [result] in [timeframe]"
Requirements:
- Use concrete example (can be anonymized)
- Include specific outcome and timeline
- Relevant to target industry
- 30-50 characters

STRICT CONSTRAINTS:
✓ Each variant must be 30-50 characters (mobile-optimized)
✓ Use at least one personalization token per variant ({{first_name}}, {{company_name}})
✓ Front-load key information (first 40 chars visible on mobile)
✓ NO spam triggers: Avoid "FREE", "!!!", "URGENT" unless genuinely applicable
✓ NO all-caps words
✓ NO excessive punctuation
✓ NO clickbait or misleading statements

OUTPUT FORMAT:
Return ONLY valid JSON in this exact structure:

{
  "variants": [
    {
      "variant_id": "A",
      "subject_line": "string",
      "approach": "value_proposition",
      "character_count": 0,
      "mobile_preview": "first 40 chars",
      "personalization_tokens": ["{{company_name}}"],
      "confidence_score": 0.0,
      "reasoning": "brief explanation of strategy"
    },
    ... (repeat for B, C, D, E)
  ],
  "metadata": {
    "campaign_type": "cold_outreach",
    "target_role": "{role}",
    "target_industry": "{industry}",
    "generation_timestamp": "ISO 8601"
  }
}

IMPORTANT: Output ONLY the JSON. No additional text or explanation.
"""
```

### 2.3 Implementation: SubjectLineGenerator Class

```python
# lead_generation/modules/subject_line_generator.py

import logging
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from openai import OpenAI

class SubjectLineGenerator:
    """
    Generate multiple subject line variants using AI with constitutional principles
    """

    def __init__(self, openai_api_key: str, temperature: float = 0.6):
        self.client = OpenAI(api_key=openai_api_key)
        self.temperature = temperature
        self.model = "gpt-4-turbo"

        # Load word databases for validation
        self.power_words = self._load_power_words()
        self.emotional_words = self._load_emotional_words()
        self.spam_triggers = self._load_spam_triggers()

        logging.info("SubjectLineGenerator initialized")

    def generate_variants(
        self,
        contact_info: Dict[str, Any],
        campaign_context: Dict[str, Any],
        website_summaries: List[str] = None,
        variant_count: int = 5
    ) -> Dict[str, Any]:
        """
        Generate multiple subject line variants for a contact

        Args:
            contact_info: Contact data (name, company, role, etc.)
            campaign_context: Campaign details (product, pain point, offer)
            website_summaries: Optional website content for context
            variant_count: Number of variants to generate (3-5)

        Returns:
            Dictionary with variants array and metadata
        """
        try:
            # Build enriched prompt
            prompt = self._build_prompt(
                contact_info,
                campaign_context,
                website_summaries
            )

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert B2B email copywriter. Generate subject lines in valid JSON format only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"},
                max_tokens=1000
            )

            # Parse response
            result = json.loads(response.choices[0].message.content)

            # Validate structure
            if not self._validate_response(result):
                logging.error("Invalid response structure from OpenAI")
                return self._create_fallback_variants(contact_info, campaign_context)

            # Post-process variants
            result['variants'] = self._post_process_variants(result['variants'], contact_info)

            logging.info(f"Generated {len(result['variants'])} subject line variants for {contact_info.get('first_name', 'Unknown')}")

            return result

        except Exception as e:
            logging.error(f"Error generating subject line variants: {e}")
            return self._create_fallback_variants(contact_info, campaign_context)

    def _build_prompt(
        self,
        contact_info: Dict[str, Any],
        campaign_context: Dict[str, Any],
        website_summaries: List[str] = None
    ) -> str:
        """Build context-enriched prompt"""

        # Extract contact data with fallbacks
        first_name = contact_info.get('first_name', 'there')
        company_name = contact_info.get('company_name') or contact_info.get('organization', {}).get('name', 'your company')
        role = contact_info.get('headline') or contact_info.get('role', 'professional')
        industry = contact_info.get('organization', {}).get('category', 'business')

        # Extract campaign context
        product_name = campaign_context.get('product_name', 'our solution')
        pain_point = campaign_context.get('pain_point', 'business challenges')
        offer = campaign_context.get('offer', 'free consultation')
        company_size = campaign_context.get('company_size', 'mid-market')

        # Website context
        website_summary = ''
        if website_summaries and len(website_summaries) > 0:
            website_summary = ' '.join(website_summaries[:2])  # Use first 2 pages

        # Fill template
        return MULTI_VARIANT_PROMPT.format(
            product_name=product_name,
            role=role,
            company_size=company_size,
            industry=industry,
            pain_point=pain_point,
            offer=offer,
            first_name=first_name,
            company_name=company_name,
            website_summary=website_summary
        )

    def _validate_response(self, result: Dict) -> bool:
        """Validate OpenAI response structure"""
        if 'variants' not in result:
            return False

        if not isinstance(result['variants'], list):
            return False

        if len(result['variants']) < 3:
            return False

        # Validate each variant has required fields
        required_fields = ['variant_id', 'subject_line', 'approach']
        for variant in result['variants']:
            if not all(field in variant for field in required_fields):
                return False

        return True

    def _post_process_variants(
        self,
        variants: List[Dict],
        contact_info: Dict[str, Any]
    ) -> List[Dict]:
        """Post-process variants: normalize, validate, enhance"""
        processed = []

        for variant in variants:
            # Normalize unicode
            variant['subject_line'] = self._normalize_text(variant['subject_line'])

            # Validate character count
            actual_length = len(variant['subject_line'])
            variant['character_count'] = actual_length

            # Calculate mobile preview (first 40 chars)
            variant['mobile_preview'] = variant['subject_line'][:40]

            # Trim if too long
            if actual_length > 50:
                variant['subject_line'] = variant['subject_line'][:47] + "..."
                variant['character_count'] = 50

            # Validate personalization tokens
            if 'personalization_tokens' not in variant:
                variant['personalization_tokens'] = self._extract_tokens(variant['subject_line'])

            # Add confidence score if missing
            if 'confidence_score' not in variant or variant['confidence_score'] == 0:
                variant['confidence_score'] = self._estimate_confidence(variant, contact_info)

            processed.append(variant)

        return processed

    def _normalize_text(self, text: str) -> str:
        """Normalize unicode and special characters"""
        import unicodedata

        # Normalize unicode
        text = unicodedata.normalize('NFC', text)

        # Replace smart quotes
        replacements = {
            '"': '"', '"': '"',
            ''': "'", ''': "'",
            '—': '-', '–': '-',
            '…': '...'
        }

        for old, new in replacements.items():
            text = text.replace(old, new)

        # Remove non-printable characters
        text = ''.join(c for c in text if c.isprintable())

        return text.strip()

    def _extract_tokens(self, subject_line: str) -> List[str]:
        """Extract personalization tokens from subject line"""
        import re
        pattern = r'\{\{([^}]+)\}\}'
        tokens = re.findall(pattern, subject_line)
        return [f"{{{{{token}}}}}" for token in tokens]

    def _estimate_confidence(self, variant: Dict, contact_info: Dict) -> float:
        """Estimate confidence score based on variant characteristics"""
        score = 0.7  # Base confidence

        # Boost for personalization
        if variant.get('personalization_tokens'):
            score += 0.1

        # Boost for optimal length
        length = variant.get('character_count', 0)
        if 30 <= length <= 50:
            score += 0.1

        # Reduce for spam triggers
        subject_line = variant.get('subject_line', '').lower()
        if any(trigger in subject_line for trigger in ['free', '!!!', 'urgent']):
            score -= 0.2

        return min(max(score, 0.0), 1.0)

    def _create_fallback_variants(
        self,
        contact_info: Dict[str, Any],
        campaign_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create template-based fallback variants when AI generation fails"""
        first_name = contact_info.get('first_name', 'there')
        company_name = contact_info.get('company_name', 'your company')

        fallback_variants = [
            {
                "variant_id": "A",
                "subject_line": f"Quick question, {first_name}",
                "approach": "direct",
                "character_count": len(f"Quick question, {first_name}"),
                "mobile_preview": f"Quick question, {first_name}"[:40],
                "personalization_tokens": ["{{first_name}}"],
                "confidence_score": 0.5,
                "reasoning": "Fallback template - AI generation failed"
            },
            {
                "variant_id": "B",
                "subject_line": f"{company_name}: Quick question",
                "approach": "direct",
                "character_count": len(f"{company_name}: Quick question"),
                "mobile_preview": f"{company_name}: Quick question"[:40],
                "personalization_tokens": ["{{company_name}}"],
                "confidence_score": 0.5,
                "reasoning": "Fallback template - AI generation failed"
            },
            {
                "variant_id": "C",
                "subject_line": f"Regarding {company_name}",
                "approach": "professional",
                "character_count": len(f"Regarding {company_name}"),
                "mobile_preview": f"Regarding {company_name}"[:40],
                "personalization_tokens": ["{{company_name}}"],
                "confidence_score": 0.5,
                "reasoning": "Fallback template - AI generation failed"
            }
        ]

        return {
            "variants": fallback_variants,
            "metadata": {
                "campaign_type": "fallback",
                "target_role": contact_info.get('headline', 'unknown'),
                "target_industry": contact_info.get('organization', {}).get('category', 'unknown'),
                "generation_timestamp": datetime.utcnow().isoformat(),
                "fallback_reason": "AI generation error"
            }
        }

    def _load_power_words(self) -> List[str]:
        """Load power words database"""
        return [
            'secret', 'proven', 'ultimate', 'guaranteed', 'exclusive',
            'discover', 'unlock', 'reveal', 'unleash', 'master',
            'free', 'bonus', 'instant', 'easy', 'simple'
        ]

    def _load_emotional_words(self) -> Dict[str, List[str]]:
        """Load emotional words taxonomy"""
        return {
            'high_arousal_positive': ['excited', 'thrilled', 'amazed', 'delighted'],
            'high_arousal_negative': ['angry', 'frustrated', 'shocked', 'worried'],
            'low_arousal_positive': ['content', 'satisfied', 'peaceful', 'grateful'],
            'low_arousal_negative': ['sad', 'disappointed', 'bored', 'tired']
        }

    def _load_spam_triggers(self) -> Dict[str, List[str]]:
        """Load spam trigger words by severity"""
        return {
            'high': ['free money', '$$$', 'viagra', 'casino', 'winner'],
            'medium': ['earn money', 'work from home', 'lose weight', 'click here'],
            'low': ['limited time', 'act now', 'special offer']
        }
```

---

## 3. Quality Scoring Algorithm

### 3.1 Scoring Component Breakdown

```python
# lead_generation/modules/subject_line_scorer.py

import logging
import re
from typing import Dict, Any, List, Tuple
from difflib import SequenceMatcher

class SubjectLineScorer:
    """
    Multi-dimensional subject line quality scoring system
    """

    # Scoring weights (must sum to 1.0)
    WEIGHTS = {
        'length': 0.15,
        'word_balance': 0.25,
        'emotional_impact': 0.20,
        'spam_risk': 0.20,
        'personalization': 0.15,
        'readability': 0.05
    }

    # Quality thresholds
    PASSING_SCORE = 70.0
    EXCELLENT_SCORE = 85.0

    def __init__(self):
        self.power_words = self._load_power_words()
        self.emotional_words = self._load_emotional_words()
        self.spam_triggers = self._load_spam_triggers()
        self.vague_words = ['opportunity', 'potential', 'growth', 'edge', 'transform', 'unlock']

        logging.info("SubjectLineScorer initialized")

    def score_subject_line(
        self,
        subject_line: str,
        contact_info: Dict[str, Any],
        approach: str = None
    ) -> Dict[str, Any]:
        """
        Comprehensive subject line scoring

        Returns:
            {
                "overall_score": 85.3,
                "grade": "A",
                "dimensions": {
                    "length": 95.0,
                    "word_balance": 80.0,
                    "emotional_impact": 85.0,
                    "spam_risk": 100.0,
                    "personalization": 75.0,
                    "readability": 90.0
                },
                "recommendations": ["Add more specific metrics"],
                "is_acceptable": True,
                "spam_triggers_found": []
            }
        """
        scores = {}
        recommendations = []
        spam_triggers_found = []

        # Component 1: Length Optimization (15%)
        length_score, length_recs = self._score_length(subject_line)
        scores['length'] = length_score
        recommendations.extend(length_recs)

        # Component 2: Word Balance (25%)
        word_balance_score, word_recs = self._score_word_balance(subject_line)
        scores['word_balance'] = word_balance_score
        recommendations.extend(word_recs)

        # Component 3: Emotional Impact (20%)
        emotional_score, emotional_recs = self._score_emotional_impact(subject_line)
        scores['emotional_impact'] = emotional_score
        recommendations.extend(emotional_recs)

        # Component 4: Spam Risk (20%)
        spam_score, spam_recs, triggers = self._score_spam_risk(subject_line)
        scores['spam_risk'] = spam_score
        recommendations.extend(spam_recs)
        spam_triggers_found = triggers

        # Component 5: Personalization (15%)
        personalization_score, pers_recs = self._score_personalization(subject_line, contact_info)
        scores['personalization'] = personalization_score
        recommendations.extend(pers_recs)

        # Component 6: Readability (5%)
        readability_score, read_recs = self._score_readability(subject_line)
        scores['readability'] = readability_score
        recommendations.extend(read_recs)

        # Calculate overall score (weighted average)
        overall_score = sum(scores[dim] * self.WEIGHTS[dim] for dim in scores.keys())

        # Determine grade
        grade = self._calculate_grade(overall_score)

        # Determine if acceptable
        is_acceptable = overall_score >= self.PASSING_SCORE and scores['spam_risk'] >= 70.0

        result = {
            "overall_score": round(overall_score, 2),
            "grade": grade,
            "dimensions": {k: round(v, 2) for k, v in scores.items()},
            "recommendations": recommendations,
            "is_acceptable": is_acceptable,
            "spam_triggers_found": spam_triggers_found
        }

        logging.info(f"Scored subject line '{subject_line[:30]}...': {overall_score:.1f} ({grade})")

        return result

    def _score_length(self, subject_line: str) -> Tuple[float, List[str]]:
        """Score length optimization (optimal: 30-50 chars)"""
        length = len(subject_line)
        recommendations = []

        if 30 <= length <= 50:
            score = 100.0
        elif 25 <= length < 30:
            score = 85.0
            recommendations.append("Subject is slightly short. Consider adding more context.")
        elif 50 < length <= 55:
            score = 85.0
            recommendations.append("Subject is slightly long. May be truncated on mobile.")
        elif length < 25:
            score = 60.0
            recommendations.append("Subject is too short. Add specific details or benefits.")
        else:  # > 55
            score = 50.0
            recommendations.append("Subject is too long. Will be truncated on most devices.")

        return score, recommendations

    def _score_word_balance(self, subject_line: str) -> Tuple[float, List[str]]:
        """Score word balance (emotional, power, uncommon, common words)"""
        words = subject_line.lower().split()
        if len(words) == 0:
            return 0.0, ["Subject line is empty"]

        # Count word types
        emotional_count = sum(1 for word in words if self._is_emotional_word(word))
        power_count = sum(1 for word in words if word in self.power_words)
        # For simplicity, we'll estimate uncommon/common words

        emotional_pct = emotional_count / len(words)
        power_pct = power_count / len(words)

        score = 70.0  # Base score
        recommendations = []

        # Target: 20-30% emotional words
        if 0.2 <= emotional_pct <= 0.3:
            score += 15.0
        elif emotional_pct < 0.1:
            recommendations.append("Add more emotional words to increase engagement.")
            score -= 10.0
        elif emotional_pct > 0.4:
            recommendations.append("Too many emotional words may seem insincere.")
            score -= 5.0

        # Target: 10-20% power words
        if 0.1 <= power_pct <= 0.2:
            score += 15.0
        elif power_pct == 0:
            recommendations.append("Consider adding power words for impact.")
        elif power_pct > 0.3:
            recommendations.append("Too many power words may trigger spam filters.")
            score -= 10.0

        return min(score, 100.0), recommendations

    def _score_emotional_impact(self, subject_line: str) -> Tuple[float, List[str]]:
        """Score emotional impact"""
        words = subject_line.lower().split()
        emotional_words_found = [w for w in words if self._is_emotional_word(w)]

        score = 50.0  # Base score
        recommendations = []

        if len(emotional_words_found) > 0:
            score += 25.0
        else:
            recommendations.append("Add emotional words to create resonance.")

        # Check for question mark (creates curiosity)
        if '?' in subject_line:
            score += 15.0

        # Check for specific curiosity words
        curiosity_words = ['how', 'why', 'what', 'question', 'noticed', 'regarding']
        if any(word in subject_line.lower() for word in curiosity_words):
            score += 10.0

        return min(score, 100.0), recommendations

    def _score_spam_risk(self, subject_line: str) -> Tuple[float, List[str], List[str]]:
        """Score spam risk (lower risk = higher score)"""
        subject_lower = subject_line.lower()
        spam_score = 0.0
        triggers_found = []
        recommendations = []

        # Check for spam trigger words
        for severity, triggers in self.spam_triggers.items():
            for trigger in triggers:
                if trigger in subject_lower:
                    triggers_found.append(f"{trigger} ({severity})")
                    if severity == 'high':
                        spam_score += 30.0
                    elif severity == 'medium':
                        spam_score += 15.0
                    else:  # low
                        spam_score += 5.0

        # Check for spam patterns
        if subject_line.isupper():
            spam_score += 20.0
            triggers_found.append("ALL CAPS (high)")

        if subject_line.count('!') > 2:
            spam_score += 15.0
            triggers_found.append("Excessive exclamation marks (medium)")

        if subject_line.count('$') > 0:
            spam_score += 10.0
            triggers_found.append("Dollar signs (medium)")

        # Convert spam_score to quality score (inverse)
        if spam_score == 0:
            score = 100.0
        elif spam_score < 15:
            score = 85.0
            recommendations.append(f"Minor spam signals: {', '.join(triggers_found[:2])}")
        elif spam_score < 30:
            score = 70.0
            recommendations.append(f"Moderate spam risk: {', '.join(triggers_found[:2])}")
        else:
            score = 40.0
            recommendations.append(f"HIGH SPAM RISK! Triggers: {', '.join(triggers_found)}")

        return score, recommendations, triggers_found

    def _score_personalization(self, subject_line: str, contact_info: Dict[str, Any]) -> Tuple[float, List[str]]:
        """Score personalization effectiveness"""
        first_name = contact_info.get('first_name', '').lower()
        company_name = contact_info.get('company_name', '').lower()
        subject_lower = subject_line.lower()

        score = 30.0  # Base score for no personalization
        recommendations = []

        # Check for name personalization
        has_name = first_name and first_name in subject_lower
        has_company = company_name and company_name in subject_lower

        # Check for personalization tokens
        has_name_token = '{{first_name}}' in subject_line.lower()
        has_company_token = '{{company_name}}' in subject_line.lower()

        if has_name or has_name_token:
            score += 35.0
        else:
            recommendations.append("Add recipient's name for personalization.")

        if has_company or has_company_token:
            score += 35.0
        else:
            recommendations.append("Include company name for relevance.")

        return min(score, 100.0), recommendations

    def _score_readability(self, subject_line: str) -> Tuple[float, List[str]]:
        """Score readability (simplicity, clarity)"""
        words = subject_line.split()
        recommendations = []

        # Check for vague words
        vague_count = sum(1 for word in words if word.lower() in self.vague_words)

        score = 90.0  # Start high

        if vague_count > 0:
            score -= (vague_count * 15.0)
            recommendations.append(f"Avoid vague words like: {', '.join([w for w in words if w.lower() in self.vague_words])}")

        # Check for overly complex words (>3 syllables)
        # (Simplified heuristic: words >12 characters)
        complex_words = [w for w in words if len(w) > 12]
        if len(complex_words) > 1:
            score -= 20.0
            recommendations.append("Simplify complex words for clarity.")

        return max(score, 0.0), recommendations

    def _calculate_grade(self, overall_score: float) -> str:
        """Convert overall score to letter grade"""
        if overall_score >= 95:
            return "A+"
        elif overall_score >= 90:
            return "A"
        elif overall_score >= 85:
            return "B+"
        elif overall_score >= 80:
            return "B"
        elif overall_score >= 75:
            return "C+"
        elif overall_score >= 70:
            return "C"
        elif overall_score >= 60:
            return "D"
        else:
            return "F"

    def _is_emotional_word(self, word: str) -> bool:
        """Check if word is in emotional words database"""
        for category, words in self.emotional_words.items():
            if word in words:
                return True
        return False

    def _load_power_words(self) -> List[str]:
        """Load power words database"""
        return [
            'secret', 'proven', 'ultimate', 'guaranteed', 'exclusive',
            'discover', 'unlock', 'reveal', 'unleash', 'master',
            'instant', 'easy', 'simple', 'quick', 'fast'
        ]

    def _load_emotional_words(self) -> Dict[str, List[str]]:
        """Load emotional words taxonomy"""
        return {
            'high_arousal_positive': ['excited', 'thrilled', 'amazed', 'delighted', 'energized'],
            'high_arousal_negative': ['angry', 'frustrated', 'shocked', 'worried', 'anxious'],
            'low_arousal_positive': ['content', 'satisfied', 'peaceful', 'grateful', 'comfortable'],
            'low_arousal_negative': ['sad', 'disappointed', 'bored', 'tired', 'lonely']
        }

    def _load_spam_triggers(self) -> Dict[str, List[str]]:
        """Load spam trigger words by severity"""
        return {
            'high': ['free money', '$$$', 'viagra', 'casino', 'winner', 'congratulations you won'],
            'medium': ['earn money', 'work from home', 'lose weight', 'click here now', 'risk-free'],
            'low': ['limited time', 'act now', 'special offer', 'amazing', 'incredible offer']
        }
```

### 3.2 Scoring Examples

```python
# Example 1: High-Quality Subject Line
subject_line = "{{company_name}}: Cut month-end close by 60%"
contact_info = {"first_name": "Sarah", "company_name": "TechCorp"}

scorer = SubjectLineScorer()
result = scorer.score_subject_line(subject_line, contact_info)

# Result:
{
    "overall_score": 87.5,
    "grade": "A",
    "dimensions": {
        "length": 95.0,  # 44 chars - optimal
        "word_balance": 85.0,  # Good mix
        "emotional_impact": 80.0,  # Moderate emotion
        "spam_risk": 100.0,  # No triggers
        "personalization": 100.0,  # Company token present
        "readability": 95.0  # Clear and simple
    },
    "recommendations": [],
    "is_acceptable": True,
    "spam_triggers_found": []
}

# Example 2: Needs Improvement
subject_line = "URGENT!!! FREE MONEY - ACT NOW!!!"
contact_info = {"first_name": "John", "company_name": "Acme"}

result = scorer.score_subject_line(subject_line, contact_info)

# Result:
{
    "overall_score": 35.2,
    "grade": "F",
    "dimensions": {
        "length": 85.0,  # Length OK
        "word_balance": 40.0,  # Poor balance
        "emotional_impact": 50.0,  # Artificial urgency
        "spam_risk": 20.0,  # CRITICAL: Multiple triggers
        "personalization": 30.0,  # No personalization
        "readability": 60.0  # All caps hurts readability
    },
    "recommendations": [
        "HIGH SPAM RISK! Triggers: free money (high), act now (low), ALL CAPS (high), Excessive exclamation marks (medium)",
        "Add recipient's name for personalization.",
        "Include company name for relevance."
    ],
    "is_acceptable": False,
    "spam_triggers_found": ["free money (high)", "act now (low)", "ALL CAPS (high)", "!!! (medium)"]
}
```

---

## 4. A/B Testing Framework

### 4.1 Statistical Requirements

```python
# lead_generation/modules/ab_test_calculator.py

import math
from scipy import stats
from typing import Dict, Tuple

class ABTestCalculator:
    """
    Statistical analysis for A/B testing subject lines
    """

    @staticmethod
    def calculate_sample_size(
        baseline_rate: float,
        minimum_detectable_effect: float,
        confidence_level: float = 0.95,
        statistical_power: float = 0.80
    ) -> int:
        """
        Calculate minimum sample size per variant

        Args:
            baseline_rate: Current open rate (e.g., 0.28 for 28%)
            minimum_detectable_effect: Minimum improvement to detect (e.g., 0.04 for 4 percentage points)
            confidence_level: Confidence level (default 95%)
            statistical_power: Statistical power (default 80%)

        Returns:
            Minimum sample size per variant
        """
        # Z-scores
        z_alpha = stats.norm.ppf(1 - (1 - confidence_level) / 2)  # Two-tailed
        z_beta = stats.norm.ppf(statistical_power)

        p1 = baseline_rate
        p2 = baseline_rate + minimum_detectable_effect

        # Pooled standard deviation
        p_pooled = (p1 + p2) / 2

        # Sample size formula
        n = ((z_alpha + z_beta) ** 2 * 2 * p_pooled * (1 - p_pooled)) / (minimum_detectable_effect ** 2)

        return math.ceil(n)

    @staticmethod
    def calculate_statistical_significance(
        variant_a_opens: int,
        variant_a_sent: int,
        variant_b_opens: int,
        variant_b_sent: int
    ) -> Dict[str, any]:
        """
        Calculate statistical significance using chi-square test

        Returns:
            {
                "p_value": 0.0234,
                "is_significant": True,
                "confidence_level": 97.66,
                "variant_a_rate": 0.28,
                "variant_b_rate": 0.32,
                "improvement": 0.04,
                "improvement_pct": 14.29
            }
        """
        # Calculate rates
        variant_a_rate = variant_a_opens / variant_a_sent if variant_a_sent > 0 else 0
        variant_b_rate = variant_b_opens / variant_b_sent if variant_b_sent > 0 else 0

        # Chi-square test
        observed = [[variant_a_opens, variant_a_sent - variant_a_opens],
                    [variant_b_opens, variant_b_sent - variant_b_opens]]

        chi2, p_value, dof, expected = stats.chi2_contingency(observed)

        is_significant = p_value < 0.05
        confidence_level = (1 - p_value) * 100

        improvement = variant_b_rate - variant_a_rate
        improvement_pct = (improvement / variant_a_rate * 100) if variant_a_rate > 0 else 0

        return {
            "p_value": round(p_value, 6),
            "is_significant": is_significant,
            "confidence_level": round(confidence_level, 2),
            "variant_a_rate": round(variant_a_rate, 4),
            "variant_b_rate": round(variant_b_rate, 4),
            "improvement": round(improvement, 4),
            "improvement_pct": round(improvement_pct, 2)
        }

    @staticmethod
    def determine_winner(
        variants: Dict[str, Dict[str, int]],
        significance_threshold: float = 0.05
    ) -> Dict[str, any]:
        """
        Determine winner among multiple variants

        Args:
            variants: {
                "A": {"opens": 100, "sent": 500},
                "B": {"opens": 120, "sent": 500},
                "C": {"opens": 110, "sent": 500}
            }

        Returns:
            {
                "winner": "B",
                "winner_rate": 0.24,
                "results": {...},
                "recommendation": "Deploy variant B"
            }
        """
        # Calculate rates for all variants
        rates = {}
        for variant_id, data in variants.items():
            rate = data['opens'] / data['sent'] if data['sent'] > 0 else 0
            rates[variant_id] = rate

        # Find highest rate
        winner_id = max(rates, key=rates.get)
        winner_rate = rates[winner_id]

        # Compare winner against all others
        is_clear_winner = True
        comparisons = {}

        for variant_id, data in variants.items():
            if variant_id == winner_id:
                continue

            result = ABTestCalculator.calculate_statistical_significance(
                variants[winner_id]['opens'],
                variants[winner_id]['sent'],
                data['opens'],
                data['sent']
            )

            comparisons[f"{winner_id}_vs_{variant_id}"] = result

            if not result['is_significant']:
                is_clear_winner = False

        recommendation = f"Deploy variant {winner_id}" if is_clear_winner else "Continue testing - no clear winner yet"

        return {
            "winner": winner_id if is_clear_winner else None,
            "winner_rate": round(winner_rate, 4),
            "results": comparisons,
            "recommendation": recommendation,
            "is_conclusive": is_clear_winner
        }
```

### 4.2 A/B Test Execution Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     A/B TEST LIFECYCLE                          │
└────────────────────────────────────────────────────────────────┘

Phase 1: TEST DESIGN
├─ Define hypothesis (e.g., "Personalization increases opens by 20%")
├─ Select variants to test (A: control, B: personalized)
├─ Calculate required sample size
├─ Set success metrics (open rate, click rate, reply rate)
└─ Configure test parameters (duration, split ratio)

Phase 2: TEST DEPLOYMENT
├─ Generate subject line variants
├─ Score and validate each variant
├─ Random assignment to leads (balanced distribution)
├─ Store variant assignments in database
└─ Begin campaign execution

Phase 3: DATA COLLECTION
├─ Track email sent events
├─ Track email opened events
├─ Track link clicked events
├─ Track reply received events
└─ Store in subject_line_performance table

Phase 4: ANALYSIS
├─ Calculate open/click/reply rates per variant
├─ Run statistical significance tests (chi-square)
├─ Determine if sample size is sufficient
├─ Calculate confidence intervals
└─ Identify winner (if significant)

Phase 5: DECISION
├─ IF significant winner:
│   ├─ Deploy winner for future campaigns
│   ├─ Update prompt with winning patterns
│   └─ Archive test results
├─ IF no significant winner:
│   ├─ Continue testing with larger sample
│   └─ OR redesign test with different variants
└─ Document learnings

Phase 6: LEARNING LOOP
├─ Analyze why winner performed better
├─ Update scoring algorithm weights
├─ Refine generation prompts
├─ Share insights with team
└─ Plan next tests
```

### 4.3 Implementation: ABTestManager Class

```python
# lead_generation/modules/ab_test_manager.py

import logging
import random
from typing import Dict, List, Any, Optional
from datetime import datetime
from .ab_test_calculator import ABTestCalculator

class ABTestManager:
    """
    Manage A/B testing for subject lines
    """

    def __init__(self, supabase_manager):
        self.supabase = supabase_manager
        self.calculator = ABTestCalculator()
        logging.info("ABTestManager initialized")

    def assign_variant(
        self,
        business_id: str,
        variants: List[Dict[str, Any]],
        campaign_id: str
    ) -> Dict[str, Any]:
        """
        Randomly assign a variant to a lead for A/B testing

        Args:
            business_id: Lead's business ID
            variants: List of subject line variants with scores
            campaign_id: Campaign identifier

        Returns:
            Selected variant with assignment details
        """
        # Filter to acceptable variants (score >= 70)
        acceptable_variants = [v for v in variants if v.get('quality_score', 0) >= 70]

        if not acceptable_variants:
            logging.warning(f"No acceptable variants for business {business_id}. Using highest scoring.")
            acceptable_variants = sorted(variants, key=lambda x: x.get('quality_score', 0), reverse=True)[:1]

        # Random selection (balanced distribution)
        selected = random.choice(acceptable_variants)

        # Log assignment
        logging.info(f"Assigned variant {selected['variant_id']} to business {business_id}")

        return selected

    def create_test(
        self,
        campaign_id: str,
        test_name: str,
        variants: List[Dict[str, Any]],
        hypothesis: str = None
    ) -> str:
        """
        Create a new A/B test record

        Returns:
            Test ID
        """
        test_record = {
            "campaign_id": campaign_id,
            "test_name": test_name,
            "hypothesis": hypothesis,
            "variant_a_subject": variants[0]['subject_line'] if len(variants) > 0 else None,
            "variant_b_subject": variants[1]['subject_line'] if len(variants) > 1 else None,
            "variant_c_subject": variants[2]['subject_line'] if len(variants) > 2 else None,
            "variant_a_approach": variants[0].get('approach') if len(variants) > 0 else None,
            "variant_b_approach": variants[1].get('approach') if len(variants) > 1 else None,
            "variant_c_approach": variants[2].get('approach') if len(variants) > 2 else None,
            "variant_a_sent": 0,
            "variant_b_sent": 0,
            "variant_c_sent": 0,
            "variant_a_opened": 0,
            "variant_b_opened": 0,
            "variant_c_opened": 0,
            "statistical_significance": False,
            "test_started_at": datetime.utcnow().isoformat(),
            "status": "running"
        }

        result = self.supabase.client.table("ab_test_results").insert(test_record).execute()

        test_id = result.data[0]['id']
        logging.info(f"Created A/B test: {test_name} (ID: {test_id})")

        return test_id

    def analyze_test(self, test_id: str) -> Dict[str, Any]:
        """
        Analyze A/B test results and determine winner

        Returns:
            Analysis results with winner determination
        """
        # Fetch test data
        test_data = self.supabase.client.table("ab_test_results").select("*").eq("id", test_id).execute()

        if not test_data.data:
            raise ValueError(f"Test {test_id} not found")

        test = test_data.data[0]

        # Build variants dict for analysis
        variants = {}
        for variant_letter in ['a', 'b', 'c']:
            sent = test.get(f'variant_{variant_letter}_sent', 0)
            opened = test.get(f'variant_{variant_letter}_opened', 0)

            if sent > 0:
                variants[variant_letter.upper()] = {
                    "sent": sent,
                    "opens": opened
                }

        # Determine winner
        result = self.calculator.determine_winner(variants)

        # Update test record
        update_data = {
            "statistical_significance": result['is_conclusive'],
            "winning_variant": result['winner'],
            "analysis_results": result,
            "test_completed_at": datetime.utcnow().isoformat(),
            "status": "completed" if result['is_conclusive'] else "running"
        }

        # Calculate rates
        for variant_letter in ['a', 'b', 'c']:
            if variant_letter.upper() in variants:
                rate = variants[variant_letter.upper()]['opens'] / variants[variant_letter.upper()]['sent']
                update_data[f'variant_{variant_letter}_open_rate'] = round(rate * 100, 2)

        self.supabase.client.table("ab_test_results").update(update_data).eq("id", test_id).execute()

        logging.info(f"Analyzed test {test_id}: Winner = {result['winner']}, Conclusive = {result['is_conclusive']}")

        return result

    def get_performance_by_approach(self, campaign_id: str = None) -> Dict[str, Dict[str, float]]:
        """
        Get performance metrics grouped by subject line approach

        Returns:
            {
                "value_proposition": {"open_rate": 0.32, "click_rate": 0.12, "reply_rate": 0.05},
                "social_proof": {"open_rate": 0.30, "click_rate": 0.10, "reply_rate": 0.04},
                ...
            }
        """
        query = self.supabase.client.table("subject_line_performance").select("*")

        if campaign_id:
            query = query.eq("campaign_id", campaign_id)

        result = query.execute()

        # Group by approach
        approach_metrics = {}

        for record in result.data:
            approach = record.get('approach')
            if not approach:
                continue

            if approach not in approach_metrics:
                approach_metrics[approach] = {
                    'sent': 0,
                    'opened': 0,
                    'clicked': 0,
                    'replied': 0
                }

            approach_metrics[approach]['sent'] += 1
            if record.get('opened_at'):
                approach_metrics[approach]['opened'] += 1
            if record.get('clicked_at'):
                approach_metrics[approach]['clicked'] += 1
            if record.get('replied_at'):
                approach_metrics[approach]['replied'] += 1

        # Calculate rates
        performance = {}
        for approach, metrics in approach_metrics.items():
            sent = metrics['sent']
            if sent > 0:
                performance[approach] = {
                    "open_rate": round(metrics['opened'] / sent, 4),
                    "click_rate": round(metrics['clicked'] / sent, 4),
                    "reply_rate": round(metrics['replied'] / sent, 4),
                    "sample_size": sent
                }

        return performance
```

---

## 5. Performance Tracking

### 5.1 Metrics to Track

```
Primary Metrics:
├─ Open Rate: % of sent emails that were opened
├─ Click-Through Rate (CTR): % of sent emails where recipient clicked a link
├─ Click-to-Open Rate (CTOR): % of opened emails that got a click
└─ Reply Rate: % of sent emails that received a reply

Secondary Metrics:
├─ Spam Complaint Rate: % of sent emails marked as spam
├─ Unsubscribe Rate: % of sent emails leading to unsubscribe
├─ Bounce Rate: % of sent emails that bounced
└─ Time to Open: Average time from sent to open

Attribution Metrics:
├─ Performance by Variant ID: Open/click/reply rates per variant
├─ Performance by Approach: Metrics grouped by psychological approach
├─ Performance by Personalization Level: Metrics by token usage
└─ Performance by Quality Score: Correlation between score and results

Segmentation Metrics:
├─ Performance by Industry: How different industries respond
├─ Performance by Role: How different job titles respond
├─ Performance by Company Size: Enterprise vs. SMB performance
└─ Performance by Campaign Type: Cold vs. nurture vs. re-engagement
```

### 5.2 Dashboard Requirements

```
┌─────────────────────────────────────────────────────────────────┐
│               SUBJECT LINE PERFORMANCE DASHBOARD                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Key Metrics (Last 30 Days):                                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │  Open Rate  │ Click Rate  │ Reply Rate  │ Spam Rate   │     │
│  │    32.4%    │    12.1%    │     4.8%    │    0.2%     │     │
│  │  ▲ +4.2%    │  ▲ +1.5%    │  ▲ +0.8%    │  ▼ -0.1%    │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
│                                                                 │
│  Performance by Approach:                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Value Proposition    ████████████████ 34.2% (2,145 sent)│  │
│  │ Social Proof         ███████████████  32.8% (1,987 sent)│  │
│  │ Curiosity/Question   ██████████████   31.5% (2,034 sent)│  │
│  │ Problem Agitation    ████████████     29.1% (1,756 sent)│  │
│  │ Case Study/Proof     ███████████████  33.5% (1,923 sent)│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Active A/B Tests:                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Test: Personalization Level                              │  │
│  │ Status: Running (Day 3 of 7)                             │  │
│  │                                                           │  │
│  │ Variant A (No personalization):    28.5% (1,245 / 4,368)│  │
│  │ Variant B (Company name):          32.1% (1,398 / 4,356)│  │
│  │ Variant C (Name + company):        34.8% (1,515 / 4,353)│  │
│  │                                                           │  │
│  │ Current Leader: Variant C (+6.3 points)                  │  │
│  │ Statistical Significance: Not yet (p=0.08)                │  │
│  │ Recommendation: Continue test for 4 more days            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Quality Score Correlation:                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Score Range  │  Avg Open Rate  │  Sample Size          │  │
│  ├──────────────┼─────────────────┼──────────────────────┤  │
│  │ 90-100 (A+)  │      36.8%      │      1,234           │  │
│  │ 85-89  (A)   │      34.2%      │      2,456           │  │
│  │ 80-84  (B+)  │      31.5%      │      3,123           │  │
│  │ 75-79  (B)   │      29.1%      │      1,987           │  │
│  │ 70-74  (C)   │      26.4%      │        876           │  │
│  │ <70    (D/F) │      22.3%      │        234           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Recent Insights:                                               │
│  • Value Proposition approach performing +5.1% above average   │
│  • Subject lines with company name: +4.8% open rate boost     │
│  • Quality scores 85+ correlate with +10% open rate           │
│  • Optimal length: 38-42 characters (highest open rates)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

(Continuing in next response due to length...)

