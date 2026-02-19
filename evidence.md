# Evidence Appendix

This appendix catalogs all evidence items referenced throughout the audit report. Each item includes a description, the associated screenshot or data file, and the report section(s) where it is referenced.

---

## Platform and User Interface

### E01 — Duel.com Homepage
**File:** `evidence/E01-duel-homepage.png`\
**Description:** The duel.com homepage when logged in, showing the "Duel Originals" game selection (Dice, Blackjack, Plinko, Crash, Mines) with "100% RTP" labels, the user balance ($9.13 USDT), and the platform branding.\
**Referenced in:** [System Architecture](system-architecture.md)

### E02 — Plinko Game Interface
**File:** `evidence/E02-plinko-game-ui.png`\
**Description:** The Plinko game interface showing the pin field, multiplier slots at the bottom, bet controls (amount, risk level, row count), and the Manual/Auto mode toggle.\
**Referenced in:** [System Architecture](system-architecture.md)

### E03 — Plinko Game Board (Idle State)
**File:** `evidence/E03-plinko-game-board.png`\
**Description:** The Plinko game board in idle state with Medium risk selected, 15 rows, showing the full multiplier row at the bottom (89x to 0.3x and back to 89x).\
**Referenced in:** [System Architecture](system-architecture.md)

### E04 — Low Risk Configuration
**File:** `evidence/E04-plinko-low-risk.png`\
**Description:** The Plinko game with Low risk selected, showing the compressed multiplier range (15x to 0.7x). Demonstrates how Low risk multipliers are less extreme than Medium and High.\
**Referenced in:** [Game Logic Verifiability](game-logic-verifiability.md)

### E05 — High Risk Configuration
**File:** `evidence/E05-plinko-high-risk.png`\
**Description:** The Plinko game with High risk selected, showing extreme multiplier values (625x at edges, 0.2x in center). Demonstrates the high-variance nature of High risk play.\
**Referenced in:** [Game Logic Verifiability](game-logic-verifiability.md), [RTP Analysis](rtp-analysis.md)

### E06 — Multiplier Display
**Description:** The multiplier values displayed at the bottom of the Plinko board for each risk/row combination. Visible in screenshots E03, E04, E05.\
**Referenced in:** [RNG Algorithm Analysis](rng-algorithm-analysis.md), [Game Logic Verifiability](game-logic-verifiability.md)

### E07 — Bet History (My Bets Tab)
**File:** `evidence/E07-bet-history-my-bets.png`\
**Description:** The "My Bets" tab showing recent Plinko bets by shauntwofiftysix with bet IDs, wager amounts ($0.01), multipliers, and payouts. Also shows the platform footer with licensing information.\
**Referenced in:** [Live Parity Testing](live-parity-testing.md)

### E08 — Footer and Licensing Information
**Description:** Visible in E07. Shows: "Duel.com is owned and operated by Immortal Snail LLC, registration number: L22982... licensed and regulated by the Government of the Autonomous Island of Anjouan, Union of Comoros... License No. ALSI-202411026-FI1."\
**Referenced in:** [System Architecture](system-architecture.md)

---

## Fairness and Algorithm

### E09 — Fairness Page Overview
**File:** `evidence/E09-fairness-page-overview.png`\
**Description:** The duel.com/fairness page showing the "What is Provably Fair?" section, "How it works" explanation of server seed, client seed, and nonce, and the formula "Fair result = Server seed + Client seed + Nonce".\
**Referenced in:** [System Architecture](system-architecture.md)

### E10 — Fairness Verify Page
**File:** `evidence/E10-fairness-verify-page.png`\
**Description:** The /fairness/verify page showing the calculation tool with game selector (Blackjack shown by default), input fields for client seed, server seed, and nonce, and the verification code section.\
**Referenced in:** [Game Logic Verifiability](game-logic-verifiability.md)

### E11 — Fairness Verify: Plinko Selected
**File:** `evidence/E11-fairness-verify-plinko.png`\
**Description:** The verification page with Plinko selected as the game, showing additional Rows and Risk Level inputs, and the Plinko-specific verification JavaScript code using `hexToBytes()`, `generateHMAC_SHA256()`, and cursor-based iteration.\
**Referenced in:** [RNG Algorithm Analysis](rng-algorithm-analysis.md), [Game Logic Verifiability](game-logic-verifiability.md)

