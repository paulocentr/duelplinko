import {RiskLevel} from "./PlinkoGameProfiles";

export class PlinkoGameData {

    constructor(
        public hashedServerSeed: string,
        public serverSeed: string,
        public clientSeed: string,
        public nonce: number,
        public rows: number,
        public risk: RiskLevel,
        public bucketPosition: number,
        public betAmount: number,
        public winAmount: number,
        public payoutMultiplier: number,
    ) {
    }
}
