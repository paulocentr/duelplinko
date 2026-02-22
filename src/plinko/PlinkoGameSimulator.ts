import {PlinkoResultsGenerator} from "./PlinkoResultsGenerator";
import {PlinkoGameAuditDataProvider} from "./PlinkoGameAuditDataProvider";
import {PlinkoWinCalculator} from "./PlinkoWinCalculator";
import {RiskLevel} from "./PlinkoGameProfiles";
import {PayoutStatsTracker} from "../PayoutStatsTracker";
import {RelevantStatistics} from "../RelevantStatistics";

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];
const ROW_COUNTS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

export class PlinkoGameSimulator {
    constructor(
        private plinkoResultsGenerator: PlinkoResultsGenerator,
        private plinkoGameAuditDataProvider: PlinkoGameAuditDataProvider,
    ) {}

    /**
     * Sync simulation using crypto.createHmac for performance.
     * API-precision multipliers are used via PlinkoWinCalculator → PlinkoGameProfiles.API_MULTIPLIERS.
     */
    public simulate(samplesPerConfig: number): Array<RelevantStatistics> {
        const gameStatistics: Array<RelevantStatistics> = [];
        const seeds = this.plinkoGameAuditDataProvider.getSeeds();
        const totalPayoutStatsTracker = new PayoutStatsTracker();

        // Pre-allocate key buffers for each seed (avoids repeated hex→bytes conversion)
        const keyBuffers = seeds.map(seed => Buffer.from(seed.serverSeed, 'hex'));

        for (const risk of RISK_LEVELS) {
            for (const rows of ROW_COUNTS) {
                const configPayoutStatsTracker = new PayoutStatsTracker();
                const nonceMax = Math.ceil(samplesPerConfig / seeds.length);

                for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
                    const keyBuffer = keyBuffers[seedIdx];
                    const clientSeed = seeds[seedIdx].clientSeed;

                    for (let i = 0; i < nonceMax && configPayoutStatsTracker.count < samplesPerConfig; i++) {
                        const betAmount = 1;

                        const slot = this.plinkoResultsGenerator.generatePlinkoResultSync(
                            keyBuffer,
                            clientSeed,
                            i,
                            rows,
                        );

                        const winAmount = PlinkoWinCalculator.calculateWinnings(betAmount, slot, rows, risk);
                        configPayoutStatsTracker.record(betAmount, winAmount);
                        totalPayoutStatsTracker.record(betAmount, winAmount);
                    }
                }

                console.log(`Statistics for ${risk} / ${rows} rows:`);
                console.log(configPayoutStatsTracker.snapshotRelevant());
                configPayoutStatsTracker.setChartTitle(`Plinko RTP – ${risk} Risk, ${rows} Rows`);
                configPayoutStatsTracker.setChartFileName(`Plinko_RTP_${risk}_${rows}rows`);
                configPayoutStatsTracker.setSeeds(seeds);
                gameStatistics.push(configPayoutStatsTracker.snapshotRelevant());
                console.log();
            }
        }

        console.log();
        console.log("----------------------------------------");
        console.log("Statistics For All Configurations Combined:");
        console.log(totalPayoutStatsTracker.snapshotRelevant());
        totalPayoutStatsTracker.setChartTitle("Plinko RTP Convergence (All Configs)");
        totalPayoutStatsTracker.setChartFileName("Plinko_RTP_Convergence_All");
        totalPayoutStatsTracker.setSeeds(seeds);
        gameStatistics.push(totalPayoutStatsTracker.snapshotRelevant());

        return gameStatistics;
    }

    /**
     * Collects per-slot frequency counts during simulation for chi-squared testing.
     * Returns a Map of "risk_rows" → number[] where index = slot, value = observed count.
     */
    public simulateWithFrequencies(samplesPerConfig: number): Map<string, number[]> {
        const frequencies: Map<string, number[]> = new Map();
        const seeds = this.plinkoGameAuditDataProvider.getSeeds();
        const keyBuffers = seeds.map(seed => Buffer.from(seed.serverSeed, 'hex'));

        for (const risk of RISK_LEVELS) {
            for (const rows of ROW_COUNTS) {
                const configKey = `${risk}_${rows}`;
                const slotCounts = new Array(rows + 1).fill(0);
                let totalCount = 0;
                const nonceMax = Math.ceil(samplesPerConfig / seeds.length);

                for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
                    const keyBuffer = keyBuffers[seedIdx];
                    const clientSeed = seeds[seedIdx].clientSeed;

                    for (let i = 0; i < nonceMax && totalCount < samplesPerConfig; i++) {
                        const slot = this.plinkoResultsGenerator.generatePlinkoResultSync(
                            keyBuffer,
                            clientSeed,
                            i,
                            rows,
                        );
                        slotCounts[slot]++;
                        totalCount++;
                    }
                }

                frequencies.set(configKey, slotCounts);
            }
        }

        return frequencies;
    }
}
