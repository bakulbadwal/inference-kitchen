# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages from `master` (https://bakulbadwal.github.io/inference-kitchen/). Must also work opened straight from the file.

## Users

Primary: the author, an MBA (UVA Darden '27) targeting AI-deployment and tech-operating roles. He isn't an engineer, knows the AI stack at a map level, and wants to *learn inference serving by playing* rather than reading a 259-page book. Secondary: people he shares it with (an AI group chat, recruiters and hiring managers seeing it as a portfolio piece).

## Product Purpose

Teach how AI models are served (GPU memory and KV cache, batching, the scheduler, parallelism, fleet economics) through direct manipulation: sliders, toggles, predict-then-reveal questions, a scored capstone and an auto-graded field test. Success: after ~90 minutes of play he can follow and question an inference-engineering conversation without reading Kiely's *Inference Engineering*.

## Positioning

Existing tools are either engineer-grade simulators (CLI, config files) or commodity VRAM calculators. This one is for operators: one governing analogy (a GPU kitchen), the business layer (break-even, pooling, who sells what), his own Darden Class 10 case replayed, and a capstone where you make the serving calls.

## Operating Context

Used at a laptop in study sessions, and on a phone when shared. The steps are done in order (0–5, capstone, field test), but people also jump between them. Progress persists in localStorage.

## Capabilities and Constraints

- Seven steps plus a field test. Every number comes from `js/core.js` (exact arithmetic) or `js/sim.js` (a deterministic teaching model); `ACCEPTANCE.md` lists the verified values.
- GPU specs come from the author's Hyperscale Ledger and must stay credited.
- The honesty note (what's exact vs. a teaching model) must remain.
- The kitchen analogy is the confirmed vocabulary: GPU = kitchen, HBM = counter, weights = recipe books, KV cache = order tickets, engine = head chef, batch = a table served together.

## Brand Commitments

- Name: **Inference Kitchen**.
- The kitchen analogy is binding as vocabulary.
- Must not look like "every AI tool" (dark ground, neon or gold accent, glowing cards) or like a corporate SaaS dashboard (user, 23 Sep 2026).

## Evidence on Hand

Kiely, *Inference Engineering* (local PDF); the author's field guide `~/Documents/reference/inference-engineering-field-guide.md`; research notes in `~/.claude/task-cache/a16z-academy-guides/`; Hyperscale Ledger specs; Darden GBUS 8496 Class 10 (Tryon) numbers. No testimonials, users or metrics exist; don't invent any.

## Product Principles

1. Play first, prose second. Every concept is something you move.
2. Honest about models: exact where exact, labeled where simplified.
3. One analogy, used consistently, fading into the real terms.
4. Numbers must be legible at a glance; style never hides a result.
