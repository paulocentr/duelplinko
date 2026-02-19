# Operator Trust and Control Analysis

## What Was Tested

- Operator control surface: what Duel.com can and cannot manipulate
- Player verification capabilities: what can be independently confirmed
- Trust-required areas: seed entropy, multiplier governance, balance management
- Client seed incorporation into outcome computation
- SES lockdown implications for player transparency
- Comparison to blockchain-based alternatives

## What This Means for Players

The commit-reveal protocol prevents outcome manipulation — the primary fairness concern. Areas that require trust (server seed entropy, multiplier table governance, account balances) are standard for centralized casinos and do not compromise the core fairness guarantee. Players who set their own client seed and verify outcomes after seed rotation have the strongest available assurance.

## Verdict Summary

| Trust Area | Verifiable? | Finding |
|-----------|-------------|---------|
| Outcome determinism | ✅ Fully | 1,070/1,070 verified independently |
| Seed commitment integrity | ✅ Fully | 24/24 hashes match |
| Client seed incorporation | ✅ Verified | Changing client seed changes outcomes |
| Nonce sequence | ✅ Verified | 0 gaps, 0 duplicates |
| Payout accuracy | ✅ Verified | 1,080/1,080 exact matches |
| Server seed entropy | ⚠️ Trust required | No external proof of PRNG quality |
| Multiplier table governance | ⚠️ Trust required | Static during testing; could change between sessions |
| Balance management | ⚠️ Trust required | No on-chain ledger |

**Overall Verdict:** Core fairness is provable; peripheral trust areas are standard for centralized platforms.

## Trust Model Overview

Every provably fair casino — centralized or decentralized — involves a trust boundary. The commit-reveal protocol eliminates the need to trust the operator on the question "Did the game produce the result it said it did?" But other trust questions remain. This section maps what Duel.com controls, what players can verify, and what requires trust.

## What the Operator Controls

### Server Seed Generation

Duel.com generates server seeds on its servers. The entropy source, PRNG algorithm, and seed selection process are not publicly disclosed. This means:

- Players cannot verify that server seeds are generated from a high-quality random source
- The operator could theoretically generate seeds in a specific pattern (though this would not help them manipulate specific bet outcomes due to the commit-reveal protocol)

In practice, the HMAC-SHA256 construction provides strong pseudorandomness guarantees even if the seed has imperfect entropy. The output of HMAC-SHA256 is computationally indistinguishable from random as long as the key (server seed) is not known to the attacker. Since the server seed is not revealed until after rotation, seed quality is not a practical attack vector.

### Multiplier Tables

The payout multiplier tables for each (risk, rows) configuration are set by Duel.com. These tables determine the house edge and the player's expected return. Our testing confirmed that the tables are static (identical multipliers for the same slot across all observations), but Duel.com could, in theory:

- Change multiplier tables between sessions without notice
- Use different multiplier tables for different players
- Update tables to increase or decrease the house edge

We did not observe any evidence of such behavior during our testing. The `effective_edge` field in API responses provides explicit transparency about the applied house edge, which is a positive sign.

### API Responses

All game data is served through Duel's API. The server determines:

- The committed seed hash
- The bet outcome (final_slot, payout_multiplier)
- The win_amount
- When and how seeds are revealed

Players interact with the game through Duel's client application. While the client code is obfuscated (standard for production web applications), the API responses contain all the information needed for independent verification.

### Account and Balance Management

Player balances, deposits, withdrawals, and transaction history are managed entirely by Duel.com. There is no on-chain ledger or smart contract escrow. Players must trust Duel to:

- Credit deposits correctly
- Debit bets accurately
- Pay out winnings faithfully
- Maintain accurate balance records

## What Players Can Verify

### Algorithm Correctness

The Plinko algorithm is published in full on the fairness page (`/fairness/verify`). Players can inspect the JavaScript source code, copy it, and run it in their own environment. The algorithm is straightforward (HMAC-SHA256 with hex key encoding) and can be independently implemented in any programming language.

Our independent verifier confirmed that the published algorithm matches the server's actual behavior across 1,070 verified bets. **[Evidence: E27, E28]**

### Seed Commitment Integrity

Before betting, the server commits to the server seed by publishing its SHA-256 hash. After rotation, the plaintext seed is revealed, and anyone can verify that `SHA-256(hexDecode(seed)) === committed_hash`.

This prevents the server from:

- Changing the server seed after seeing a bet (re-rolling)
- Computing the outcome first and then choosing a seed to produce it
- Denying what seed was used for a given set of bets

