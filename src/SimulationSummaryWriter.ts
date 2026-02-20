import * as fs from "fs";
import * as path from "path";
import {execSync} from "node:child_process";

export interface SimulationModeEntry {
    mode: string;
    simulatedRTP: number;
    sampleSize: number;
    stdError: number;
    theoreticalRTP: number;
}

export class SimulationSummaryWriter {

    public static generate(
        modes: Array<SimulationModeEntry>,
        game: string,
        outputPath: string,
        executionTimeMs: number,
        outputFileName: string = "simulation-summary",
    ): void {
        let commit = "";
        try {
            commit = execSync("git rev-parse HEAD").toString().trim();
        } catch {
            // not in a git repo
        }

        let totalRounds = 0;
        let weightedSimRTP = 0;
        let weightedTheoRTP = 0;

        for (const m of modes) {
            totalRounds += m.sampleSize;
            weightedSimRTP += m.simulatedRTP * m.sampleSize;
            weightedTheoRTP += m.theoreticalRTP * m.sampleSize;
        }

        const aggregateSimulatedRTP = totalRounds > 0 ? weightedSimRTP / totalRounds : 0;
        const aggregateTheoreticalRTP = totalRounds > 0 ? weightedTheoRTP / totalRounds : 0;
        const aggregateDeviation = aggregateSimulatedRTP - aggregateTheoreticalRTP;

        const summary = {
            meta: {
                game,
                commit,
                generatedAt: new Date().toISOString(),
                totalRounds,
                executionTimeMs,
                aggregateSimulatedRTP,
                aggregateTheoreticalRTP,
                aggregateDeviation,
            },
            modes: modes.map(m => ({
                mode: m.mode,
                simulatedRTP: m.simulatedRTP,
                sampleSize: m.sampleSize,
                stdError: m.stdError,
                theoreticalRTP: m.theoreticalRTP,
                deviation: m.simulatedRTP - m.theoreticalRTP,
            })),
        };

        fs.mkdirSync(outputPath, {recursive: true});
        fs.writeFileSync(
            path.join(outputPath, outputFileName + ".json"),
            JSON.stringify(summary, null, 2),
            "utf8",
        );
    }
}
