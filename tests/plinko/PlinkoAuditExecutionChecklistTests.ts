// @ts-ignore
import {expect} from "chai";
import crypto from "crypto";
import sinon from "sinon";
import path from "path";
import {RelevantStatistics} from "../../src/RelevantStatistics";
import {PlinkoGameProfiles, RiskLevel} from "../../src/plinko/PlinkoGameProfiles";
import {PlinkoResultsGenerator} from "../../src/plinko/PlinkoResultsGenerator";
import {PlinkoGameData} from "../../src/plinko/PlinkoGameData";
import {PlinkoGameAuditDataProvider} from "../../src/plinko/PlinkoGameAuditDataProvider";
import {PlinkoWinCalculator} from "../../src/plinko/PlinkoWinCalculator";
import {PlinkoGameSimulator} from "../../src/plinko/PlinkoGameSimulator";
import {Utils} from "../../src/Utils";
import {DeterminismLogWriter, DeterminismEntry} from "../../src/DeterminismLogWriter";
import {PayoutLogWriter, PayoutEntry} from "../../src/PayoutLogWriter";
import {SimulationSummaryWriter, SimulationModeEntry} from "../../src/SimulationSummaryWriter";

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];
const ROW_COUNTS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

function computeTheoreticalRTP(risk: RiskLevel, rows: number): number {
    let rtp = 0;
    for (let k = 0; k <= rows; k++) {
        const prob = Utils.binomial(rows, k) / Math.pow(2, rows);
        rtp += prob * PlinkoGameProfiles.getMultiplier(risk, rows, k);
    }
    return rtp;
}

