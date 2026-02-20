import {RelevantStatistics} from "./RelevantStatistics";
import {RTPConvergenceChart} from "./RTPConvergenceChart";

export class Utils {

    public static async generateAuditFiles(relevantStatistics: Array<RelevantStatistics>, destinationDirectory: string, theoreticalGameRTP: number, simulationDuration: number): Promise<void> {
        for(let i = 0; i < relevantStatistics.length; i++) {
            const stats: RelevantStatistics = relevantStatistics[i];
            let dir = destinationDirectory;
            if(i === (relevantStatistics.length - 1)) {
                dir += "/audit-results";
            } else {
                dir += "/audit-results/profile-dependent-convergence";
            }

            const totalTries = Array.from(stats.rtpConvergence.keys()).pop() as number;
            await RTPConvergenceChart.generate(stats.rtpConvergence, stats.rtpConvergenceSD, theoreticalGameRTP, totalTries / 10, dir, simulationDuration, stats.chartTitle, stats.chartFileName);

            stats.rtpConvergenceSimulationDetails.setTheoreticalRTP(theoreticalGameRTP);
            stats.rtpConvergenceSimulationDetails.setSimulationRunTime(simulationDuration);
            await stats.rtpConvergenceSimulationDetails.saveToJSON(dir + "/simulation-details/", stats.chartFileName);
        }
    }

    public static generateArrayOfConsecutiveNumbers(from: number, to: number) {
        const array = [];
        for (let i = from; i <= to; i++) {
            array.push(i);
        }
        return array;
    }

    public static generateArrayOfZeros(length: number): Array<number> {
        const array = [];
        for (let i = 0; i < length; i++) {
            array.push(0);
        }
        return array;
    }

    public static binomial(n: number, k: number): number {
        if (!Number.isInteger(n) || !Number.isInteger(k)) return NaN;
        if (k < 0 || k > n) return 0;

        k = Math.min(k, n - k);

        let result = 1;
        for (let i = 1; i <= k; i++) {
            result = (result * (n - k + i)) / i;
        }

        return result;
    }
}
