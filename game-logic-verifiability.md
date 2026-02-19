# Game Logic Verifiability

## What Was Tested

- Ball path calculation determinism (position += value % 2)
- Multiplier table structure (symmetry, risk-dependent values)
- Independent reproducibility with 4 disclosed inputs
- Transparency of published verification tools
- Limitations in multiplier table discoverability

## What This Means for Players

The game logic is fully deterministic and independently reproducible. Given four inputs (server seed, client seed, nonce, rows), anyone can compute the exact ball path and final slot. The algorithm is published on the fairness page with viewable source code. The only limitation is that complete multiplier tables are not available in a machine-readable format.

## Verdict Summary

| Check | Result | Finding |
|-------|--------|---------|
| Ball path determinism | ✅ Pass | Same inputs always produce same slot |
| Multiplier symmetry | ✅ Pass | Slot k = Slot (rows - k) for all configs |
| Multiplier consistency (217 combinations) | ✅ Pass | 0 inconsistencies across 1,080 bets |
| Published algorithm accuracy | ✅ Pass | Matches actual server behavior |
| Multiplier table availability | ⚠️ Limited | No API endpoint for full tables |

**Overall Verdict:** Game logic is transparent and verifiable.

## Ball Path Calculation

The Plinko ball path is entirely determined by the sequence of left/right bounces at each row. Starting at position 0, each bounce either adds 0 (left) or 1 (right) to the running position. After `rows` bounces, the ball lands in a slot numbered from 0 (far left) to `rows` (far right).

For example, on an 8-row board:

```
Input: serverSeed, clientSeed="Y9yByIltIt", nonce=0, rows=8

Row 0: HMAC → value=0x8A3B... → 0x8A3B... % 2 = 1 → position = 1
Row 1: HMAC → value=0x3F21... → 0x3F21... % 2 = 1 → position = 2
Row 2: HMAC → value=0xC710... → 0xC710... % 2 = 0 → position = 2
Row 3: HMAC → value=0x1DB4... → 0x1DB4... % 2 = 0 → position = 2
Row 4: HMAC → value=0x5E92... → 0x5E92... % 2 = 0 → position = 2
Row 5: HMAC → value=0xA1F3... → 0xA1F3... % 2 = 1 → position = 3
Row 6: HMAC → value=0x72C8... → 0x72C8... % 2 = 0 → position = 3
Row 7: HMAC → value=0xD456... → 0xD456... % 2 = 0 → position = 3

Final slot: 3 → Multiplier (medium/8): 0.7x
```

This calculation is straightforward and reproducible by anyone with access to the four inputs (server seed, client seed, nonce, rows). No proprietary libraries or obfuscated logic is involved — standard HMAC-SHA256 available in every major programming language. **[Evidence: E32, E33]**

## Multiplier Structure

Each slot carries a payout multiplier that depends on the risk level and row count. The multiplier tables are symmetric — slot k and slot (rows - k) always carry the same multiplier. This symmetry reflects the underlying binomial distribution where both slots have equal probability.

### Observed Multiplier Tables

From our 1,080 bets across all 27 configurations, we extracted the following multiplier tables as served by the API. Note that Duel displays truncated values in the UI but applies full-precision values in payout calculations.

**Low Risk, 15 Rows (example):**

| Slot | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8–15 |
|------|---|---|---|---|---|---|---|---|------|
| Multi | 15x | 8.1x | 3x | 2x | 1.5x | 1.1x | 1x | 0.7x | (symmetric) |

**Medium Risk, 15 Rows (example):**

| Slot | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8–15 |
|------|---|---|---|---|---|---|---|---|------|
| Multi | 89x | 18x | 11x | 5x | 3x | 1.3x | 0.5x | 0.3x | (symmetric) |

**High Risk, 15 Rows (example):**

| Slot | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8–15 |
|------|---|---|---|---|---|---|---|---|------|
| Multi | 625x | 84x | 27x | 8.1x | 3x | 0.5x | 0.2x | 0.2x | (symmetric) |

**[Evidence: E04, E05, E06]**

