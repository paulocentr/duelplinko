# RTP Analysis

## What Was Tested

- Outcome-to-payout mapping correctness
- Advertised RTP vs. actual game behavior
- Independent theoretical RTP calculation using full-precision API multipliers
- Monte Carlo simulation convergence (27,000,000 rounds)
- Empirical RTP from 1,080 live bets

## What This Means for Players

The house edge is consistent and transparent. Payouts cannot be altered post-roll. The game returns the stated percentage over time. All risk levels target the same RTP (~99.9%) with different variance profiles.

## Verdict Summary

| Check | Result | Finding |
|-------|--------|---------|
| Theoretical RTP independently verified | ✅ Pass | Official API multipliers sum to 99.9000% RTP |
| Simulation convergence | ✅ Pass | 27M rounds converge within expected statistical bounds |
| RTP consistent across risk levels | ✅ Pass | All risk levels target same ~99.9% RTP |
| House edge matches `effective_edge` field | ✅ Pass | 0.1% edge confirmed independently |

**Overall Verdict:** RTP behaves as advertised.

## What Is RTP?

Return to Player (RTP) is the percentage of total wagered money that a game returns to players over time. An RTP of 99.9% means that for every $1,000 wagered in aggregate, the game returns $999 and the house retains $1. RTP is a long-run statistical property — individual sessions will vary significantly due to variance.

## Server-Reported House Edge

Duel.com reports the house edge for each bet via the `effective_edge` field in the API response. In our dataset:

- **Standard bets (1,015 of 1,080):** `effective_edge = 0.1` → 0.1% house edge → **99.9% RTP**
- **Zero Edge bets (65 of 1,080):** `effective_edge = 0` → 0% house edge → **100% RTP**

Zero-edge bets apply a 0.1% rakeback at the transaction level, cancelling the standard house edge. The multiplier tables are identical for zero-edge and standard bets. In our dataset, approximately 6% of bets received zero-edge status, distributed across all risk levels and row configurations. **[Evidence: E19, E42]**

## Independent Theoretical Verification

### Methodology

We independently calculated the theoretical RTP for each game configuration using:

1. The binomial probability distribution: `P(slot = k) = C(n, k) / 2^n`
2. The official multiplier values from Duel's API endpoint `GET /api/v2/plinko/config`
3. The formula: `RTP = Σ P(slot_k) × multiplier(slot_k)` for all k from 0 to n

This calculation uses the official API multiplier tables and the mathematical properties of the algorithm to independently verify the stated house edge.

### Worked Example: Medium Risk, 8 Rows

Using official multiplier values from Duel's API endpoint `GET /api/v2/plinko/config`:

| Slot | P(slot) = C(8,k)/256 | API Multiplier | P × M |
|------|----------------------|---------------|-------|
| 0    | 1/256 = 0.00390625   | 13.13061611   | 0.051291 |
| 1    | 8/256 = 0.03125000   | 3.03014218    | 0.094692 |
| 2    | 28/256 = 0.10937500  | 1.31306161    | 0.143553 |
| 3    | 56/256 = 0.21875000  | 0.70703318    | 0.154664 |
| 4    | 70/256 = 0.27343750  | 0.40401896    | 0.110474 |
| 5    | 56/256 = 0.21875000  | 0.70703318    | 0.154664 |
| 6    | 28/256 = 0.10937500  | 1.31306161    | 0.143553 |
| 7    | 8/256 = 0.03125000   | 3.03014218    | 0.094692 |
| 8    | 1/256 = 0.00390625   | 13.13061611   | 0.051291 |
| **Total** | **1.00000000** | | **0.9990** |

```
Theoretical RTP = 0.9990 = 99.9000%
House Edge = 1 - 0.9990 = 0.001000 = 0.1000%
```

This independently confirms the `effective_edge = 0.1` (0.1% house edge) claim exactly.

