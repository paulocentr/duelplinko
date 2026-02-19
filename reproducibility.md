# Reproducibility

## Public Repository

All audit code, test data, and verification scripts are available in a public repository.

| Item | Value |
|------|-------|
| Dataset | `duel-plinko-sim-1771364316980.json` |
| Dataset SHA-256 | `2000cb5f865263ac2556cc7781682ff66fcd32c9c1230a27bf1ce74638c70c16` |
| Dataset records | 1,080 bets across 24 seed sessions |
| Dataset created | 2026-02-17T21:25:59.275Z |
| Test framework | TypeScript + Mocha + Mochawesome |

## Prerequisites

- Node.js v16.x or later (tested on v22.11.0)
- npm 8.x or later (tested on 11.3.0)

## Setup

```bash
# Clone the repository
git clone <repository-url>
cd pfduelplinko

# Install dependencies
npm install
```

## Running the Audit

### Generate all Plinko audit files

```bash
npm run generate-plinko-audit-files
```

This executes all Plinko test suites and produces:
- `outputs/plinko/audit-results/audit-results.html` — Mochawesome HTML report
- `outputs/plinko/audit-results/audit-results.json` — Mochawesome JSON report
- `outputs/plinko/determinism-log.json` — Bet-by-bet determinism verification
- `outputs/plinko/payout-log.json` — Bet-by-bet payout verification
- `outputs/plinko/simulation-summary.json` — Monte Carlo simulation results
- 27 per-mode convergence charts (PNG) and simulation detail files (JSON)
- 1 aggregate convergence chart and detail file

### Run specific test categories

```bash
# All Plinko tests (41 tests)
npx mocha --spec tests/plinko/**/*.ts

# Algorithm correctness tests only
npx mocha --spec tests/plinko/PlinkoResultsGeneratorTests.ts

# Payout and multiplier tests only
npx mocha --spec tests/plinko/PlinkoWinCalculatorTests.ts

# Game profile tests only
npx mocha --spec tests/plinko/PlinkoGameProfilesTests.ts

# Full audit execution checklist (determinism, payouts, simulation, evidence artifacts)
npx mocha --spec tests/plinko/PlinkoAuditExecutionChecklistTests.ts
```

### Generate PDF report

```bash
npm run convert-audit-results-to-pdf
```

### Generate Dice audit files (demonstrates writer reusability)

```bash
npm run generate-dice-audit-files
```

## Verifying the Dataset

To independently verify that bets in the dataset match the HMAC-SHA256 algorithm:

```bash
npx ts-node scripts/validateDuelPlinko.ts
```

This standalone script:
1. Loads the dataset JSON
2. Maps each seed hash to its revealed plaintext seed
3. Recomputes every bet outcome using HMAC-SHA256
4. Reports match/mismatch counts and details

## Viewing Reports

After generating audit files:

```bash
# macOS
open outputs/plinko/audit-results/audit-results.html

# Linux
xdg-open outputs/plinko/audit-results/audit-results.html

# Windows
start outputs/plinko/audit-results/audit-results.html
```

## Test Results Summary

When all tests pass, the output shows:

```
  41 passing
```

Broken down by suite:
- **PlinkoGameProfilesTests** — Multiplier table structure and symmetry validation
- **PlinkoWinCalculatorTests** — Payout calculation correctness
- **PlinkoResultsGeneratorTests** — HMAC-SHA256 algorithm determinism verification
- **PlinkoAuditExecutionChecklistTests** — Full audit checklist: determinism log, payout log, simulation convergence, evidence artifact generation
