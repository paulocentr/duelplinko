import {RelevantStatistics} from "./RelevantStatistics";
import {RTPConvergenceSimulationDetails} from "./RTPConvergenceSimulationDetails";

export class PayoutStatsTracker {
    private n = 0;
    private mean = 0;
    private m2 = 0;

    private totalBet = 0;
    private totalWin = 0;
    private winCounts = 0;

    private chartTitle: string = "RTP Convergence";
    private chartFileName: string = "RTP_Convergence";

    private rtpConvergenceSimulationDetails: RTPConvergenceSimulationDetails = new RTPConvergenceSimulationDetails();
    private rtpConvergenceData: Map<number, number> = new Map<number, number>();
    private rtpConvergenceStandardDeviationData: Map<number, number> = new Map<number, number>();
    private rtpConvergenceStandardErrorData: Map<number, number> = new Map<number, number>();

    private samplingStep: number = 10000;

    public setSamplingStep(samplingStep: number) {
        if (samplingStep <= 0) throw new Error(
            "samplingStep must be > 0"
        )

        this.samplingStep = samplingStep;
    }

    public record(bet: number, win: number): void {
        if (!Number.isFinite(bet) || bet <= 0) throw new Error("bet must be > 0");
        if (!Number.isFinite(win) || win < 0) throw new Error("win must be >= 0");

        this.totalBet += bet;
        this.totalWin += win;

        if (win > 0) {
            this.winCounts++;
        }

        const r = win / bet;

        this.n++;
        const delta = r - this.mean;
        this.mean += delta / this.n;
        const delta2 = r - this.mean;
        this.m2 += delta * delta2;
        if (this.n % this.samplingStep === 0) {
            this.rtpConvergenceData.set(this.n, this.rtp);
            this.rtpConvergenceStandardDeviationData.set(this.n, this.standardErrorOfRTP);
            this.rtpConvergenceStandardErrorData.set(this.n, this.standardErrorOfRTP);
        }
    }

    public setSeedsUsed() {

    }

    public setChartTitle(chartTitle: string): void {
        this.chartTitle = chartTitle;
    }

    public setChartFileName(chartFileName: string): void {
        this.chartFileName = chartFileName;
    }

    public setSeeds(seeds: Array<any>): void {
        this.rtpConvergenceSimulationDetails.seeds = seeds;
    }

    get count(): number {
        return this.n;
    }

    get meanReturn(): number {
        return this.mean;
    }

    get rtp(): number {
        return this.totalWin / this.totalBet;
    }

    get standardErrorOfRTP(): number {
        return this.standardDeviation / Math.sqrt(this.n);
    }

    get variance(): number {
        return this.n > 0 ? this.m2 / this.n : 0;
    }

    get sampleVariance(): number {
        return this.n > 1 ? this.m2 / (this.n - 1) : 0;
    }

    get standardDeviation(): number {
        return Math.sqrt(this.variance);
    }

    get rtpConvergence(): Map<number, number> {
        return this.rtpConvergenceData;
    }

    get rtpConvergenceSD(): Map<number, number> {
        return this.rtpConvergenceStandardDeviationData;
    }

    get rtpConvergenceSE(): Map<number, number> {
        return this.rtpConvergenceStandardErrorData;
    }

    public snapshotRelevant(): RelevantStatistics {
        this.rtpConvergenceSimulationDetails.setSimulationDescription(this.chartTitle);
        this.rtpConvergenceSimulationDetails.setTotalRounds(this.n);
        this.rtpConvergenceSimulationDetails.setSimulatedRTP(this.rtp);
        this.rtpConvergenceSimulationDetails.setWinCounts(this.winCounts);

        const rtpConvergenceSampled100k = new Map(
            [...this.rtpConvergence].filter(([x]) => x % 100000 === 0)
        );
        const rtpConvergenceSDSampled100k = new Map(
            [...this.rtpConvergenceSD].filter(([x]) => x % 100000 === 0)
        );

        this.rtpConvergenceSimulationDetails.setConvergenceData(rtpConvergenceSampled100k, rtpConvergenceSDSampled100k);

        return new RelevantStatistics(this.count,
            this.rtp,
            this.standardErrorOfRTP,
            this.standardDeviation,
            this.rtpConvergence,
            this.rtpConvergenceSD,
            this.rtpConvergenceSimulationDetails,
            this.chartTitle,
            this.chartFileName,
        );
    }

    public reset(): void {
        this.totalBet = 0;
        this.totalWin = 0;
        this.n = 0;
        this.mean = 0;
        this.m2 = 0;
    }
}
