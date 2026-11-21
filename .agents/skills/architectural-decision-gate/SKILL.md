---
name: architectural-decision-gate
description: Mandatory pre-task architectural decision and alignment gate. Ensures the user understands, shapes, and directs all foundational design choices before any code is written, analyzing effects, blast radius, and alternative trade-offs, and documenting the rationale for future revision.
---

# 🏛️ Architectural Decision Gate — Pre-Task Alignment & Comprehension Protocol

> **Core Invariant**: **Comprehension Precedes Speed. No Code is Written Until Decisions, Alternatives, and Blast Radii Are Fully Clarified and Documented.**

The `architectural-decision-gate` skill ensures that high-velocity AI development does not leave the engineer behind. It transforms the planning phase into an active architectural collaboration where the engineer:
1. Evaluates all foundational forks and tradeoffs.
2. Decides the technical direction with full knowledge of consequences.
3. Gains a permanent, revisable record in the knowledge base (`antigravity-notes`) for future review and mastery.

---

## ⚡ When to Activate

Activate this skill whenever:
- Starting a new feature, major refactor, or complex task (or when the user invokes `/plan` or `/decision-gate`).
- A task involves more than one valid engineering approach (e.g. state management, schema design, API contract, caching strategy).
- The user expresses concern about keeping up with development velocity or wanting to understand *why* an approach is chosen.

---

## 🛠️ The 4-Step Decision Protocol

Before touching any application source code, execute the following 4 steps:

### Step 1: Decision Framing & Root Goal
Clearly articulate what problem is being solved and isolate the specific technical decisions that need to be made:
- What is the user-facing or system goal?
- What is the core technical bottleneck or design question?
- What are the non-negotiable invariants (performance, type safety, memory, backward compatibility)?

### Step 2: Blast Radius & Effects Mapping
Analyze the ripple effects across the entire stack:
- **Client Impact**: Bundle size, re-render frequency, user experience, error state handling.
- **Server & API Impact**: Latency, connection concurrency, CPU/memory overhead, rate limits.
- **Data Model & State**: Database schema changes, migrations, CRDT synchronizations, caching.
- **Failure Modes**: What happens when network drops? When inputs are malformed? When 50 concurrent users hit the endpoint?

### Step 3: Comparative Trade-Off Matrix (2–3 Concrete Options)
Never present a single path as a fait accompli. Present at least 2 distinct approaches with transparent trade-offs:

| Evaluation Dimension | Option A: [Primary Approach] | Option B: [Alternative Approach] | Option C: [Minimal/Direct Approach] |
|---|---|---|---|
| **Core Architecture** | How it functions technically | Alternative architecture | Simplest possible implementation |
| **Pros** | Key architectural benefits | Key architectural benefits | Minimal effort / low complexity |
| **Cons & Risks** | Maintenance burden, complexity | Edge-case limitations | Scalability limits / technical debt |
| **Blast Radius** | Low / Medium / High | Low / Medium / High | Minimal |
| **Recommendation** | **Recommended** (and why) | Viable fallback | Temporary prototype only |

### Step 4: Knowledge Base Documentation (For Revision & Retention)
Before writing production code, write or update the corresponding Architectural Decision Record (ADR) in `antigravity-notes/codev/decisions/` or `concepts/`:
- Document **Problem Context**
- Document **Chosen Decision**
- Document **Alternatives Considered & Rejected (and Why)**
- Document **Key Revision Takeaways** (bullet points formatted for rapid review before interviews or design sessions).

---

## 🚀 Transition to Autonomous Swarm Execution

Only **after** the user approves the architectural decision:
1. Freeze interface contracts in `@codev/shared` (types and schemas).
2. Unleash the autonomous implementers and test automators.
3. Let the agents handle syntax, typing, and self-healing test cycles autonomously without interrupting the user.
4. Conclude the cycle with a clean, concise walkthrough linking back to the documented architectural decision.