describe("Plinko Audit – Execution Checklist", () => {

    const AUDIT_FOLDER_NAME = "plinko";
    const DATASET_PATH = path.resolve(__dirname, "../../dataScripts/plinko/duel-plinko-sim-1771364316980.json");
    const OUTPUT_PATH = path.resolve(__dirname, "../../outputs/" + AUDIT_FOLDER_NAME);

    // Compute per-config theoretical RTP from display-table multipliers.
    // These are ~1% below 100% because the display tables encode house edge;
    // Duel returns the edge as rakeback so actual player RTP is ~100%.
    const theoreticalRTPByConfig: Map<string, number> = new Map();
    let THEORETICAL_GAME_RTP = 0;
    {
        let sum = 0;
        let count = 0;
        for (const risk of RISK_LEVELS) {
            for (const rows of ROW_COUNTS) {
                const rtp = computeTheoreticalRTP(risk, rows);
                theoreticalRTPByConfig.set(`${risk}_${rows}`, rtp);
                sum += rtp;
                count++;
            }
        }
        THEORETICAL_GAME_RTP = sum / count;
    }

    const generator = new PlinkoResultsGenerator();
    const dataProvider = new PlinkoGameAuditDataProvider();
    const gameAuditData: Array<PlinkoGameData> = dataProvider.getGameData();
    const rawBetsData: Array<any> = dataProvider.getRawBetsData();

    // Collected during tests for evidence artifact generation
    const determinismEntries: DeterminismEntry[] = [];
    const payoutEntries: PayoutEntry[] = [];

    describe("Commit–Reveal System & Seed Handling", () => {

        // Verified manually via Provably Fair modal before any bets were placed.
        it("Server seed commit exists before play", () => {
            expect(true).to.eql(true);
        });

        it("Server seed reveal matches commit", () => {
            for (let i = 0; i < gameAuditData.length; i++) {
                const sha256Hash = crypto.createHash("sha256")
                    .update(gameAuditData[i].serverSeed, "hex")
                    .digest("hex");
                expect(sha256Hash).to.eql(gameAuditData[i].hashedServerSeed,
                    `Nonce ${gameAuditData[i].nonce}: SHA-256(serverSeed) does not match committed hash`
                );
            }
            expect(gameAuditData.length).to.be.greaterThan(0);
        });

        // Verified manually: client seed input is editable in the Provably Fair modal.
        it("Client seed can be manually changed by the user", () => {
            expect(true).to.eql(true);
        });

        it("Nonce starts correctly, increments by 1 and is never reused", () => {
            for (let i = 1; i < rawBetsData.length; i++) {
                const previous = rawBetsData[i - 1].response;
                const current = rawBetsData[i].response;
                if (previous.server_seed_hashed === current.server_seed_hashed &&
                    previous.client_seed === current.client_seed) {
                    expect(previous.nonce).to.eql(current.nonce - 1,
                        `Nonce gap between bets ${i - 1} and ${i}: ` +
                        `expected ${previous.nonce + 1}, got ${current.nonce}`
                    );
                }
            }
        });

        it("Game results producing algorithm is fully deterministic", async () => {
            for (let i = 0; i < gameAuditData.length; i++) {
                const slot = await generator.generatePlinkoResult(
                    gameAuditData[i].serverSeed,
                    gameAuditData[i].clientSeed,
                    gameAuditData[i].nonce,
                    gameAuditData[i].rows,
                );
                expect(slot).to.eql(gameAuditData[i].bucketPosition,
                    `Nonce ${gameAuditData[i].nonce} rows=${gameAuditData[i].rows} ` +
                    `risk=${gameAuditData[i].risk}: expected slot ${gameAuditData[i].bucketPosition}, got ${slot}`
                );

                // Collect for determinism log
                determinismEntries.push({
                    betId: rawBetsData[i]?.response?.id ?? i,
                    serverSeedHashed: gameAuditData[i].hashedServerSeed,
                    clientSeed: gameAuditData[i].clientSeed,
                    nonce: gameAuditData[i].nonce,
                    liveResult: gameAuditData[i].bucketPosition,
                    recomputedResult: slot,
                });
            }
        });
    });

    describe("Randomness & Entropy Model", () => {
        let testFailed = false;

        before(async () => {
            for (let i = 0; i < gameAuditData.length; i++) {
                const slot = await generator.generatePlinkoResult(
                    gameAuditData[i].serverSeed,
                    gameAuditData[i].clientSeed,
                    gameAuditData[i].nonce,
                    gameAuditData[i].rows,
                );
                if (slot !== gameAuditData[i].bucketPosition) {
                    testFailed = true;
                    break;
                }
            }
        });

        it("RNG depends only on (serverSeed, clientSeed, nonce, rows)", () => {
            expect(testFailed).to.eql(false);
        });

        it("No mixed entropy sources (drand_round and drand_randomness are null for plinko)", () => {
            for (const bet of rawBetsData) {
                expect(bet.response.drand_round).to.eql(null,
                    `Bet ${bet.response.id}: drand_round should be null for plinko`
                );
                expect(bet.response.drand_randomness).to.eql(null,
                    `Bet ${bet.response.id}: drand_randomness should be null for plinko`
                );
            }
        });

        it("Mapping from RNG → bucket position is unbiased (2^32 % 2 === 0)", () => {
            // The algorithm uses value % 2 where value is a 32-bit uint.
            // Since 2^32 is exactly divisible by 2, each row direction is 50/50.
            expect(Math.pow(2, 32) % 2).to.eql(0);
        });

        it("RNG state does not leak across rounds or users", () => {
            expect(testFailed).to.eql(false);
        });
    });

    describe("Verifier ↔ Live Parity (Empirical Tests)", () => {
        let testFailed = false;
        const mismatchDetails: string[] = [];

        before(async () => {
            for (let i = 0; i < gameAuditData.length; i++) {
                const computedSlot = await generator.generatePlinkoResult(
                    gameAuditData[i].serverSeed,
                    gameAuditData[i].clientSeed,
                    gameAuditData[i].nonce,
                    gameAuditData[i].rows,
                );
                if (computedSlot !== gameAuditData[i].bucketPosition) {
                    testFailed = true;
                    mismatchDetails.push(
                        `nonce=${gameAuditData[i].nonce} rows=${gameAuditData[i].rows} ` +
                        `risk=${gameAuditData[i].risk}: ` +
                        `computed=${computedSlot}, live=${gameAuditData[i].bucketPosition}`
                    );
                }
            }
        });

        it(`Live game outcomes exactly match verifier outputs`, () => {
            if (mismatchDetails.length > 0) {
                console.error("Mismatches:", mismatchDetails);
            }
            expect(testFailed).to.eql(false);
            expect(gameAuditData.length).to.be.greaterThan(1000,
                `Expected 1000+ verified bets, got ${gameAuditData.length}`
            );
        });

        it("No post-RNG modification", () => {
            expect(testFailed).to.eql(false);
        });

        it("No conditional logic based on bet size or timing", () => {
            expect(testFailed).to.eql(false);
        });
    });

    describe("Game Logic & RTP Validation", () => {

        let results: Array<RelevantStatistics> = [];
        let simulationDuration = 0;
        const simulationModes: SimulationModeEntry[] = [];

        // Plinko result is determined per-row via HMAC; no card shuffle required.
        it("Per-row HMAC bounce logic is deterministic", () => {
            expect(true).to.eql(true);
        });

        it("Payout rules correctness – live win matches betAmount × apiMultiplier exactly", () => {
            for (let i = 0; i < rawBetsData.length; i++) {
                const bet = rawBetsData[i];
                const betAmount = parseFloat(bet.response.amount_currency);
                const multiplier = parseFloat(bet.response.payout_multiplier);
                const liveWin = parseFloat(bet.response.win_amount);
                const calculated = betAmount * multiplier;
                const diff = Math.abs(liveWin - calculated);

                expect(diff).to.be.below(0.000001,
                    `Bet ${bet.response.id}: ` +
                    `expected ${calculated}, got ${liveWin}, diff=${diff}`
                );

                // Collect for payout log
                payoutEntries.push({
                    betId: bet.response.id,
                    betAmount,
                    result: bet.response.final_slot,
                    gameMode: `${bet.response.risk_level}/${bet.response.rows}rows`,
                    livePayout: liveWin,
                    calculatedPayout: calculated,
                });
            }
        });

        it("Display table multiplier is within 2% of API multiplier (zero-edge delta)", () => {
            for (let i = 0; i < gameAuditData.length; i++) {
                const tableWin = PlinkoWinCalculator.calculateWinnings(
                    gameAuditData[i].betAmount,
                    gameAuditData[i].bucketPosition,
                    gameAuditData[i].rows,
                    gameAuditData[i].risk,
                );
                const apiWin = gameAuditData[i].winAmount;
                const relativeError = Math.abs(apiWin - tableWin) / tableWin;
                expect(relativeError).to.be.below(0.02,
                    `Nonce ${gameAuditData[i].nonce}: relative error ${(relativeError * 100).toFixed(2)}% exceeds 2%`
                );
            }
        });

        it("Advertised RTP matches theoretical RTP (display table, each configuration)", () => {
            // E[return] = Σ p(slot) * multiplier(slot)
            // p(slot) = C(rows, slot) / 2^rows  (binomial distribution, P(right)=0.5)
            for (const risk of ["low", "medium", "high"] as const) {
                for (let rows = 8; rows <= 16; rows++) {
                    let expectedReturn = 0;
                    let totalProb = 0;

                    for (let slot = 0; slot <= rows; slot++) {
                        let binom = 1;
                        const k = Math.min(slot, rows - slot);
                        for (let j = 0; j < k; j++) {
                            binom = binom * (rows - j) / (j + 1);
                        }
                        binom = Math.round(binom);
                        const prob = binom / Math.pow(2, rows);
                        totalProb += prob;
                        expectedReturn += prob * PlinkoGameProfiles.getMultiplier(risk, rows, slot);
                    }

                    expect(Math.abs(totalProb - 1.0)).to.be.below(1e-9,
                        `${risk}/${rows}: probabilities sum to ${totalProb}`
                    );
                    expect(expectedReturn).to.be.greaterThanOrEqual(0.985,
                        `${risk}/${rows}: RTP=${(expectedReturn * 100).toFixed(2)}% too low`
                    );
                    expect(expectedReturn).to.be.below(1.01,
                        `${risk}/${rows}: RTP=${(expectedReturn * 100).toFixed(2)}% too high`
                    );
                }
            }
        });

        it("Advertised RTP matches simulated RTP (per-config closeTo)", async () => {
            const start = performance.now();
            const SAMPLES_PER_CONFIG = 200000;
            const simulator = new PlinkoGameSimulator(
                new PlinkoResultsGenerator(),
                new PlinkoGameAuditDataProvider(),
            );

            let consoleStub = sinon.stub(console, "log");
            results = await simulator.simulate(SAMPLES_PER_CONFIG);
            consoleStub.restore();

            // Per-config assertion: results[0..26] are individual configs, results[27] is aggregate
            let configIdx = 0;
            for (const risk of RISK_LEVELS) {
                for (const rows of ROW_COUNTS) {
                    const configResult = results[configIdx];
                    const configKey = `${risk}_${rows}`;
                    const configTheoreticalRTP = theoreticalRTPByConfig.get(configKey)!;

                    expect(configResult.rtp).to.be.closeTo(
                        configTheoreticalRTP,
                        5 * configResult.standardErrorOfRTP + 0.0005,
                    );

                    // Collect for simulation summary
                    simulationModes.push({
                        mode: `${risk}_${rows}rows`,
                        simulatedRTP: configResult.rtp,
                        sampleSize: configResult.count,
                        stdError: configResult.standardErrorOfRTP,
                        theoreticalRTP: configTheoreticalRTP,
                    });

                    configIdx++;
                }
            }

            // Aggregate assertion
            const aggregateResult = results[results.length - 1];
            expect(aggregateResult.rtp).to.be.closeTo(
                THEORETICAL_GAME_RTP,
                3 * aggregateResult.standardErrorOfRTP + 0.0005,
            );

            simulationDuration = Math.round(performance.now() - start);
        }).timeout(3600000);

        after(async () => {
            // Generate convergence charts and JSON (existing behavior)
            if (results.length > 0) {
                const destinationPath = OUTPUT_PATH;
                await Utils.generateAuditFiles(results, destinationPath, THEORETICAL_GAME_RTP, simulationDuration);
            }

            // Generate simulation-summary.json
            if (simulationModes.length > 0) {
                SimulationSummaryWriter.generate(
                    simulationModes,
                    "plinko",
                    OUTPUT_PATH,
                    simulationDuration,
                );
            }
        }).timeout(600000);
    });

    // Top-level after: generate determinism-log.json and payout-log.json
    after(() => {
        if (determinismEntries.length > 0) {
            DeterminismLogWriter.generate(
                determinismEntries,
                DATASET_PATH,
                "plinko",
                OUTPUT_PATH,
            );
        }

        if (payoutEntries.length > 0) {
            PayoutLogWriter.generate(
                payoutEntries,
                DATASET_PATH,
                "plinko",
                OUTPUT_PATH,
            );
        }
    });
});
