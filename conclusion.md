# Conclusion

## Risk Assessment

| Area | Rating | Summary |
|------|--------|---------|
| Cryptographic Integrity | **Strong** | HMAC-SHA256 with proper key encoding; zero modulo bias; independent per-row computation |
| Commit-Reveal Protocol | **Strong** | 24/24 seed hash verifications passed; protocol correctly prevents re-rolling |
| Outcome Determinism | **Strong** | 1,070/1,070 independent verifications matched; zero discrepancies |
| Payout Accuracy | **Strong** | 1,080/1,080 payout calculations exact to 18 decimal places |
| Statistical Distribution | **Strong** | All 9 chi-squared tests passed; 0 nonce gaps; 0 multiplier inconsistencies |
| Transparency | **Adequate** | Algorithm published; verification tool provided; multiplier tables observable but not published as data |

## Detailed Assessment

### What Works Well

**The commit-reveal protocol is correctly implemented.** This is the foundational requirement for provable fairness, and Duel gets it right. The server commits to a seed hash before any bets are placed, reveals the seed upon rotation, and the commitment verifies correctly every time. This prevents the most important class of casino manipulation: changing the outcome after a bet is placed.

**The algorithm is simple and transparent.** HMAC-SHA256 with `hexToBytes()` key encoding and `value % 2` bounce direction is about as straightforward as a Plinko algorithm can be. There are no complex steps that could hide manipulation. The code is published on the fairness page and matches our independent implementation.

**Per-row independence eliminates correlation attacks.** By using a unique cursor value for each row's HMAC, the algorithm ensures that each bounce is independent. There is no way for the ball's path to be "steered" after the initial parameters are set.

**Payout calculations are exact.** The server correctly applies multipliers to wagers with full floating-point precision. No rounding tricks, no truncation, no hidden fees.

**Nonce management is clean.** Sequential nonces with zero gaps and zero duplicates across 24 seed segments provide strong evidence of honest bet sequencing.

### Areas for Improvement

**Multiplier tables should be published.** The multiplier tables for each (risk, rows) configuration are not available in a machine-readable format. Publishing these tables (e.g., as a JSON API endpoint or on the fairness page) would allow players and auditors to independently verify the theoretical RTP without needing to collect bets across every configuration.

**The drand integration is incomplete.** The API includes `drand_round` and `drand_randomness` fields that are currently null. Integrating with the drand distributed randomness beacon would provide external, publicly verifiable entropy for server seed generation — strengthening the trust model by removing the need to trust Duel's internal PRNG.

**Seed commitments are ephemeral.** Unlike blockchain-based casinos where commitments are stored on-chain, Duel's commitments exist only in the API response and the player's local view. If a player fails to record the committed hash before betting, they cannot retroactively prove what was committed. A public commitment log (even just a signed timestamp server) would address this.

## Final Verdict

> **PROVABLY FAIR — Full Pass**
>
> Duel.com's Plinko game satisfies all criteria for provable fairness:
>
> - The random number generation uses cryptographically secure HMAC-SHA256 with zero modulo bias
> - The commit-reveal protocol is correctly implemented and prevents outcome manipulation
> - 1,070 out of 1,070 verifiable bet outcomes match our independent computation (100%)
> - 1,080 out of 1,080 payouts are mathematically exact
> - Statistical distribution analysis shows no evidence of bias or non-randomness
> - Multiplier tables are deterministic and consistent across all observations
> - Nonce sequences are continuous with no gaps or duplicates
>
> Players can independently verify every bet outcome using the four inputs (server seed, client seed, nonce, rows) and the algorithm published on the platform's fairness page.

## Caveats and Transparency Notes

While the game passes all provable fairness tests, players should be aware of the following:

1. **Centralized platform risk.** Duel.com is not a blockchain casino. Player balances, bet records, and payout execution are managed by Duel's internal systems. The provably fair guarantee covers outcome integrity, not platform solvency or operational continuity.

2. **Multiplier table governance.** The multiplier tables that determine the house edge are set by Duel.com and could theoretically be changed without notice. The `effective_edge` field provides some transparency, but there is no immutable record of multiplier table versions.

3. **Active seed limitation.** The current active server seed cannot be verified until it is rotated. Bets placed under the active seed must be taken on faith until the next rotation reveals the seed for verification.

4. **Client seed defaults.** The default client seed is generated by Duel's client code. For maximum fairness assurance, players should set a custom client seed that they generate independently.

5. **Sample size limitation.** Our dataset of 1,080 bets provides strong evidence of correct implementation but is not sufficient to verify the RTP of every configuration to high precision, particularly for high-row, high-risk configurations where jackpot slots have extremely low probabilities.
