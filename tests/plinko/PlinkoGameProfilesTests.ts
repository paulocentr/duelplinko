import {expect} from "chai";
import {PlinkoGameProfiles} from "../../src/plinko/PlinkoGameProfiles";

describe("Plinko Game Profiles", () => {

    it("Every API table has exactly (rows + 1) entries", () => {
        for (const risk of ["low", "medium", "high"] as const) {
            for (let rows = 8; rows <= 16; rows++) {
                const table = PlinkoGameProfiles.API_MULTIPLIERS[risk][rows];
                expect(table).to.be.an("array");
                expect(table.length).to.eql(rows + 1,
                    `${risk}/${rows}: expected ${rows + 1} slots, got ${table.length}`
                );
            }
        }
    });

    it("All API multipliers are positive finite numbers", () => {
        for (const risk of ["low", "medium", "high"] as const) {
            for (let rows = 8; rows <= 16; rows++) {
                const table = PlinkoGameProfiles.API_MULTIPLIERS[risk][rows];
                for (let slot = 0; slot <= rows; slot++) {
                    expect(Number.isFinite(table[slot])).to.eql(true,
                        `${risk}/${rows}/slot${slot}: not finite`
                    );
                    expect(table[slot]).to.be.greaterThan(0,
                        `${risk}/${rows}/slot${slot}: not positive`
                    );
                }
            }
        }
    });

    it("API tables are symmetric (plinko is symmetric around center)", () => {
        for (const risk of ["low", "medium", "high"] as const) {
            for (let rows = 8; rows <= 16; rows++) {
                const table = PlinkoGameProfiles.API_MULTIPLIERS[risk][rows];
                for (let slot = 0; slot <= rows; slot++) {
                    expect(table[slot]).to.eql(table[rows - slot],
                        `${risk}/${rows}: table[${slot}]=${table[slot]} ≠ table[${rows - slot}]=${table[rows - slot]}`
                    );
                }
            }
        }
    });

    it("Center slot has lowest multiplier in high risk (house-edge design)", () => {
        for (let rows = 8; rows <= 16; rows++) {
            const table = PlinkoGameProfiles.API_MULTIPLIERS.high[rows];
            const center = Math.floor(rows / 2);
            const centerVal = table[center];
            const edgeVal = table[0];
            expect(centerVal).to.be.below(edgeVal,
                `high/${rows}: center=${centerVal} should be < edge=${edgeVal}`
            );
        }
    });

    it("getMultiplier throws on invalid config", () => {
        expect(() => PlinkoGameProfiles.getMultiplier("low", 7, 0)).to.throw();
        expect(() => PlinkoGameProfiles.getMultiplier("low", 17, 0)).to.throw();
        expect(() => PlinkoGameProfiles.getMultiplier("low", 8, 9)).to.throw();
        expect(() => PlinkoGameProfiles.getMultiplier("low", 8, -1)).to.throw();
    });

    it("All 27 configurations are defined (3 risks × 9 row counts)", () => {
        let count = 0;
        for (const risk of ["low", "medium", "high"] as const) {
            for (let rows = 8; rows <= 16; rows++) {
                const table = PlinkoGameProfiles.API_MULTIPLIERS[risk][rows];
                expect(table).to.be.an("array");
                count++;
            }
        }
        expect(count).to.eql(27);
    });

    it("High risk has highest edge multipliers at position 0 for all row counts", () => {
        for (let rows = 8; rows <= 16; rows++) {
            const lowEdge = PlinkoGameProfiles.API_MULTIPLIERS.low[rows][0];
            const medEdge = PlinkoGameProfiles.API_MULTIPLIERS.medium[rows][0];
            const highEdge = PlinkoGameProfiles.API_MULTIPLIERS.high[rows][0];
            expect(highEdge).to.be.greaterThan(medEdge,
                `rows=${rows}: high edge ${highEdge} should > medium ${medEdge}`
            );
            expect(medEdge).to.be.greaterThan(lowEdge,
                `rows=${rows}: medium edge ${medEdge} should > low ${lowEdge}`
            );
        }
    });
});
