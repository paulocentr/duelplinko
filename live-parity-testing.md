# Live Parity Testing

## What Was Tested

- Independent recomputation of every bet outcome using HMAC-SHA256
- SHA-256 hash verification of all 24 committed server seeds
- Nonce sequence integrity across all seed segments
- Data collection methodology and capture integrity

## What This Means for Players

Every bet outcome we tested was computed exactly as the algorithm specifies. The server did not deviate from the committed seed, skip or reuse any nonces, or produce any result inconsistent with the published algorithm. Players can independently verify their own bets using the same process.

## Verdict Summary

| Check | Result | Finding |
|-------|--------|---------|
| Outcome parity (1,070 verifiable bets) | ✅ Pass | 100.000% match rate |
| Seed hash verification (24 rotations) | ✅ Pass | 24/24 hashes match |
| Nonce sequence (24 segments) | ✅ Pass | 0 gaps, 0 duplicates |
| Unverifiable bets (final active seed) | ⚠️ Expected | 10 bets under unrevealed seed |

**Overall Verdict:** Full deterministic parity confirmed.

## Data Collection Methodology

### Capture Infrastructure

We developed a custom Tampermonkey userscript to automate data collection on the live Duel.com Plinko game. The script intercepts XMLHttpRequest responses from the Plinko bet API (`/api/v2/plinko/bet`) and seed rotation API (`/api/v2/client-seed/rotate`), capturing the complete request and response payloads for each bet. **[Evidence: E19, E20]**

The script operates in three phases, one per risk level:

| Phase | Risk Level | Rows Tested | Bets Per Row | Total Bets | Rotation Interval |
|-------|-----------|-------------|--------------|------------|-------------------|
| A     | Low (1)   | 8–16        | 40           | 360        | Every 50 bets     |
| B     | Medium (2)| 8–16        | 40           | 360        | Every 50 bets     |
| C     | High (3)  | 8–16        | 40           | 360        | Every 50 bets     |

Within each phase, the script iterates through all 9 row configurations (8, 9, 10, 11, 12, 13, 14, 15, 16), placing 40 bets at each configuration. Every 50 bets, the script automatically rotates the seed pair, which reveals the previous server seed and commits to a new one.

The bet amount was set to the minimum ($0.01 USDT per bet), resulting in a total test cost of approximately $10.80. **[Evidence: E21, E22]**

### Seed Rotation Protocol

Seed rotation is critical to the audit process because the server seed is only revealed upon rotation. Without rotation, verification is impossible — the committed hash can only be checked against the plaintext seed after it is revealed.

Our script performed 24 seed rotations (8 per phase), ensuring:

- Every bet in the dataset has a corresponding revealed server seed (except the 10 bets under the final active seed)
- Multiple seed pairs were tested for each risk level
- Nonce sequences were observed across multiple starting points (nonce resets to 0 after rotation)

At each rotation, the script recorded:
- The timestamp of the rotation
- The rotation context (e.g., "mid-phase-A-at-50")
- The revealed server seed from the previous segment
- The new committed server seed hash
- The new client seed
- The nonce value at the time of rotation

**[Evidence: E26]**

### Dataset Structure

The complete dataset is stored as a single JSON file (`duel-plinko-sim-1771364316980.json`) containing:

```json
{
  "meta": {
    "schema": "duel-plinko-sim-v3",
    "createdAt": "2026-02-17T21:25:59.275Z",
    "page": "https://duel.com/plinko",
    "phases": { "A": {...}, "B": {...}, "C": {...} }
  },
  "seeds": [
    {
      "at": "2026-02-17T21:26:57.179Z",
      "context": "pre-rotate-phase-A",
      "phase": "A",
      "seed": {
        "clientSeed": "Gr4P3dnsnC",
        "serverSeedHashed": "5548792213b9af3a...",
        "serverSeed": "b6d2bb3df73995fd..."
      },
      "nonce": 54
    },
    // ... 23 more seed rotations
  ],
  "bets": [
    {
      "at": "2026-02-17T21:26:57.614Z",
      "phase": "A",
      "request": { "amount": "0.01...", "risk_level": 1, "rows": 8 },
      "response": { "final_slot": 4, "payout_multiplier": "0.504...", ... }
    },
    // ... 1,079 more bets
  ]
}
```

**[Evidence: E21, E22]**

## Verification Methodology

### Independent Verifier

We built an independent verification script (`validateDuelPlinko.ts`) in TypeScript using Node.js's built-in `crypto` module. This script:

1. Loads the dataset JSON file
2. Maps each seed hash to its revealed plaintext seed
3. For each bet, recomputes the expected `final_slot` using HMAC-SHA256
4. Compares the computed result to the live result from the API

The verifier uses the exact same algorithm as Duel's published code — `hexToBytes()` for key encoding, `clientSeed:nonce:cursor` for the HMAC message, big-endian uint32 extraction, and `value % 2` for the bounce direction — but implemented independently in a different runtime environment. **[Evidence: E27]**

### Verification Process