**Note on display vs API precision:** The game UI shows "0.4x" for the center slot, but the official API returns `0.40401896`. Using display-rounded values produces RTP of ~98.9%, which is misleading. The official API multiplier tables (available via `GET /api/v2/plinko/config`) are the source of truth for payout calculations and RTP verification.

### Results by Configuration

Due to the volume of data (27 configurations), we present representative results using official API multipliers:

**8-Row Configurations (all slots observed):**

| Risk | Calculated RTP (API precision) |
|------|-------------------------------|
| Low  | ~99.9% |
| Medium | 99.9000% (exact calculation shown above) |
| High | ~99.9% |

For all row counts, the theoretical RTP was computed using the complete official multiplier tables from the API. Our dataset of 1,080 live bets covered 217 of the ~243 possible (risk, rows, slot) combinations, and all observed multipliers matched the official tables exactly.

**[Evidence: E45, E46]**

## Monte Carlo Simulation

We ran a Monte Carlo simulation of 27,000,000 rounds (1,000,000 per configuration) using API-precision multipliers and synchronous HMAC-SHA256 to verify that simulated RTP converges to theoretical values.

### Simulation Configuration

| Parameter | Value |
|-----------|-------|
| Total rounds | 27,000,000 |
| Rounds per configuration | 1,000,000 |
| Configurations | 27 (3 risks × 9 rows) |
| Multiplier source | Official API tables (via `GET /api/v2/plinko/config`) |
| HMAC implementation | Sync `crypto.createHmac` with hex-decoded key |
| Execution time | 522 seconds (~8.7 minutes) |

### Convergence Results (Selected Modes)

| Mode | Simulated RTP | Theoretical RTP | Deviation | Std Error |
|------|--------------|----------------|-----------|-----------|
| low_8rows | 99.97% | 99.90% | +0.072% | ±0.057% |
| low_16rows | 99.91% | 99.90% | +0.014% | ±0.033% |
| medium_8rows | 100.06% | 99.90% | +0.165% | ±0.126% |
| medium_16rows | 99.91% | 99.90% | +0.013% | ±0.146% |
| high_8rows | 100.26% | 99.90% | +0.364% | ±0.271% |
| high_16rows | 99.40% | 99.90% | -0.497% | ±0.604% |
| **Aggregate** | **99.87%** | **99.90%** | **-0.033%** | |

### High-Variance Mode Convergence

High-risk, high-row configurations (e.g., `high_16rows`) show the largest deviations. This is expected: the 1,000x jackpot slot at probability 1/65,536 means only ~15 jackpot hits are expected in 1,000,000 rounds. Random variation in the jackpot count produces multi-percent RTP swings. These deviations fall within the 5σ tolerance band used for per-configuration assertions.

Full simulation data is available in `outputs/plinko/simulation-summary.json`. **[Evidence: E52, E53, E54]**

## Empirical RTP from Live Testing

> **Note:** Live bet data demonstrates determinism, parity, payout formula correctness, seed integrity, and nonce sequencing. It is not used as RTP evidence — RTP is proven by mathematical calculation and Monte Carlo simulation above. The figures below illustrate variance behavior at small sample sizes.

### Per-Phase Results

| Phase | Risk Level | Bets | Total Wagered | Total Won | Empirical RTP |
|-------|-----------|------|---------------|-----------|---------------|
| A | Low | 360 | $3.602 | $3.498 | 97.13% |
| B | Medium | 360 | $3.602 | $3.815 | 105.91% |
| C | High | 360 | $3.602 | $3.933 | 109.20% |
| **All** | **Combined** | **1,080** | **$10.805** | **$11.246** | **104.08%** |

**[Evidence: E41, E47]**

### Variance Explanation

The empirical RTP of 104.08% exceeds the theoretical 99.9% by 4.18 percentage points. This deviation illustrates the magnitude of short-term variance at small sample sizes and does not indicate any systematic bias. These figures are not used as RTP evidence.

**Why High risk phases inflate the empirical RTP:**

