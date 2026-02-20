import * as fs from "fs";
import * as path from "path";
import {execSync} from "node:child_process";

export interface PayoutEntry {
    betId: string | number;
    betAmount: number;
    result: any;
    gameMode: string;
    livePayout: number;
    calculatedPayout: number;
}

export class PayoutLogWriter {

    public static generate(
        entries: Array<PayoutEntry>,
        datasetPath: string,
        game: string,
        outputPath: string,
        outputFileName: string = "payout-log",
    ): void {
        let commit = "";
        try {
            commit = execSync("git rev-parse HEAD").toString().trim();
        } catch {
            // not in a git repo
        }

        const TOLERANCE = 0.000001;
        let totalLivePayout = 0;
        let totalCalculatedPayout = 0;
        let matched = 0;
        let mismatched = 0;

        const results = entries.map(e => {
            totalLivePayout += e.livePayout;
            totalCalculatedPayout += e.calculatedPayout;
            const diff = Math.abs(e.livePayout - e.calculatedPayout);
            const isMatch = diff < TOLERANCE;
            if (isMatch) matched++;
            else mismatched++;

            return {
                betId: e.betId,
                betAmount: e.betAmount,
                result: e.result,
                gameMode: e.gameMode,
                livePayout: e.livePayout,
                calculatedPayout: e.calculatedPayout,
                match: isMatch,
            };
        });

        const log = {
            meta: {
                game,
                dataset: path.basename(datasetPath),
                commit,
                generatedAt: new Date().toISOString(),
                totalBets: entries.length,
                matched,
                mismatched,
                totalLivePayout,
                totalCalculatedPayout,
            },
            results,
        };

        fs.mkdirSync(outputPath, {recursive: true});
        fs.writeFileSync(
            path.join(outputPath, outputFileName + ".json"),
            JSON.stringify(log, null, 2),
            "utf8",
        );
    }
}
