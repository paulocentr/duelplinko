# System Architecture

## What Was Tested

- Client and server architecture of the Duel.com platform
- API endpoint structure and data flow for Plinko bets
- Seed management and commit-reveal lifecycle
- Public fairness documentation and verification tools
- SES lockdown and client-side security measures

## What This Means for Players

The system architecture is straightforward: a centralized REST API computes outcomes server-side using HMAC-SHA256, with seed commitments published before betting begins. Players interact through a Vue.js client with SES hardening. The fairness page publishes the full algorithm source code for independent verification.

## Verdict Summary

| Component | Status | Finding |
|-----------|--------|---------|
| API structure | ✅ Documented | Clean REST API with complete outcome data |
| Seed lifecycle | ✅ Sound | Standard commit-reveal with 24/24 verifications |
| Fairness documentation | ✅ Published | Full algorithm source code on /fairness/verify |
| Client security (SES) | ✅ Active | Protects against client-side attacks |

**Overall Verdict:** Architecture supports provable fairness verification.

## Platform Overview

Duel.com is a centralized online casino platform operated by Immortal Snail LLC, registered in Nevis, West Indies. The platform operates under license No. ALSI-202411026-FI1 from the Government of the Autonomous Island of Anjouan, Union of Comoros. It offers a suite of original provably fair games alongside third-party casino and sports betting products. **[Evidence: E01, E08]**

The platform's tagline — "The First Casino That Gives a F*ck" — reflects a marketing emphasis on transparency, zero/low house edge, and provable fairness. All original games (Dice, Blackjack, Plinko, Crash, Mines, Beef, Keno, Castle Roulette) are labeled "100% RTP" on the homepage, though the actual effective RTP varies by game and configuration. **[Evidence: E01]**

## Client Architecture

The Duel.com frontend is a single-page application built with Vue.js, served from `duel.com`. The application loads a substantial JavaScript bundle (`index-VX4WAk0H.js`) that handles all game rendering, API communication, and user interface logic.

A notable security feature of the client is the integration of **SES (Secure EcmaScript) lockdown**. On page load, the console displays the following warning:

```
Do not send anyone your cookies or paste anything into this console
```

SES lockdown hardens the JavaScript runtime by freezing built-in prototypes and restricting dynamic code evaluation. This prevents a class of client-side attacks (prototype pollution, eval-based injection) but also makes it more difficult for players to inspect or modify the running application — a double-edged characteristic discussed in the Trust Analysis section. **[Evidence: E16]**

The Plinko game interface is embedded directly in the main application (not in an iframe) and communicates with the backend via REST API calls. Game state is managed entirely server-side; the client renders the visual ball animation after receiving the authoritative result from the server. **[Evidence: E02, E03]**

## Server Architecture

