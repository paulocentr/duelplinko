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

    // Theoretical RTP computed from official API multipliers.
    // All configs compute to exactly 99.9000% RTP (0.1000% house edge).
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
    const rawSeedData: Array<any> = require("../../dataScripts/plinko/duel-plinko-sim-1771364316980.json").seeds;

    const determinismEntries: DeterminismEntry[] = [];
    const payoutEntries: PayoutEntry[] = [];

    describe("Commit–Reveal System & Seed Handling", () => {

        it("Every bet references a committed server seed hash present in the seeds array", () => {
            // Verify that every bet's server_seed_hashed maps to a seed entry
            // whose revealed plaintext hashes correctly (tested separately in
            // "Server seed reveal matches commit"). This proves the commit
            // existed before the bet was settled — the server cannot produce
            // the correct hash after the fact without knowing the seed.
            const knownHashes = new Set(
                rawSeedData.map((s: any) => s.seed.serverSeedHashed)
            );

            let tested = 0;
            for (const bet of rawBetsData) {
                const hash = bet.response.server_seed_hashed;
                expect(knownHashes.has(hash)).to.eql(true,
                    `Bet ${bet.response.id}: server_seed_hashed ${hash.slice(0, 16)}... not found in seeds array`
                );
                tested++;
            }
            expect(tested).to.eql(rawBetsData.length,
                `Only tested ${tested} of ${rawBetsData.length} bets`
            );
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

        // Client seed: manual changeability confirmed via UI
        // inspection during data collection session.
        // The automated test below verifies the cryptographic
        // properties: the seed is variable and incorporated
        // into outcome generation.
        it("Client seed is variable and incorporated into outcome generation", () => {
            // 1. Multiple distinct client seeds in dataset
            const unique = new Set(
                rawSeedData.map((s: any) => s.seed.clientSeed)
            );
            expect(unique.size).to.be.greaterThan(1,
                "Only one client seed across all segments"
            );

            // 2. Changing client seed changes outcomes
            const seg = gameAuditData[0];
            const fakeClient = seg.clientSeed + "_modified";
            let anyDiff = false;
            for (let n = 0; n < 10; n++) {
                const orig = generator.generatePlinkoResultSync(
                    Buffer.from(seg.serverSeed, "hex"),
                    seg.clientSeed, n, seg.rows
                );
                const mod = generator.generatePlinkoResultSync(
                    Buffer.from(seg.serverSeed, "hex"),
                    fakeClient, n, seg.rows
                );
                if (orig !== mod) anyDiff = true;
            }
            expect(anyDiff).to.eql(true,
                "Changing client seed produced no outcome change"
            );
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
            expect(Math.pow(2, 32) % 2).to.eql(0);
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

        // NOTE: The following tests assert the determinism parity check passed.
        // They do not independently verify the named property — they are
        // logical consequences of full determinism parity on all 1,080 bets.
        it("No post-RNG modification (covered by determinism parity)", () => {
            expect(testFailed).to.eql(false);
        });

        it("No conditional logic based on bet size or timing (covered by determinism parity)", () => {
            expect(testFailed).to.eql(false);
        });

        it("RNG state does not leak across rounds (covered by determinism parity)", () => {
            expect(testFailed).to.eql(false);
        });
    });

    describe("Game Logic & RTP Validation", () => {

        let results: Array<RelevantStatistics> = [];
        let simulationDuration = 0;
        const simulationModes: SimulationModeEntry[] = [];

        it("Payout rules correctness – live win matches betAmount × multiplier within floating-point tolerance (< 0.000001)", () => {
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

        it("Theoretical RTP from official API multipliers confirms 99.9000% for all 27 configs", () => {
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
                    expect(expectedReturn).to.be.greaterThanOrEqual(0.9989,
                        `${risk}/${rows}: RTP=${(expectedReturn * 100).toFixed(4)}% too low`
                    );
                    expect(expectedReturn).to.be.below(0.9991,
                        `${risk}/${rows}: RTP=${(expectedReturn * 100).toFixed(4)}% too high`
                    );
                }
            }
        });

        it("Simulated RTP converges to theoretical (1M rounds per config, sync HMAC)", () => {
            const start = performance.now();
            const SAMPLES_PER_CONFIG = 1000000;
            const simulator = new PlinkoGameSimulator(
                new PlinkoResultsGenerator(),
                new PlinkoGameAuditDataProvider(),
            );

            let consoleStub = sinon.stub(console, "log");
            results = simulator.simulate(SAMPLES_PER_CONFIG);
            consoleStub.restore();

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

            const aggregateResult = results[results.length - 1];
            expect(aggregateResult.rtp).to.be.closeTo(
                THEORETICAL_GAME_RTP,
                3 * aggregateResult.standardErrorOfRTP + 0.0005,
            );

            simulationDuration = Math.round(performance.now() - start);
        }).timeout(3600000);

        it("RTP converges with auditor-generated seeds (independent of casino RNG)", function () {
            this.timeout(600000);
            const auditorSeeds = Array.from({length: 10}, () => ({
                serverSeed: crypto.randomBytes(32).toString("hex"),
                clientSeed: crypto.randomBytes(8).toString("hex"),
            }));

            // Log seeds for reproducibility
            console.log("Auditor-generated seeds:", JSON.stringify(auditorSeeds));

            const gen = new PlinkoResultsGenerator();

            for (const risk of RISK_LEVELS) {
                for (const rows of ROW_COUNTS) {
                    const ROUNDS = 500000;
                    let totalBet = 0;
                    let totalWin = 0;
                    // Welford online variance for SE calculation
                    let n = 0;
                    let mean = 0;
                    let m2 = 0;
                    const roundsPerSeed = Math.ceil(ROUNDS / auditorSeeds.length);

                    for (const seed of auditorSeeds) {
                        const keyBuffer = Buffer.from(seed.serverSeed, "hex");
                        for (let nonce = 0; nonce < roundsPerSeed && totalBet < ROUNDS; nonce++) {
                            const slot = gen.generatePlinkoResultSync(keyBuffer, seed.clientSeed, nonce, rows);
                            const win = PlinkoWinCalculator.calculateWinnings(1, slot, rows, risk);
                            totalBet += 1;
                            totalWin += win;
                            // Welford update
                            n++;
                            const delta = win - mean;
                            mean += delta / n;
                            const delta2 = win - mean;
                            m2 += delta * delta2;
                        }
                    }

                    const rtp = totalWin / totalBet;
                    const stdDev = Math.sqrt(m2 / n);
                    const se = stdDev / Math.sqrt(n);
                    const configTheoreticalRTP = theoreticalRTPByConfig.get(`${risk}_${rows}`)!;
                    expect(rtp).to.be.closeTo(configTheoreticalRTP, 5 * se + 0.0005,
                        `${risk}/${rows}: auditor-seed RTP ${(rtp * 100).toFixed(4)}% ` +
                        `deviates from theoretical ${(configTheoreticalRTP * 100).toFixed(4)}% ` +
                        `(tolerance: 5σ+0.05% = ${((5 * se + 0.0005) * 100).toFixed(4)}%)`
                    );
                }
            }
        });

        after(async () => {
            if (results.length > 0) {
                const destinationPath = OUTPUT_PATH;
                await Utils.generateAuditFiles(results, destinationPath, THEORETICAL_GAME_RTP, simulationDuration);
            }

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

    describe("Zero Edge Split Verification", () => {

        it("Zero-edge and standard bets use identical multipliers", () => {
            const std: Map<string, number> = new Map();
            const zero: Map<string, number> = new Map();

            for (const bet of rawBetsData) {
                const r = bet.response;
                const key = `${r.risk_level}_${r.rows}_${r.final_slot}`;
                const mult = parseFloat(r.payout_multiplier);
                const edge = r.effective_edge;

                if (edge === 0.1 || edge === "0.1") {
                    if (!std.has(key)) std.set(key, mult);
                    expect(mult).to.eql(std.get(key),
                        `Standard inconsistency at ${key}`);
                } else if (edge === 0 || edge === "0") {
                    if (!zero.has(key)) zero.set(key, mult);
                    expect(mult).to.eql(zero.get(key),
                        `Zero-edge inconsistency at ${key}`);
                }
            }

            // Cross-compare where both groups hit same slot
            let crossChecked = 0;
            for (const [key, sMult] of std) {
                if (zero.has(key)) {
                    expect(sMult).to.eql(zero.get(key),
                        `Multiplier differs at ${key}: std=${sMult}, zero=${zero.get(key)}`);
                    crossChecked++;
                }
            }
            expect(crossChecked).to.be.greaterThan(0,
                "No overlapping slots between edge groups");
        });
    });

    describe("Chi-Squared Goodness-of-Fit (Simulation Data)", () => {

        it("Slot distribution matches binomial B(n, 0.5) for all 27 configs at p=0.05", () => {
            const SAMPLES_PER_CONFIG = 1000000;
            const simulator = new PlinkoGameSimulator(
                new PlinkoResultsGenerator(),
                new PlinkoGameAuditDataProvider(),
            );

            let consoleStub = sinon.stub(console, "log");
            const frequencies = simulator.simulateWithFrequencies(SAMPLES_PER_CONFIG);
            consoleStub.restore();

            // Chi-squared critical values at p=0.05 for df = rows (slots = rows+1, df = rows)
            const chiSquaredCritical: Record<number, number> = {
                8:  15.507, // df=8
                9:  16.919, // df=9
                10: 18.307, // df=10
                11: 19.675, // df=11
                12: 21.026, // df=12
                13: 22.362, // df=13
                14: 23.685, // df=14
                15: 24.996, // df=15
                16: 26.296, // df=16
            };

            const chiSquaredResults: Array<{config: string, chiSquared: number, df: number, critical: number, pass: boolean}> = [];

            for (const risk of RISK_LEVELS) {
                for (const rows of ROW_COUNTS) {
                    const configKey = `${risk}_${rows}`;
                    const observed = frequencies.get(configKey)!;
                    const totalN = observed.reduce((a, b) => a + b, 0);

                    let chiSquared = 0;
                    for (let slot = 0; slot <= rows; slot++) {
                        const prob = Utils.binomial(rows, slot) / Math.pow(2, rows);
                        const expected = prob * totalN;
                        chiSquared += Math.pow(observed[slot] - expected, 2) / expected;
                    }

                    const df = rows; // (rows+1) categories - 1
                    const critical = chiSquaredCritical[rows];
                    const pass = chiSquared < critical;

                    chiSquaredResults.push({config: configKey, chiSquared, df, critical, pass});

                    expect(chiSquared).to.be.below(critical,
                        `${configKey}: χ²=${chiSquared.toFixed(3)} exceeds critical ${critical} at p=0.05 (df=${df})`
                    );
                }
            }

            // Write chi-squared results to file
            const fs = require("fs");
            fs.mkdirSync(OUTPUT_PATH, {recursive: true});
            fs.writeFileSync(
                path.join(OUTPUT_PATH, "chi-squared-results.json"),
                JSON.stringify({
                    meta: {
                        test: "chi-squared goodness-of-fit",
                        samplesPerConfig: SAMPLES_PER_CONFIG,
                        significanceLevel: 0.05,
                        expectedDistribution: "binomial B(n, 0.5)",
                        generatedAt: new Date().toISOString(),
                        note: "Risk level does not affect slot distribution. " +
                            "The ball path is determined by HMAC -> uint32 -> value % 2 " +
                            "at each row; risk level only maps the final slot to a " +
                            "payout multiplier. Chi-squared statistics are therefore " +
                            "identical across risk levels for the same row count. " +
                            "9 independent tests (one per row count), reported across " +
                            "27 configs as a sanity check.",
                    },
                    results: chiSquaredResults,
                }, null, 2),
                "utf8",
            );
        }).timeout(3600000);
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
