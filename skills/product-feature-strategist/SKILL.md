---
name: product-feature-strategist
description: Select an MVP feature set from a curated capability library and produce PRD-ready decisions.
---

# Product Feature Strategist

## When to use this skill
Use this skill when the user shares a product problem statement and wants a practical PRD with a prioritized feature set.

## Workflow
1. Read the user problem and identify product goal, audience, and constraints.
2. Load `references/*.md` and shortlist relevant features only.
3. Prioritize the shortlist into P0, P1, and P2 with short rationale.
4. Exclude features that are not MVP-critical and explain why they are deferred.
5. Emit a final machine-readable feature set JSON.

## Prioritization rubric
- **P0**: required for first usable release.
- **P1**: high impact but can ship after MVP.
- **P2**: optional or optimization-focused.

## Constraints
- Do not claim a feature came from references if it was not present.
- Prefer fewer, coherent features over exhaustive lists.
- Respect dependencies before selecting downstream capabilities.