### E12 — Provably Fair Panel
**File:** `evidence/E12-provably-fair-panel.png`\
**Description:** The in-game Provably Fair modal showing: Active client seed (BNQL6bqOYP), Active server seed hash (c8c7d094b385bcfe...), Nonce (10), New client seed input, Next server seed hash, and "Rotate seed" button.\
**Referenced in:** [Executive Summary](executive-summary.md), [System Architecture](system-architecture.md), [Operator Trust Analysis](operator-trust-analysis.md)

### E13 — Client Seed Input
**Description:** Visible in E12. The "New client seed" field shows a pre-generated value (0u492dRts9h9BCPV) that the player can modify before rotation.\
**Referenced in:** [Operator Trust Analysis](operator-trust-analysis.md)

### E14 — Seed Rotation History
**Description:** The dataset records 24 seed rotations with timestamps, contexts (e.g., "mid-phase-A-at-50"), revealed seeds, and committed hashes. Each rotation is logged in the `seeds[]` array of the dataset JSON.\
**Referenced in:** [System Architecture](system-architecture.md), [Live Parity Testing](live-parity-testing.md)

### E15 — Previously Revealed Server Seeds
**Description:** From the dataset, all 24 revealed server seeds are available. Example: Seed 1 revealed `b6d2bb3df73995fd53a4f836b0db0e4b5ff61fec6155cda3d6e55d4bc866a585` which hashes to `5548792213b9af3a3cd236cc0e0d4ca7e4bcf0955dccc2501f2ac76f77fd82c1`.\
**Referenced in:** [System Architecture](system-architecture.md)

### E16 — SES Lockdown Console Warning
**Description:** On page load, the browser console displays a red warning: "Do not send anyone your cookies or paste anything into this console" — indicating SES (Secure EcmaScript) lockdown is active.\
**Referenced in:** [System Architecture](system-architecture.md), [Operator Trust Analysis](operator-trust-analysis.md)

### E17 — Sample API Response (Dataset)
**Description:** From the captured dataset, a sample bet API response showing all fields: id, rows, risk_level, final_slot, payout_multiplier, amount_currency, win_amount, nonce, server_seed_hashed, client_seed, effective_edge, transaction_id, drand_round (null), drand_randomness (null).\
**Referenced in:** [System Architecture](system-architecture.md)

### E18 — Dataset Structure
**Description:** The complete dataset JSON structure showing `meta` (schema version, creation time, phases), `seeds` array (24 rotation records), and `bets` array (1,080 bet records with request and response payloads).\
**Referenced in:** [System Architecture](system-architecture.md), [Live Parity Testing](live-parity-testing.md)

---

## Data Collection

### E19 — Capture Script Source Code
**File:** `capture/tampermonkey/duel-plinko/duel-plinko-capture-phases.js`\
**Description:** The Tampermonkey userscript used to automate data collection. Intercepts XHR responses from the Plinko bet and seed rotation APIs, manages 3-phase execution (Low/Medium/High risk), auto-rotates seeds every 50 bets, and exports the complete dataset as JSON.\
**Referenced in:** [Live Parity Testing](live-parity-testing.md), [RTP Analysis](rtp-analysis.md)

### E20 — Capture Script Configuration
**Description:** Script parameters: 3 phases (A=Low, B=Medium, C=High), 9 rows per phase (8–16), 40 bets per row, 50-bet rotation interval, $0.01 minimum bet amount, USDT currency.\
**Referenced in:** [Live Parity Testing](live-parity-testing.md)

### E21 — Raw Dataset File
**File:** `capture/data/duel-plinko-sim-1771364316980.json`\
**Description:** The complete 1,080-bet dataset with all metadata, seed rotations, and API responses. Schema version: duel-plinko-sim-v3.\
**Referenced in:** [Live Parity Testing](live-parity-testing.md)

### E22 — Dataset Statistics
**Description:** Summary statistics extracted from the dataset: 1,080 total bets, 360 per phase, 24 seed rotations (8 per phase), 40 bets per (risk, rows) configuration, session duration approximately 10 minutes.\
**Referenced in:** [Live Parity Testing](live-parity-testing.md)

