# Game Rules Reference

## Game Description

Plinko is a variable-variance casino game where a ball drops through a triangular field of pins, bouncing left or right at each row before landing in a numbered slot at the bottom. Each slot carries a multiplier that determines the payout. The game is purely outcome-based — the player's only choices are the bet amount, risk level, and number of rows.

## Game Parameters

| Parameter | Value |
|-----------|-------|
| Game type | Original (Duel.com proprietary) |
| Outcome range | Slot 0 to Slot *n* (where *n* = number of rows) |
| Row configurations | 8, 9, 10, 11, 12, 13, 14, 15, 16 |
| Risk levels | Low, Medium, High |
| Total configurations | 27 (3 risks × 9 rows) |
| House edge | 0.1% (99.9% RTP) |
| Minimum bet | $0.01 USDT |
| Currency | USDT |
| RNG algorithm | HMAC-SHA256 |
| Seed format | Server: 64-char hex (32 bytes); Client: alphanumeric string |
| Nonce | Auto-incrementing integer, resets on seed rotation |

## Slot Distribution

The ball starts at position 0 and adds 0 or 1 at each row based on `HMAC_output % 2`. The final position follows a binomial distribution B(n, 0.5):

```
P(slot = k) = C(n, k) / 2^n
```

| Rows | Total Slots | Center Slot | P(center) | P(edge) |
|------|-------------|-------------|-----------|---------|
| 8    | 9 (0–8)     | 4           | 27.34%    | 0.39%   |
| 10   | 11 (0–10)   | 5           | 24.61%    | 0.10%   |
| 12   | 13 (0–12)   | 6           | 22.56%    | 0.024%  |
| 14   | 15 (0–14)   | 7           | 20.95%    | 0.006%  |
| 16   | 17 (0–16)   | 8           | 19.64%    | 0.0015% |

## Multiplier Structure

Each (risk, rows) configuration has a symmetric multiplier table. Multipliers increase toward the edges and decrease toward the center. The display values shown in the UI are rounded; the actual payout uses full-precision values from the API (typically 8 decimal places).

**Example — 8-Row Board:**

| Slot | Low (display) | Low (API) | Medium (display) | Medium (API) | High (display) | High (API) |
|------|--------------|-----------|-----------------|-------------|---------------|-----------|
| 0    | 5.7x         | —         | 13x             | 13.13061608 | 29x           | —         |
| 1    | 2.1x         | 2.11942541| 3x              | 3.03014217  | 4x            | 4.03381703|
| 2    | 1.1x         | 1.11017522| 1.3x            | 1.31306161  | 1.5x          | 1.51268139|
| 3    | 1.0x         | 1.00925020| 0.7x            | 0.70703318  | 0.3x          | 0.30253628|
| 4    | 0.5x         | 0.50462510| 0.4x            | 0.40401896  | 0.2x          | 0.20169085|
| 5–8  | *(symmetric)* | | *(symmetric)* | | *(symmetric)* | |

"—" indicates the slot was not observed in the dataset (extreme edge, probability 0.39%).

## Payout Formula

```
win_amount = amount_currency × payout_multiplier
```

The payout multiplier is returned by the API with full precision (8+ decimal places). The `win_amount` is computed server-side with 18-decimal-place precision.

## Variance Profile

All three risk levels target the same theoretical RTP (~99.9%) but differ in variance:

| Risk Level | Center Multiplier | Edge Multiplier (16-row) | Win Rate | Variance |
|-----------|-------------------|--------------------------|----------|----------|
| Low       | ~0.5x             | 16x                      | ~52%     | Low      |
| Medium    | ~0.3x             | 111x                     | ~32%     | Medium   |
| High      | ~0.2x             | 1,000x                   | ~17%     | Very High|
