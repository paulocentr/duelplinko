import {expect} from "chai";
import {PlinkoWinCalculator} from "../../src/plinko/PlinkoWinCalculator";
import {PlinkoGameProfiles} from "../../src/plinko/PlinkoGameProfiles";

describe("Plinko Win Calculator Tests", () => {

    it("Returns betAmount * tableMultiplier for each risk/rows/slot combination", () => {
        const betAmount = Math.random() * 100 + 1;
        for (const risk of ["low", "medium", "high"] as const) {
            for (let rows = 8; rows <= 16; rows++) {
                for (let slot = 0; slot <= rows; slot++) {
                    const tableMultiplier = PlinkoGameProfiles.getMultiplier(risk, rows, slot);
                    const expected = betAmount * tableMultiplier;
                    const actual = PlinkoWinCalculator.calculateWinnings(betAmount, slot, rows, risk);
                    expect(actual).to.eql(expected);
                }
            }
        }
    });

    it("Returns 0 for bet amount 0", () => {
        expect(PlinkoWinCalculator.calculateWinnings(0, 4, 8, "low")).to.eql(0);
    });

    it("Throws on negative bet amount", () => {
        expect(() => PlinkoWinCalculator.calculateWinnings(-1, 4, 8, "low")).to.throw();
    });

    it("Throws on invalid rows (< 8)", () => {
        expect(() => PlinkoWinCalculator.calculateWinnings(1, 3, 7, "low")).to.throw();
    });

    it("Throws on invalid rows (> 16)", () => {
        expect(() => PlinkoWinCalculator.calculateWinnings(1, 8, 17, "low")).to.throw();
    });

    it("Throws on bucketPosition > rows", () => {
        expect(() => PlinkoWinCalculator.calculateWinnings(1, 9, 8, "low")).to.throw();
    });

    it("Throws on negative bucketPosition", () => {
        expect(() => PlinkoWinCalculator.calculateWinnings(1, -1, 8, "low")).to.throw();
    });

    it("High risk gives higher variance payouts than low risk for same rows", () => {
        const rows = 12;
        const lowMin = Math.min(...PlinkoGameProfiles.MULTIPLIERS.low[rows]);
        const lowMax = Math.max(...PlinkoGameProfiles.MULTIPLIERS.low[rows]);
        const highMin = Math.min(...PlinkoGameProfiles.MULTIPLIERS.high[rows]);
        const highMax = Math.max(...PlinkoGameProfiles.MULTIPLIERS.high[rows]);

        expect(highMax).to.be.greaterThan(lowMax);
        expect(highMin).to.be.below(lowMin);
    });
});