### E23 — Phase A Data (Low Risk)
**Description:** 360 bets across rows 8-16 at Low risk. Empirical RTP: 97.13%. Seed rotations: 8 (every 50 bets).\
**Referenced in:** [Payout Verification](payout-verification.md)

### E24 — Phase B Data (Medium Risk)
**Description:** 360 bets across rows 8-16 at Medium risk. Empirical RTP: 105.91%. Seed rotations: 8.\
**Referenced in:** [Payout Verification](payout-verification.md)

### E25 — Phase C Data (High Risk)
**Description:** 360 bets across rows 8-16 at High risk. Empirical RTP: 109.20%. Seed rotations: 8.\
**Referenced in:** [Payout Verification](payout-verification.md)

### E26 — Seed Rotation Log
**Description:** All 24 seed rotations with: timestamp, phase, context identifier, revealed server seed, committed hash, client seed, nonce at rotation time. Available in the `seeds[]` array of the dataset.\
**Referenced in:** [Live Parity Testing](live-parity-testing.md)

---

## Verification

### E27 — Verification Script Source Code
**File:** `scripts/validateDuelPlinko.ts`\
**Description:** Independent TypeScript verification script using Node.js `crypto` module. Loads dataset, maps seed hashes to revealed seeds, recomputes every bet's final_slot using HMAC-SHA256 with hexToBytes key encoding, and compares against live results.\
**Referenced in:** [RNG Algorithm Analysis](rng-algorithm-analysis.md), [Game Logic Verifiability](game-logic-verifiability.md), [Operator Trust Analysis](operator-trust-analysis.md)

### E28 — Verification Script Output
**Description:** Execution output showing 1,070 verified matches, 0 mismatches, 10 unverifiable (final active seed). 100% match rate on all verifiable bets.\
**Referenced in:** [Executive Summary](executive-summary.md), [Live Parity Testing](live-parity-testing.md), [Operator Trust Analysis](operator-trust-analysis.md)

### E29 — Seed Hash Verification (24/24)
**Description:** All 24 revealed server seeds verified against their committed SHA-256 hashes. `SHA-256(hexDecode(serverSeed)) === serverSeedHashed` for every rotation. 0 mismatches.\
**Referenced in:** [Executive Summary](executive-summary.md), [RNG Algorithm Analysis](rng-algorithm-analysis.md), [Live Parity Testing](live-parity-testing.md), [Operator Trust Analysis](operator-trust-analysis.md)

### E30 — Nonce Sequence Verification
**Description:** Across all 24 seed segments: 0 nonce gaps, 0 nonce duplicates. Nonces increment sequentially from 0 within each segment, confirming no bets were inserted or removed.\
**Referenced in:** [Executive Summary](executive-summary.md), [Live Parity Testing](live-parity-testing.md), [Edge Case Analysis](edge-case-analysis.md)

### E31 — Result Parity Output (1,070/1,070)
**Description:** The verification script confirmed that all 1,070 verifiable bets produced identical final_slot values when computed independently. Match rate: 100.000%.\
**Referenced in:** [Executive Summary](executive-summary.md), [Live Parity Testing](live-parity-testing.md)

### E32 — Sample Bet Verification Walkthrough
**Description:** Step-by-step verification of individual bets showing: seed lookup, HMAC computation per row, position accumulation, and final slot comparison. Demonstrated for bets #0 (low/8/nonce=0/slot=4), #1 (low/9/nonce=1/slot=3), #2 (low/10/nonce=2/slot=5).\
**Referenced in:** [Live Parity Testing](live-parity-testing.md), [Game Logic Verifiability](game-logic-verifiability.md)

### E33 — HMAC-SHA256 Step-by-Step
**Description:** Detailed walkthrough of the HMAC computation for a single row: key = hexToBytes(serverSeed), message = UTF8("clientSeed:nonce:cursor"), hash = HMAC-SHA256(key, message), value = readUInt32BE(hash, 0), direction = value % 2.\
**Referenced in:** [Game Logic Verifiability](game-logic-verifiability.md)

### E34 — hexToBytes Key Format
**Description:** Demonstration of correct key encoding: the 64-character hex string is decoded to 32 raw bytes using hexToBytes(), not interpreted as a 64-byte UTF-8 string. This is the critical implementation detail for verification.\
**Referenced in:** [RNG Algorithm Analysis](rng-algorithm-analysis.md)