In High risk configurations, the majority of bets pay 0.2x (a loss of 80% of the wager), but rare edge-slot hits pay 29x to 1000x. A single lucky hit on a high-multiplier slot can dramatically shift the session RTP upward.

Consider Phase C (High risk, 360 bets): Even one hit on a 625x slot (expected roughly once per 32,768 bets on 15-row) would convert to $6.25 in winnings against a $0.01 wager — enough to shift the phase RTP by approximately 170 percentage points.

**Why Low risk phases show below-expected RTP:**

Low risk configurations have compressed multiplier ranges (most multipliers are between 0.7x and 2x). The variance is lower, so the empirical RTP stays closer to theoretical. The 97.13% result for Phase A represents a small unlucky streak — losing roughly $0.10 on $3.60 wagered, which is well within the expected range.

### Statistical Significance

With 1,080 bets at ~$0.01 each, the total wagered amount is ~$10.81. A 4% deviation from the mean is not statistically significant at this sample size, particularly given the extreme variance of High risk configurations.

For a meaningful convergence of empirical RTP to theoretical RTP (within ±0.1%), millions of bets would be required — especially for High risk configurations where the jackpot slots have probabilities as low as 1/65,536. **[Evidence: E48]**

## RTP by Risk Level: Design Philosophy

Duel's Plinko implements the same theoretical RTP (~99.9%) across all risk levels, with the difference being the **variance profile**:

| Risk Level | Center Multiplier | Edge Multiplier (15-row) | Variance | Win Rate |
|-----------|-------------------|------------------------|----------|----------|
| Low | 0.7x | 15x | Low | ~52% |
| Medium | 0.3x | 89x | Medium | ~32% |
| High | 0.2x | 625x | Very High | ~17% |

This means:
- **Low risk** players win slightly more than half their bets, but never win more than 16x
- **Medium risk** players win about a third of bets, with occasional 89x–111x payouts
- **High risk** players lose ~83% of bets (paying 0.2x), but have a chance at 625x to 1,000x jackpots

All three risk levels have the same expected return over infinite play. The difference is entirely in the distribution of outcomes — a design choice, not a fairness concern.

## Multiplier Table Source

The official multiplier tables for all 27 configurations are available from Duel's API endpoint `GET /api/v2/plinko/config`, which returns the complete tables in machine-readable JSON format. These tables are the authoritative source for payout calculations and RTP verification.

Our dataset covers 217 of the possible ~243 (risk, rows, slot) combinations through direct observation in 1,080 live bets. The observed multiplier values match the official API tables exactly. The remaining uncovered combinations are extreme edge slots (slot 0 and slot n for high row counts) that have very low probability and were not hit in our sample.

The theoretical RTP calculated from the official API multiplier tables confirms an exact 0.1000% house edge (99.9000% RTP) for all 27 configurations.

## Evidence Coverage

| Test | Source File | Status |
|------|------------|--------|
| Theoretical RTP calculation | `PlinkoAuditExecutionChecklistTests.ts` | ✅ Verified |
| Simulation convergence (27M rounds) | `PlinkoAuditExecutionChecklistTests.ts` | ✅ Verified |
| Payout formula verification | `PlinkoWinCalculatorTests.ts` | ✅ Verified |
| Multiplier table consistency | `PlinkoAuditExecutionChecklistTests.ts` | ✅ Verified |

**Code References:**
- Multiplier tables: `src/plinko/PlinkoGameProfiles.ts`
- Payout calculator: `src/plinko/PlinkoWinCalculator.ts`
- Simulator: `src/plinko/PlinkoGameSimulator.ts`
- RTP convergence tests: `tests/plinko/PlinkoAuditExecutionChecklistTests.ts`

**Generated Artifacts:**
- `outputs/plinko/simulation-summary.json` — Per-mode RTP, sample sizes, standard errors
- `outputs/plinko/audit-results/Plinko_RTP_Convergence_All.png` — Aggregate convergence chart
- 27 per-mode convergence charts in `outputs/plinko/audit-results/profile-dependent-convergence/`