The multiplier values increase dramatically toward the edges, reflecting the lower probability of reaching those slots. High-risk configurations amplify this effect — the edge multipliers are much higher, but the center multipliers are much lower (often 0.2x, meaning the player loses 80% of their wager on the most common outcomes).

### Multiplier Consistency Verification

We verified that the same (risk, rows, slot) combination always produces the same multiplier across all 1,080 bets. Across 217 unique combinations observed:

- **Inconsistencies found: 0**
- Every time slot 4 was hit on medium/8-row, the multiplier was exactly `0.40310078`
- Every time slot 0 was hit on high/15-row, the multiplier was exactly `625.x` (full precision value)

This confirms the multiplier tables are deterministic and do not change between bets or sessions. **[Evidence: E38]**

## Independent Reproducibility

Any player can verify their Plinko results using the following inputs:

1. **Server Seed** (revealed after rotation) — Available via the Provably Fair panel after seed rotation, or via `GET /api/v2/user/transactions/{transactionId}`
2. **Client Seed** — Displayed in the Provably Fair panel and included in every API response
3. **Nonce** — Displayed in the Provably Fair panel and included in every API response
4. **Rows** — Selected by the player and confirmed in the API response

With these four values and the algorithm published on `/fairness/verify`, the player can compute the expected `final_slot` and compare it against the actual result.

Duel.com provides a built-in verification tool on the fairness page that accepts these inputs and computes the result using JavaScript running in the player's browser. The source code is fully visible and can be inspected, copied, and run independently. **[Evidence: E10, E11]**

We built our own independent verifier in TypeScript/Node.js (using the standard `crypto` module) and confirmed that it produces identical results to both the live API outcomes and the fairness page's verification tool. **[Evidence: E27, E28]**

## Transparency Limitations

While the algorithm and verification process are transparent, there are specific areas where full transparency is limited:

### Multiplier Tables Are Not Published

The multiplier tables are displayed visually in the game UI but are not published in a structured, machine-readable format. There is no endpoint like `/api/v2/plinko/multipliers` that would allow automated extraction of all 27 configurations' multiplier tables. Auditors must extract these values from actual bet responses — which requires placing real bets across every configuration.

This means players cannot independently verify the RTP of a configuration they haven't played. They can verify that their specific outcomes were correctly computed, but they cannot confirm the fairness of the overall payout structure without comprehensive testing.

### No Drand/External Randomness

The API response includes `drand_round` and `drand_randomness` fields, both of which are `null` for Plinko. The drand (distributed randomness beacon) is a public randomness service that could provide external, publicly verifiable entropy. Its absence means all randomness comes from the server seed, whose generation process is opaque.

This is not a fairness deficiency — the commit-reveal protocol prevents exploitation regardless of the seed's entropy source. But it does mean there is no external proof that the server seed was generated from a high-quality random source.

### Server-Side Computation Only

The outcome computation happens entirely on the server. The client receives only the final result (`final_slot`, `payout_multiplier`, `win_amount`). Players cannot observe the intermediate HMAC values for each row in real time — they can only verify after the fact, post-rotation. This is standard for centralized provably fair games but differs from blockchain implementations where computation occurs in a publicly verifiable smart contract.

## Evidence Coverage

| Test | Source File | Status |
|------|-----------|--------|
| Ball path determinism | `PlinkoResultsGeneratorTests.ts` | ✅ Verified |
| Multiplier symmetry | `PlinkoGameProfilesTests.ts` | ✅ Verified |
| Multiplier consistency | `PlinkoAuditExecutionChecklistTests.ts` | ✅ Verified |
| Independent verifier parity | `PlinkoResultsGeneratorTests.ts` | ✅ Verified |

**Code References:**
- Algorithm implementation: `src/plinko/PlinkoResultsGenerator.ts`
- Game profiles: `src/plinko/PlinkoGameProfiles.ts`
- Standalone verifier: `scripts/validateDuelPlinko.ts`

**Dataset:** `duel-plinko-sim-1771364316980.json` (1,080 bets, 24 seed sessions)