All 24 seed commitments in our dataset verified correctly. **[Evidence: E29]**

### Nonce Sequence Continuity

Nonces increment by 1 for each bet within a seed segment and reset to 0 after rotation. Players can verify this sequence from their bet history. Any gaps or duplicates would indicate tampering.

Our verification found zero gaps and zero duplicates across 1,080 bets. **[Evidence: E30]**

### Payout Accuracy

Players can verify that `win_amount = bet_amount × payout_multiplier` for each bet. This is a simple multiplication that confirms the server correctly applied the displayed multiplier.

All 1,080 bets verified correctly. **[Evidence: E43]**

## What Requires Trust

### Client Seed Integrity

Players set a client seed that is incorporated into the HMAC computation. This prevents the server from precomputing favorable outcomes. But how much does the client seed actually matter?

**Positive finding:** We confirmed that the client seed is genuinely incorporated into the outcome computation. Changing the client seed while keeping other inputs identical produces different results. The fairness page code explicitly includes the client seed in the HMAC message, and our independent verification would have failed if the client seed were ignored.

**Trust consideration:** The default client seed is generated by Duel's client-side code. Players who don't manually set their own client seed are using a value generated by Duel's application. For maximum provable fairness, players should set a custom client seed that they generate themselves (e.g., typing random characters or using a random string generator).

### Cross-Account Nonce Uniqueness

The nonce counter is per-account, per-seed-pair. We verified nonce continuity within our own account, but we cannot verify that Duel maintains separate, non-overlapping nonce counters for different accounts. If two accounts shared a nonce space (which would be a severe design flaw), it could lead to correlated outcomes.

There is no evidence of shared nonce spaces, and it would be contrary to standard implementation practice. But this is an area that cannot be verified from a single account.

### Multiplier Table Fairness

While we verified that multiplier tables are consistent within our testing session, we cannot guarantee they are fair in the mathematical sense without independent RTP calculation. The `effective_edge` field suggests a 0.1% edge (99.9% RTP), but this claim requires verification against the full multiplier table — which is only observable through actual gameplay.

We performed this verification for the most common configurations and found the RTP to be consistent with the stated edge. See [RTP Analysis](rtp-analysis.md) for details.

## SES Lockdown Analysis

### What SES Lockdown Does

Duel.com's client uses SES (Secure EcmaScript) lockdown, which:

- Freezes JavaScript built-in prototypes (`Object.prototype`, `Array.prototype`, etc.)
- Prevents `eval()` and `new Function()` from executing arbitrary code
- Hardens the runtime against prototype pollution attacks

### Implications for Players

**Security benefit:** SES protects players from certain types of client-side attacks, such as XSS payloads that modify built-in methods to intercept credentials or alter displayed information.

**Transparency trade-off:** SES makes it more difficult for technically sophisticated players to inspect or debug the running application. Console access is limited, and some standard browser debugging techniques may not work as expected.

**Audit impact:** During our testing, we interacted with the game through its standard API rather than modifying the client. SES lockdown did not impede our audit process, as all verification was performed independently of the client application. **[Evidence: E16]**

## Comparison to Blockchain-Based Casinos

### Trust Distribution

| Trust Area | Duel.com (Centralized) | Blockchain Casino (e.g., Luck.io) |
|------------|----------------------|----------------------------------|
| Seed generation | Server-side (opaque) | VRF oracle (publicly verifiable) |
| Seed commitment | API response (player must record) | On-chain (immutable, permanent) |
| Bet records | Private database | On-chain (public, immutable) |
| Payout execution | Internal balance | Smart contract (automated) |
| Multiplier tables | Server-controlled | Smart contract (auditable) |
| House edge | API-reported | Code-verifiable |
| Operational risk | Platform solvency | Smart contract risk |

### Trade-offs

**Centralized advantages:**
- Faster bet resolution (no blockchain confirmation time)
- Lower transaction costs (no gas fees)
- Simpler user experience (no wallet required)
- Easier to fix bugs (no immutable contract risk)

**Blockchain advantages:**
- Immutable bet records
- Publicly auditable source code
- Automated, trustless payouts
- Verifiable seed entropy (VRF proofs)

**Net assessment:** Duel.com's commit-reveal protocol provides strong protection against outcome manipulation — the primary fairness concern. The areas where centralization introduces additional trust requirements (balance management, multiplier table governance, seed entropy) are standard for the industry and do not compromise the core fairness guarantee.

**[Evidence: E49, E50]**
