# Executive Summary

## Overview

This report presents the findings of a comprehensive security audit of Duel.com's Plinko game, conducted by Provably Fair Organization (PF.org) in February 2026. The audit assessed the cryptographic integrity, outcome determinism, payout correctness, and overall fairness of the platform's Plinko implementation.

Duel.com operates a centralized provably fair casino platform offering original games including Plinko, Dice, Blackjack, Crash, Mines, Beef, Keno, and Castle Roulette. The platform is operated by Immortal Snail LLC (Nevis, West Indies) under license No. ALSI-202411026-FI1 from the Government of the Autonomous Island of Anjouan, Union of Comoros. The platform accepts cryptocurrency deposits and uses USDT as its primary wagering currency.

Plinko is a variable-variance game where a ball drops through a triangular pin field, bouncing left or right at each row of pins before landing in a numbered slot at the bottom. Each slot carries a multiplier that determines the payout. The game supports 9 row configurations (8 through 16), 3 risk levels (Low, Medium, High), and thus 27 distinct game modes.

## Key Findings

### Cryptographic Integrity — PASS

The random number generation system uses HMAC-SHA256, a well-established cryptographic construction. The server seed is encoded as raw bytes using `hexToBytes()`, and the HMAC message incorporates the client seed, nonce, and a per-row cursor value. This produces independent, uniformly distributed random bits at each row of the Plinko board.

The commit-reveal protocol operates correctly. Before any bets are placed, the server commits to a seed by publishing its SHA-256 hash. After seed rotation, the plaintext server seed is revealed, and our independent verification confirmed that all 24 committed hashes matched their revealed seeds exactly. **[Evidence: E12, E29]**

### Outcome Determinism — PASS

We collected 1,080 live bets across all 27 game configurations (40 bets per configuration) using an automated capture script. After seed rotation revealed the server seeds, we independently recomputed every bet outcome using our own HMAC-SHA256 implementation in Node.js.

Of the 1,080 bets, 1,070 were verifiable (the remaining 10 belong to the final active seed segment, which has not yet been rotated). Every verifiable bet produced an identical result to the live outcome. The probability of achieving 1,070 consecutive matches by chance on a manipulated system is astronomically small — less than 1 in 2^1070. **[Evidence: E28, E31]**

### Payout Accuracy — PASS

Every single bet in the dataset (1,080 of 1,080) satisfies the equation:

```
win_amount = amount_currency × payout_multiplier
```

No rounding errors, truncation anomalies, or discrepancies were detected. The payout system faithfully applies the displayed multiplier to the wagered amount. **[Evidence: E43]**

### Statistical Distribution — PASS

We aggregated slot distributions across all bets for each row count (120 bets per row configuration) and applied chi-squared goodness-of-fit tests against the expected binomial distribution B(n, 0.5). All 9 row configurations passed at the p = 0.05 significance level:

| Rows | Sample Size | Chi-Squared | Critical Value | Result |
|------|-------------|-------------|----------------|--------|
| 8    | 120         | 14.827      | 15.507         | PASS   |
| 9    | 120         | 4.512       | 16.919         | PASS   |
| 10   | 120         | 6.774       | 18.307         | PASS   |
| 11   | 120         | 2.488       | 19.675         | PASS   |
| 12   | 120         | 5.572       | 21.026         | PASS   |
| 13   | 120         | 6.169       | 22.362         | PASS   |
| 14   | 120         | 3.735       | 23.685         | PASS   |
| 15   | 120         | 4.188       | 24.996         | PASS   |
| 16   | 120         | 17.792      | 26.296         | PASS   |

These results are consistent with genuinely random, unbiased left-right decisions at each pin. **[Evidence: E36, E37]**

### Nonce Integrity — PASS

Across all 24 seed segments, nonce values increment sequentially with zero gaps and zero duplicates. Each seed rotation resets the nonce counter, and bet sequence continuity is maintained within each segment. This confirms that no bets were inserted, removed, or replayed. **[Evidence: E30, E39]**

### Multiplier Consistency — PASS

Across 217 unique (risk, rows, slot) combinations observed in the dataset, every occurrence of a given combination produced the identical multiplier value. The multiplier tables are deterministic and consistent. **[Evidence: E38]**

### RTP Assessment — NOTED

The platform reports an `effective_edge` field in API responses. The majority of bets (1,015 of 1,080) show `effective_edge = 0.1`, corresponding to 99.9% RTP, while 65 bets show `effective_edge = 0` (Duel's "Zero Edge" promotional feature, corresponding to 100% RTP). Theoretical RTP calculated independently from observed multiplier tables confirms consistency with these stated values.

Empirical RTP across our 1,080-bet dataset was 104.08%, which reflects normal short-term variance rather than a systematic deviation — expected with small samples, particularly given High risk configurations where individual multipliers exceed 600x. **[Evidence: E41, E47]**

## Overall Verdict

{% hint style="success" %}
**PROVABLY FAIR — Full Pass.** Duel.com's Plinko game satisfies all criteria for provable fairness. The commit-reveal protocol is correctly implemented, outcomes are cryptographically deterministic, payouts are mathematically accurate, and statistical distribution analysis reveals no evidence of manipulation. Players can independently verify every bet outcome using the algorithm published on the platform's fairness page.
{% endhint %}

### Trust Considerations

While the cryptographic fairness mechanism is sound, players should be aware that Duel.com is a centralized platform — not a blockchain-based casino. The multiplier tables are set by the operator and are not published in a machine-readable format. Server seed generation occurs server-side and its entropy source cannot be audited externally. These are standard characteristics of centralized provably fair casinos and do not diminish the effectiveness of the commit-reveal fairness guarantee, but they do represent areas where additional transparency would strengthen player trust.
