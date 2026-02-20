import {execSync} from "node:child_process";
import * as fs from "fs";
import * as path from "path";

export class RTPConvergenceSimulationDetails {

    public async saveToJSON(filePath: string, fileName: string): Promise<void> {
        if(!this.seeds || this.seeds.length === 0) {
            throw new Error("No seeds were set");
        }

        const fullFilePath = filePath + path.sep + fileName + ".json";
        fs.mkdirSync(filePath, {recursive: true});
        fs.writeFileSync(
            fullFilePath,
            JSON.stringify(this, null, 2),
            "utf-8",
        );
    }

    public constructor(
        public simulationDescription: string = "",
        public totalRounds: number = 0,
        public simulatedRTP: number = 0,
        public theoreticalRTP: number = 0,
        public simulatedTheoreticalRTPDifference: number = 0,
        public winCounts: number = 0,
        public lossCounts: number = 0,
        public winLossRatio: number = 0,
        public simulationRunTimeInMs: number = 0,
        public lastCommitHash: string = "",
        public seeds: Array<any> = [],
        public rtpConvergence: Array<any> = [],
        public rtpConvergenceSD: Array<any> = [],
    ) {
        this.setLastCommitHash();
    }

    public setSimulationDescription(simulationDescription: string) {
        this.simulationDescription = simulationDescription;
    }

    public setSeeds(seeds: Array<any>) {
        this.seeds = seeds;
    }

    public setTotalRounds(totalRounds: number) {
        this.totalRounds = totalRounds;
        this.countWinLossRatio();
        this.setLossCounts();
    }

    public setSimulatedRTP(rtp: number) {
        this.simulatedRTP = rtp;
        this.countSimulatedTheoreticalRTPDifference();
    }

    public setTheoreticalRTP(rtp: number) {
        this.theoreticalRTP = rtp;
        this.countSimulatedTheoreticalRTPDifference();
    }

    public setWinCounts(winCounts: number) {
        this.winCounts = winCounts;
        this.countWinLossRatio();
        this.setLossCounts();
    }

    public setSimulationRunTime(simulationRunTimeInMs: number) {
        this.simulationRunTimeInMs = simulationRunTimeInMs;
    }

    public setConvergenceData(rtpConvergence: Map<number, number>, rtpConvergenceSD: Map<number, number>) {
        this.rtpConvergence = [...rtpConvergence];
        this.rtpConvergenceSD = [...rtpConvergenceSD];
    }

    private countSimulatedTheoreticalRTPDifference() {
        this.simulatedTheoreticalRTPDifference = Math.abs(this.theoreticalRTP - this.simulatedRTP);
    }

    private setLossCounts() {
        this.lossCounts = this.totalRounds - this.winCounts;
    }

    private countWinLossRatio() {
        this.winLossRatio = this.winCounts / this.totalRounds;
    }

    private setLastCommitHash() {
        try {
            this.lastCommitHash = execSync('git rev-parse HEAD').toString().trim();
        } catch {
            // Not in a git repo – non-fatal, leave lastCommitHash empty
        }
    }
}