### E35 — Key Format Comparison
**Description:** Side-by-side comparison showing that hexToBytes(seed) produces different HMAC output than TextEncoder.encode(seed), confirming the importance of correct key encoding.\
**Referenced in:** [RNG Algorithm Analysis](rng-algorithm-analysis.md)

---

## Statistical Analysis

### E36 — Slot Distribution by Row Count
**Description:** Aggregated slot distributions for each row configuration (8 through 16), showing observed frequencies vs expected binomial frequencies across 120 bets per row count.\
**Referenced in:** [Executive Summary](executive-summary.md), [Edge Case Analysis](edge-case-analysis.md)

### E37 — Chi-Squared Test Results
**Description:** Chi-squared goodness-of-fit test results for all 9 row configurations. All pass at p=0.05: Rows 8 (χ²=14.83), 9 (4.51), 10 (6.77), 11 (2.49), 12 (5.57), 13 (6.17), 14 (3.74), 15 (4.19), 16 (17.79).\
**Referenced in:** [Executive Summary](executive-summary.md), [Edge Case Analysis](edge-case-analysis.md)

### E38 — Multiplier Consistency Check
**Description:** Verification that all 217 unique (risk, rows, slot) combinations observed in the dataset produce identical multiplier values across all occurrences. Inconsistencies: 0.\
**Referenced in:** [Executive Summary](executive-summary.md), [Game Logic Verifiability](game-logic-verifiability.md), [Edge Case Analysis](edge-case-analysis.md)

### E39 — Nonce Continuity Across Segments
**Description:** Analysis of nonce sequences across all 24 seed segments confirming sequential ordering, zero gaps, and zero duplicates.\
**Referenced in:** [Live Parity Testing](live-parity-testing.md), [Edge Case Analysis](edge-case-analysis.md)

### E40 — Win/Loss Ratio by Configuration
**Description:** Win rates by risk level: Low 52.5%, Medium 32.2%, High 17.2%. Consistent with the expected behavior of each risk level's multiplier distribution.\
**Referenced in:** [Edge Case Analysis](edge-case-analysis.md)

### E41 — Empirical vs Theoretical RTP
**Description:** Per-phase empirical RTP: Phase A (Low) 97.13%, Phase B (Medium) 105.91%, Phase C (High) 109.20%, Aggregate 104.08%. Theoretical: ~99.9%. Deviation explained by short-term variance.\
**Referenced in:** [Executive Summary](executive-summary.md), [RTP Analysis](rtp-analysis.md)

### E42 — Effective Edge Uniformity
**Description:** Distribution of effective_edge values: 1,015 bets at 0.1 (99.9% RTP), 65 bets at 0 (100% RTP "Zero Edge"). Zero-edge bets are distributed across all configurations.\
**Referenced in:** [Edge Case Analysis](edge-case-analysis.md), [RTP Analysis](rtp-analysis.md)

---

## Payout and RTP

### E43 — Payout Calculation Verification
**Description:** Verification that win_amount = amount_currency × payout_multiplier for all 1,080 bets. Matches: 1,080/1,080 (100%). No rounding errors detected.\
**Referenced in:** [Executive Summary](executive-summary.md), [Payout Verification](payout-verification.md), [Operator Trust Analysis](operator-trust-analysis.md)

### E44 — Rounding Check Sample
**Description:** Sample of payout calculations at full 18-decimal precision, confirming exact multiplication with no truncation or rounding artifacts.\
**Referenced in:** [Payout Verification](payout-verification.md)

### E45 — Independent RTP Calculation
**Description:** Theoretical RTP calculated from observed multiplier tables using binomial probability × multiplier summation. Confirms consistency with stated effective_edge for verified configurations.\
**Referenced in:** [Payout Verification](payout-verification.md), [RTP Analysis](rtp-analysis.md)

### E46 — Binomial Probability Table
**Description:** Binomial distribution P(slot=k) = C(n,k)/2^n for each row count, used as the basis for theoretical RTP calculations and chi-squared test expected values.\
**Referenced in:** [RTP Analysis](rtp-analysis.md)

