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

    public async simulate(samplesPerConfig: number): Promise<Array<RelevantStatistics>> {
        const gameStatistics: Array<RelevantStatistics> = [];
        const seeds = this.plinkoGameAuditDataProvider.getSeeds();
        const totalPayoutStatsTracker = new PayoutStatsTracker();

        for (const risk of RISK_LEVELS) {
            for (const rows of ROW_COUNTS) {
                let configPayoutStatsTracker = new PayoutStatsTracker();
                const nonceMax = Math.ceil(samplesPerConfig / seeds.length);

                for (const seed of seeds) {
                    for (let i = 0; i < nonceMax && configPayoutStatsTracker.count < samplesPerConfig; i++) {
                        const betAmount = 1;

                        const slot = await this.plinkoResultsGenerator.getCachedResult(
                            this.plinkoResultsGenerator.generatePlinkoResult.bind(this.plinkoResultsGenerator),
                            seed.serverSeed,
                            seed.clientSeed,
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
}