The backend serves a REST API at `duel.com/api/v2/`. The primary endpoints relevant to Plinko fairness are:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/plinko/bet` | POST | Place a Plinko bet |
| `/api/v2/client-seed/rotate` | POST | Rotate seeds (reveals previous server seed) |
| `/api/v2/user/security/token` | POST | Refresh security token (expires every ~10 min) |
| `/api/v2/user/transactions/{id}` | GET | Retrieve transaction details (includes revealed seed) |

### Bet API

A Plinko bet request includes:

```json
{
  "amount": "0.010004902402177",
  "currency": 105,
  "instant": true,
  "risk_level": 1,
  "rows": 8,
  "security_token": "..."
}
```

The server responds with the complete outcome:

```json
{
  "id": 56195484,
  "rows": 8,
  "risk_level": "low",
  "final_slot": 4,
  "payout_multiplier": "0.50462510",
  "amount_currency": "0.010004902402177000",
  "win_amount": "0.005048724875188809",
  "nonce": 0,
  "server_seed_hashed": "c1722335a7b13bd1...",
  "client_seed": "Y9yByIltIt",
  "effective_edge": 0.1,
  "drand_round": null,
  "drand_randomness": null,
  "transaction_id": 382656468
}
```

**[Evidence: E17, E18]**

Several fields merit attention:

- `server_seed_hashed`: The SHA-256 hash of the active server seed, committed before betting begins. This is the cryptographic commitment that prevents post-bet manipulation.
- `client_seed`: A string contributed by the player, incorporated into the HMAC computation. Players can set this to any value they choose.
- `nonce`: An incrementing counter, unique per bet within a seed pair. Ensures each bet produces a different outcome even with the same seeds.
- `effective_edge`: The house edge applied to this specific bet. Most bets show 0.1 (meaning 0.1% edge, or 99.9% RTP). Some show 0 (Duel's "Zero Edge" promotional feature).
- `drand_round` and `drand_randomness`: Both null for Plinko. These fields exist for potential future integration with the drand distributed randomness beacon but are not currently used.

## Seed Management and Rotation

The seed lifecycle follows a standard commit-reveal protocol:

```
1. Server generates random server_seed
2. Server computes hash = SHA-256(hexDecode(server_seed))
3. Server publishes hash to player BEFORE any bets
4. Player sets or accepts a client_seed
5. Bets are placed using (server_seed, client_seed, incrementing nonce)
6. Player requests seed rotation
7. Server reveals plaintext server_seed
8. Player verifies: SHA-256(hexDecode(revealed_seed)) === committed_hash
9. New server_seed is generated, new hash is committed
10. Cycle repeats
```

This protocol is the foundation of provable fairness. Because the server commits to the seed hash before the player bets, the server cannot change the seed after seeing the wager. Because the player contributes the client seed, the server cannot precompute favorable outcomes (assuming the client seed is non-trivial). **[Evidence: E12, E14]**

In our testing, we performed 24 seed rotations across 3 phases of betting. Each rotation correctly revealed the previous server seed and committed to a new hash for the next segment. All 24 revealed seeds matched their committed hashes exactly. **[Evidence: E29]**

## Fairness Documentation

Duel.com provides a public fairness page at `/fairness` with two sections:

1. **Overview** — Explains the commit-reveal concept in plain language, describing server seeds, client seeds, and nonces. **[Evidence: E09]**

2. **Verify** — Provides a per-game verification tool where players can input their seeds and nonce to independently compute the game result. The tool includes full JavaScript source code for each game's algorithm. For Plinko, the code uses `hexToBytes()` to decode the server seed, `TextEncoder` for the HMAC message, and iterates over rows with a cursor-based HMAC to determine each bounce direction. **[Evidence: E10, E11]**

The verification code on the fairness page matches the algorithm we independently reverse-engineered and used for our testing. This consistency between the published algorithm and the actual server behavior is a positive indicator of transparency.

## Architecture Diagram

```
┌─────────────────────────┐
│     Player Browser      │
│  (Vue.js + SES lockdown)│
│                         │
│  ┌───────────────────┐  │
│  │   Plinko Client   │  │
│  │  - Ball animation │  │
│  │  - UI controls    │  │
│  │  - API calls      │  │
│  └─────────┬─────────┘  │
└────────────┼────────────┘
             │ HTTPS REST API
             ▼
┌─────────────────────────┐
│     Duel.com Server     │
│                         │
│  ┌───────────────────┐  │
│  │  Seed Manager     │  │
│  │  - Generate seed  │  │
│  │  - Commit hash    │  │
│  │  - Track nonce    │  │
│  │  - Reveal on      │  │
│  │    rotation       │  │
│  └─────────┬─────────┘  │
│            │             │
│  ┌─────────▼─────────┐  │
│  │  Plinko Engine    │  │
│  │  - HMAC-SHA256    │  │
│  │  - Per-row cursor │  │
│  │  - Slot → Multi   │  │
│  │  - Payout calc    │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## What This Means for Trust

Unlike blockchain-based casinos (such as Luck.io, which uses Solana and VRF oracles), Duel.com is a fully centralized platform. This has specific implications:

- **No on-chain record**: Bet outcomes are stored in Duel's database, not on a public blockchain. If the platform goes offline, historical bet records may be lost.
- **No smart contract verification**: The fairness logic runs on Duel's servers. Players cannot inspect the server-side code — they can only verify outcomes after the fact using the commit-reveal protocol.
- **Server seed entropy**: The randomness of the server seed depends entirely on Duel's server-side random number generator. Players must trust that the server seed is genuinely random, though the commit-reveal scheme prevents exploitation regardless of seed quality.
- **Payout execution**: Payouts are executed by Duel's internal balance system. There is no escrow contract or automated on-chain settlement.

These are standard characteristics of centralized provably fair casinos. The commit-reveal protocol provides strong protection against outcome manipulation, which is the primary concern in game fairness. The centralization trade-offs are discussed in detail in the [Operator Trust Analysis](operator-trust-analysis.md) section.

## Evidence Coverage

| Item | Evidence | Status |
|------|---------|--------|
| Platform identification | E01, E08 | ✅ Documented |
| Game interface | E02, E03 | ✅ Captured |
| API request/response format | E17, E18 | ✅ Documented |
| Fairness page | E09, E10, E11 | ✅ Captured |
| Provably fair panel | E12, E13 | ✅ Captured |
| Seed rotation records | E14, E15, E29 | ✅ Verified |
| SES lockdown | E16 | ✅ Observed |

**Dataset:** `duel-plinko-sim-1771364316980.json` (1,080 bets, 24 seed sessions)
