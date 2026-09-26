# <Module name>

> Status: Draft | Reviewed · Explored: <YYYY-MM-DD> · Tests: `tests/<module>/` · Pages: `pages/<module>/`

Hierarchy: **Module → Page → Workflow → Business Rule → Test Scenario → Automation Candidate**.
IDs use the module prefix (e.g. `REG`): `P` page, `W` workflow, `BR` business rule, `TS` scenario.

## 1. Pages

| ID      | Page (menu name) | URL | Purpose |
| ------- | ---------------- | --- | ------- |
| XXX-P01 |                  |     |         |

## 2. Workflows

| ID      | Workflow | Page(s) | Steps (short) |
| ------- | -------- | ------- | ------------- |
| XXX-W01 |          | XXX-P01 |               |

## 3. Business rules

Source: **Observed** = seen in the app · **To confirm** = needs the BA/product owner.

| ID       | Rule | Workflow | Source   |
| -------- | ---- | -------- | -------- |
| XXX-BR01 |      | XXX-W01  | Observed |

## 4. Test scenarios

Type: Positive · Negative · Boundary · UI · Integration.

| ID       | Scenario | Rule(s)  | Type     | Priority |
| -------- | -------- | -------- | -------- | -------- |
| XXX-TS01 |          | XXX-BR01 | Positive | P1       |

## 5. Automation candidates

Decision: **Automate** · **Later** · **Manual** (with reason). Data: does the test create real records?

| Scenario | Decision | Layer    | Creates data? | Spec                       | Status       |
| -------- | -------- | -------- | ------------- | -------------------------- | ------------ |
| XXX-TS01 | Automate | UI / API | Yes / No      | `tests/<module>/….spec.ts` | Done / To do |

## Open questions

- …