### E47 — Per-Phase Empirical RTP Table
**Description:** Detailed financial summary: Phase A wagered $3.60, won $3.50 (97.13% RTP). Phase B wagered $3.60, won $3.81 (105.91%). Phase C wagered $3.60, won $3.93 (109.20%). Total: $10.81 wagered, $11.25 won (104.08%).\
**Referenced in:** [Executive Summary](executive-summary.md), [Payout Verification](payout-verification.md), [RTP Analysis](rtp-analysis.md)

### E48 — Variance Explanation
**Description:** Analysis of why empirical RTP deviates from theoretical: High risk configurations have extreme multipliers (up to 1000x) with very low probabilities (1/65,536 for edge slots on 16-row). A single lucky hit swings the phase RTP by hundreds of percentage points. 1,080 bets is insufficient for convergence.\
**Referenced in:** [Payout Verification](payout-verification.md), [RTP Analysis](rtp-analysis.md)

---

## Trust Model

### E49 — Verifiable vs Trust-Required Summary
**Description:** Summary table of what players can verify (algorithm, seed commitment, nonce sequence, payout accuracy) vs what requires trust (server seed entropy, multiplier governance, balance management, cross-account nonce uniqueness).\
**Referenced in:** [Operator Trust Analysis](operator-trust-analysis.md)

### E50 — Centralized vs Blockchain Comparison
**Description:** Comparison table of Duel.com's centralized model vs blockchain-based casinos (e.g., Luck.io on Solana) across trust dimensions: seed generation, commitment storage, bet records, payout execution, multiplier governance, and operational risk.\
**Referenced in:** [Operator Trust Analysis](operator-trust-analysis.md)

---

## Exploit Testing

### E51 — Exploit Category Assessment
**Description:** Structured assessment of 6 exploit categories (outcome prediction, post-bet manipulation, seed lifecycle abuse, nonce reuse, RNG bias, cross-bet influence) with pass/fail results and detailed reasoning for each.\
**Referenced in:** [Exploit Testing](exploit-testing.md)

### E52 — Failure Mode Detection Matrix
**Description:** Table of 6 potential failure modes with detection methods applied and results: early seed reveal (no evidence), hash mismatch (24/24 match), nonce irregularities (0 gaps/duplicates), non-deterministic output (1,070/1,070 match), hidden entropy (code audit clean), verifier parity (100%).\
**Referenced in:** [Exploit Testing](exploit-testing.md)

---

## Simulation and Convergence

### E53 — Simulation Summary (5.4M Rounds)
**File:** `outputs/plinko/simulation-summary.json`\
**Description:** Monte Carlo simulation results: 5,400,000 total rounds (200,000 per configuration), 27 configurations, aggregate simulated RTP 98.84%, aggregate theoretical RTP 99.12%, execution time 681 seconds.\
**Referenced in:** [RTP Analysis](rtp-analysis.md)

### E54 — Per-Mode Convergence Data
**Description:** Simulated vs theoretical RTP for each of 27 modes with standard errors. Example: low_8rows (99.06% sim, 99.06% theo, ±0.127%), high_16rows (96.38% sim, 99.20% theo, ±0.926%).\
**Referenced in:** [RTP Analysis](rtp-analysis.md)

### E55 — Convergence Charts (27 + Aggregate)
**File:** `outputs/plinko/audit-results/profile-dependent-convergence/*.png` and `Plinko_RTP_Convergence_All.png`\
**Description:** 27 per-mode RTP convergence charts and 1 aggregate chart showing simulated RTP approaching theoretical over increasing sample sizes.\
**Referenced in:** [RTP Analysis](rtp-analysis.md)

---

## Streak and Distribution Analysis

### E56 — Win/Loss Streak Analysis
**Description:** Longest win streaks by risk: Low=12, Medium=5, High=3. Longest loss streaks: Low=8, Medium=10, High=17. All within expected range for independent events at observed win rates.\
**Referenced in:** [Edge Case Analysis](edge-case-analysis.md)

### E57 — Expected vs Observed Streak Comparison
**Description:** Expected maximum streak lengths calculated from `log(N)/log(1/p)` formula compared to observed values. All within 2 standard deviations.\
**Referenced in:** [Edge Case Analysis](edge-case-analysis.md)