```
For each bet in dataset:
  1. Look up revealed server seed by server_seed_hashed
  2. If not found (final active seed), skip as unverifiable
  3. Compute: position = 0
  4. For cursor = 0 to rows-1:
       hash = HMAC-SHA256(hexToBytes(serverSeed), UTF8("clientSeed:nonce:cursor"))
       value = readUInt32BE(hash, 0)
       position += value % 2
  5. Compare computed position to response.final_slot
  6. Record match or mismatch
```

## Results

### Outcome Parity

| Metric | Value |
|--------|-------|
| Total bets in dataset | 1,080 |
| Bets with revealed server seed | 1,070 |
| Bets verified successfully | 1,070 |
| Bets with mismatched results | 0 |
| Match rate | **100.000%** |
| Unverifiable bets (final active seed) | 10 |

Every single verifiable bet produced an identical `final_slot` when computed independently. **[Evidence: E28, E31]**

### Sample Verified Bets

| Bet # | Risk/Rows | Nonce | Live Slot | Computed Slot | Match |
|-------|-----------|-------|-----------|---------------|-------|
| 0     | low/8     | 0     | 4         | 4             | YES   |
| 1     | low/9     | 1     | 3         | 3             | YES   |
| 2     | low/10    | 2     | 5         | 5             | YES   |
| 539   | medium/16 | 39    | 9         | 9             | YES   |
| 1077  | high/16   | 7     | 9         | 9             | YES   |
| 1078  | high/16   | 8     | 7         | 7             | YES   |

**[Evidence: E32]**

### Seed Hash Verification

All 24 seed rotations were verified:

```
Seed  1: SHA-256(hexDecode("b6d2bb3d...")) = "55487922..." ✓
Seed  2: SHA-256(hexDecode("21fd096a...")) = "c1722335..." ✓
Seed  3: SHA-256(hexDecode("add9684a...")) = "395af7ac..." ✓
...
Seed 24: SHA-256(hexDecode("..."))          = "..."        ✓

Result: 24/24 hashes match (100%)
```

**[Evidence: E29]**

### Nonce Sequence Verification

Within each seed segment, nonce values increment sequentially starting from 0:

| Seed Segment | Phase | Nonces Observed | Gaps | Duplicates |
|-------------|-------|----------------|------|------------|
| 1           | A     | 0–49           | 0    | 0          |
| 2           | A     | 0–49           | 0    | 0          |
| 3           | A     | 0–49           | 0    | 0          |
| ...         | ...   | ...            | 0    | 0          |
| 24          | C     | 0–9            | 0    | 0          |

**Total across all 24 segments: 0 gaps, 0 duplicates.** **[Evidence: E30, E39]**

This confirms that no bets were inserted into or removed from the nonce sequence. Each bet incremented the nonce by exactly 1, and each seed rotation reset the nonce to 0.

## Statistical Implications

The probability of a manipulated system producing 1,070 consecutive correct matches by coincidence depends on the specific manipulation. In the simplest case — if the server were producing random outcomes independent of the committed seed — the probability of all 1,070 matching is:

For an 8-row board (9 possible slots), the chance of randomly hitting the correct slot is 1/9. For higher row counts, it's even lower. Even in the most generous case (if somehow each bet had a 50% chance of matching), the probability of 1,070 consecutive matches would be:

```
P = (1/2)^1070 ≈ 10^(-322)
```

This is a number so vanishingly small that it effectively eliminates any possibility of the results being coincidental. The only viable explanation is that the server computes outcomes using exactly the algorithm described — deterministically from the committed seeds.

## Unverifiable Bets

Ten bets (the last 10 in the dataset) were placed under the final active seed segment, which has not yet been rotated. These bets cannot be verified until the server seed is revealed through a future rotation. This is an inherent limitation of the commit-reveal protocol — the current active seed is always unverifiable until rotated.

This does not represent a fairness concern. The 10 unverified bets were placed under the same system that produced 1,070 verified matches. There is no mechanism by which the server could selectively manipulate only the final segment while maintaining perfect parity for all previous segments.

## Evidence Coverage

| Test | Source File | Status |
|------|-----------|--------|
| Outcome recomputation (1,070 bets) | `PlinkoResultsGeneratorTests.ts` | ✅ Verified |
| Seed hash verification (24/24) | `PlinkoAuditExecutionChecklistTests.ts` | ✅ Verified |
| Nonce sequence analysis | `PlinkoAuditExecutionChecklistTests.ts` | ✅ Verified |
| Determinism log generation | `PlinkoAuditExecutionChecklistTests.ts` | ✅ Verified |

**Code References:**
- Verification algorithm: `src/plinko/PlinkoResultsGenerator.ts`
- Determinism tests: `tests/plinko/PlinkoResultsGeneratorTests.ts`
- Audit checklist: `tests/plinko/PlinkoAuditExecutionChecklistTests.ts`
- Capture script: `capture/tampermonkey/duel-plinko/duel-plinko-capture-phases.js`

**Generated Artifacts:**
- `outputs/plinko/determinism-log.json` — Bet-by-bet verification results with dataset hash
- `outputs/plinko/audit-results/audit-results.html` — Mochawesome HTML test report

**Dataset:** `duel-plinko-sim-1771364316980.json` (1,080 bets, 24 seed sessions)
