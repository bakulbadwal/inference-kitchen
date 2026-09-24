# Inference Kitchen: acceptance criteria

Written before the build. Every criterion is checked in a real browser, with numeric ones asserted against `window.IK` (the pure math module) through the console. Units: **GB = 10⁹ bytes** throughout.

## A. The math is right (matches the field guide, Kiely, and the DeepMind scaling book)

| # | Check | Expected |
|---|---|---|
| A1 | 70B dense (80 layers, 8 KV heads, head dim 128), FP8 weights + FP8 KV | weights 70.0 GB; KV/token 163,840 B; 8K context = 1.342 GB/user |
| A2 | Users that fit at 8K, no overhead reserve | H100 → 7 · H200 → 52 · 2×H100 → 67 (guide rounded to ~7 / ~54 / ~69, using 1.3 GB/user) |
| A3 | DeepSeek-V3-class MoE (671B total / 37B active), FP8 | weights 671 GB; 1×B200 (180 GB) = out of memory; 4×B200 (720 GB) holds weights with < 50 GB left; 8×B200 serves real batches |
| A4 | MoE experts touched per decode step, 256 experts, top-8 routing | batch 1 → 3.1%; batch 64 → ~87%; batch 256 → >99.9% |
| A5 | Decode crossover (memory-bound → compute-bound), weights only, equal efficiencies | H100 FP8 70B → batch ≈ 295 (= FLOPs ÷ bandwidth × bytes-per-param ÷ 2) |
| A6 | 70B FP8 on 2×H100, batch 64, 4K avg context | memory-bound; ~2,500–3,000 tok/s aggregate (guide assumption: ~2,500) |
| A7 | Speculative decoding: α = 0.8, k = 4, draft cost 5% | expected tokens/pass 3.36; speedup ≈ 2.8× (Leviathan et al. 2023) |
| A8 | Fleet break-even: 2 GPUs × $2.50/hr, 2,500 tok/s, API $0.90/M | cost at 100% utilization $0.556/M; break-even utilization 61.7% |
| A9 | Replay Tryon (Class 10): half an engineer $90K/yr fixed, owned $19.23/M labels | break-even 283K/day vs frontier ($890/M) · 732K/day vs standard ($356/M) · 15.1M/day vs budget ($35.60/M) |
| A10 | Failure clock at 1 failure / 50,000 GPU-hours | 8 GPUs → ~260 days between failures; 1,000 GPUs → ~50 hours |

## B. The scheduler sandbox behaves like a real engine (same seed, same traffic)

| # | Toggle | Expected direction |
|---|---|---|
| B1 | Static → continuous batching | throughput ↑, median TTFT ↓ |
| B2 | Paged KV on | max concurrent requests ↑ |
| B3 | Giant prompts on, chunked prefill off → on | p99 inter-token latency ↓ |
| B4 | Giant prompts on, disaggregation on | highest goodput of the single-switch options, and lowest p99 inter-token latency among configs that keep median TTFT under 2 s (static batching gets a low p99 only by making people wait ~30 s) |
| B5 | Shared system prompt + prefix caching on | median TTFT ↓ |
| B6 | Goodput shown alongside raw throughput, and can move in opposite directions | demonstrated by at least one preset |

## C. It teaches (every step)

- C1 Every step (0–5 + capstone) is genuinely interactive: sliders, toggles, or drag, and the visuals update live.
- C2 Every step has at least one **predict → reveal** question answered before the result is shown.
- C3 Every step ends with a **"say it out loud"** line that unlocks after interaction.
- C4 The kitchen analogy is introduced in step 0 and every technical term has a hover/tap glossary tip.
- C5 Every step names the field-guide section and Kiely chapter it covers.
- C6 An honesty note says what is exact (memory arithmetic) and what is a teaching model (latency sim).
- C7 Capstone: three client briefs, scored against SLO + budget, as replicas of 1/2/4/8 GPUs; a known-good config passes, and a known-bad config fails for the stated reason. Disaggregation costs GPUs; speculative decoding only helps below the compute-bound batch.
- C8 A field test answered by operating the widgets, graded automatically.

## D. It works

- D1 Opens straight from the file (no server, no build step, no fetch of local files).
- D2 Zero console errors across all steps.
- D3 Responsive: usable at 375 px wide with no horizontal page scroll.
- D4 Styling matches the IB trainer family (dark, gold accent, Marcellus + IBM Plex).
- D5 Progress persists across reloads (localStorage, wrapped so it degrades safely).
- D6 GPU numbers come from the Hyperscale Ledger and are credited on the page.
- D7 A fresh-context adversarial review finds no open correctness issue. (Run 23 Sep 2026: 1 blocker + 7 major + 13 minor found; all fixed and re-verified.)
