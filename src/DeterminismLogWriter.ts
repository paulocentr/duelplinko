import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import {execSync} from "node:child_process";

export interface DeterminismEntry {
    betId: string | number;
    serverSeedHashed: string;
    clientSeed: string;
    nonce: number;
    liveResult: any;
    recomputedResult: any;
}

export class DeterminismLogWriter {

    public static generate(
        entries: Array<DeterminismEntry>,
        datasetPath: string,
        game: string,
        outputPath: string,
        outputFileName: string = "determinism-log",
    ): void {
        const datasetContent = fs.readFileSync(datasetPath, "utf8");
        const datasetHash = crypto.createHash("sha256").update(datasetContent).digest("hex");

        let commit = "";
        try {
            commit = execSync("git rev-parse HEAD").toString().trim();
        } catch {
            // not in a git repo
        }

        const matched = entries.filter(e => e.liveResult === e.recomputedResult).length;
        const mismatched = entries.length - matched;

        const log = {
            meta: {
                game,
                dataset: path.basename(datasetPath),
                datasetHash,
                commit,
                generatedAt: new Date().toISOString(),
                totalBets: entries.length,
                matched,
                mismatched,
            },
            results: entries.map(e => ({
                betId: e.betId,
                serverSeedHashed: e.serverSeedHashed,
                clientSeed: e.clientSeed,
                nonce: e.nonce,
                liveResult: e.liveResult,
                recomputedResult: e.recomputedResult,
                match: e.liveResult === e.recomputedResult,
            })),
        };

        fs.mkdirSync(outputPath, {recursive: true});
        fs.writeFileSync(
            path.join(outputPath, outputFileName + ".json"),
            JSON.stringify(log, null, 2),
            "utf8",
        );
    }
}
