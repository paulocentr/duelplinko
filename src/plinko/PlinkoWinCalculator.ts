import {PlinkoGameProfiles, RiskLevel} from "./PlinkoGameProfiles";

export class PlinkoWinCalculator {

    public static calculateWinnings(
        betAmount: number,
        bucketPosition: number,
        rows: number,
        risk: RiskLevel,
    ): number {
        if (!Number.isFinite(betAmount) || betAmount < 0) {
            throw new Error("betAmount must be a finite number >= 0");
        }

        if (!Number.isInteger(rows) || rows < 8 || rows > 16) {
            throw new Error("rows must be an integer 8–16");
        }

        if (!Number.isInteger(bucketPosition) || bucketPosition < 0 || bucketPosition > rows) {
            throw new Error(`bucketPosition must be an integer 0–${rows}`);
        }

        const multiplier = PlinkoGameProfiles.getMultiplier(risk, rows, bucketPosition);
        return betAmount * multiplier;
    }
}
