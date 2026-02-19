# Technical Security Audit of Duel.com Plinko

**Audit Conducted By:** [ProvablyFair.org](https://www.provablyfair.org)\
**Date:** February 17, 2026\
**Game:** Plinko (Original)\
**Platform:** [duel.com](https://duel.com)\
**Audit Version:** 1.0\
**Dataset SHA-256:** `2000cb5f865263ac2556cc7781682ff66fcd32c9c1230a27bf1ce74638c70c16`

---

{% hint style="success" %}
**Verdict:** Duel.com's Plinko implementation passes all provable fairness criteria. Every bet outcome is cryptographically deterministic, independently reproducible, and protected by a commit-reveal scheme that prevents outcome manipulation after a wager is placed.
{% endhint %}

| Metric | Value |
|--------|-------|
| RTP | 99.9% (0.1% house edge) |
| Live Bets Tested | 1,080 |
| Simulated Rounds | 5,400,000 |
| Parity Rate | 100% (1,070/1,070) |

## Audit Verdict

| Check | Result | Finding |
|-------|--------|---------|
| Overall Status | ✅ Pass | Provably Fair |
| RTP Verified | ✅ Pass | Theoretical RTP independently confirmed at 99.9% |
| Live ↔ Verifier Parity | ✅ Pass | 1,070/1,070 outcomes match (100%) |
| Commit-Reveal System | ✅ Pass | 24/24 seed hashes verified |
| Seed Handling | ✅ Pass | Proper hex-to-bytes encoding confirmed |
| RNG Analysis | ✅ Pass | HMAC-SHA256 with zero modulo bias |
| Payout Logic | ✅ Pass | 1,080/1,080 payouts exact |
| Known Exploits Tested | ✅ Pass | No exploit paths identified |
| Determinism | ✅ Pass | Same inputs always produce same result |
| Statistical Distribution | ✅ Pass | Chi-squared pass for all 9 row configs |

## Plinko Audit Overview

### What This Audit Covers

- Commit-reveal system: server seed commitment, hash verification, rotation protocol
- Seed handling: hex-to-bytes key encoding, client seed incorporation, nonce management
- RNG analysis: HMAC-SHA256 uniformity, modulo bias assessment, per-row independence
- Payout logic: multiplier-to-payout calculation, precision, consistency
- Live parity: 1,080 real-money bets verified against independent re-computation
- RTP validation: theoretical calculation, Monte Carlo simulation (5.4M rounds), empirical observation
- Exploit testing: prediction attempts, manipulation vectors, seed lifecycle attacks

### What This Audit Guarantees

- Outcomes are deterministic: the same (server seed, client seed, nonce, rows) always produces the same result
- Live outcomes match verifier re-computation with 100% parity across 1,070 verified bets
- Randomness is unbiased: `value % 2` on a 32-bit unsigned integer produces a perfect 50/50 split
- No known exploits were found at the time of this audit

### What This Audit Excludes

- Infrastructure security (servers, network, DDoS protection)
- Wallet and payment system integrity
- Operational controls outside game logic (KYC, AML, account security)
- Platform solvency or financial guarantees

## Scope

This audit evaluates the cryptographic fairness, outcome determinism, payout accuracy, and operator trust model of Duel.com's Plinko game. The assessment covers:

- The HMAC-SHA256 random number generation algorithm
- The commit-reveal seed management protocol
- Independent verification of 1,080 live bets across all 27 game configurations
- Payout accuracy validation for every recorded wager
- Statistical distribution analysis across 9 row counts
- Theoretical and empirical RTP (Return to Player) analysis
- Monte Carlo simulation across 5,400,000 rounds
- Structured exploit and edge-case testing
- Operator trust model and transparency assessment

## Table of Contents

1. [Executive Summary](executive-summary.md)
2. [Game Rules Reference](game-rules.md)
3. [System Architecture](system-architecture.md)
4. [RNG and Commit-Reveal Analysis](rng-algorithm-analysis.md)
5. [Game Logic Verifiability](game-logic-verifiability.md)
6. [Live Parity Testing](live-parity-testing.md)
7. [Exploit and Edge-Case Testing](exploit-testing.md)
8. [Edge Case and Statistical Analysis](edge-case-analysis.md)
9. [Payout System Verification](payout-verification.md)
10. [RTP Analysis](rtp-analysis.md)
11. [Operator Trust and Control Analysis](operator-trust-analysis.md)
12. [Conclusion](conclusion.md)
13. [Recommendations](recommendations.md)
14. [Reproducibility](reproducibility.md)
15. [Technical Glossary](glossary.md)
16. [Evidence Appendix](evidence.md)

## Methodology

All testing was performed against the live production environment at duel.com using a funded test account. Data collection was automated via a custom Tampermonkey script that intercepted API responses during normal gameplay. No modifications were made to the client application. Verification was performed independently using Node.js with the standard `crypto` module — no Duel.com code was used in the verification process.

## Dataset Summary

| Metric | Value |
|--------|-------|
| Total live bets | 1,080 |
| Seed rotations | 24 |
| Risk levels tested | Low, Medium, High |
| Row configurations tested | 8, 9, 10, 11, 12, 13, 14, 15, 16 |
| Game configurations covered | 27 (3 risks × 9 rows) |
| Bets per configuration | 40 |
| Verification match rate | 1,070/1,070 (100%) |
| Payout accuracy | 1,080/1,080 (100%) |
| Simulated rounds | 5,400,000 (200,000 per config) |
| Dataset file | `duel-plinko-sim-1771364316980.json` |
| Dataset SHA-256 | `2000cb5f865263ac2556cc7781682ff66fcd32c9c1230a27bf1ce74638c70c16` |
