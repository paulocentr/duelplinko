import {expect} from "chai";
import {PlinkoResultsGenerator} from "../../src/plinko/PlinkoResultsGenerator";
import {PlinkoGameAuditDataProvider} from "../../src/plinko/PlinkoGameAuditDataProvider";
import {PlinkoGameData} from "../../src/plinko/PlinkoGameData";

describe("Plinko Results Generator Tests", () => {

    const generator = new PlinkoResultsGenerator();
    const gameAuditData: Array<PlinkoGameData> = (new PlinkoGameAuditDataProvider).getGameData();

    it("Generator produces correct slot for all captured bets", async () => {
        for (let i = 0; i < gameAuditData.length; i++) {
            const slot = await generator.generatePlinkoResult(
                gameAuditData[i].serverSeed,
                gameAuditData[i].clientSeed,
                gameAuditData[i].nonce,
                gameAuditData[i].rows,
            );
            expect(slot).to.eql(gameAuditData[i].bucketPosition,
                `Nonce ${gameAuditData[i].nonce} rows=${gameAuditData[i].rows} risk=${gameAuditData[i].risk}: ` +
                `expected slot ${gameAuditData[i].bucketPosition}, got ${slot}`
            );
        }
        expect(gameAuditData.length).to.be.greaterThan(0);
    });

    it("Known example: nonce=4, rows=16, high → slot 8", async () => {
        const slot = await generator.generatePlinkoResult(
            "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204",
            "PH_NW_777fLkqsHC",
            4,
            16,
        );
        expect(slot).to.eql(8);
    });

    it("Known example: nonce=5, rows=8, low → slot 6", async () => {
        const slot = await generator.generatePlinkoResult(
            "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204",
            "PH_NW_777fLkqsHC",
            5,
            8,
        );
        expect(slot).to.eql(6);
    });

    it("Known example: nonce=16, rows=16, high → slot 11", async () => {
        const slot = await generator.generatePlinkoResult(
            "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204",
            "PH_NW_777fLkqsHC",
            16,
            16,
        );
        expect(slot).to.eql(11);
    });

    it("Known example: nonce=26, rows=9, high → slot 7", async () => {
        const slot = await generator.generatePlinkoResult(
            "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204",
            "PH_NW_777fLkqsHC",
            26,
            9,
        );
        expect(slot).to.eql(7);
    });

    it("Known example: nonce=11, rows=16, medium → slot 11", async () => {
        const slot = await generator.generatePlinkoResult(
            "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204",
            "PH_NW_777fLkqsHC",
            11,
            16,
        );
        expect(slot).to.eql(11);
    });

    it("Result is deterministic – same inputs always produce same slot", async () => {
        const serverSeed = "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204";
        const clientSeed = "PH_NW_777fLkqsHC";
        const slot1 = await generator.generatePlinkoResult(serverSeed, clientSeed, 10, 12);
        const slot2 = await generator.generatePlinkoResult(serverSeed, clientSeed, 10, 12);
        expect(slot1).to.eql(slot2);
    });

    it("Different nonces produce different results", async () => {
        const serverSeed = "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204";
        const clientSeed = "PH_NW_777fLkqsHC";
        const slots = new Set<number>();
        for (let nonce = 4; nonce <= 29; nonce++) {
            const slot = await generator.generatePlinkoResult(serverSeed, clientSeed, nonce, 8);
            slots.add(slot);
        }
        // With 26 different nonces, we expect > 1 distinct slot value (extremely unlikely to be all same)
        expect(slots.size).to.be.greaterThan(1);
    });

    it("Slot is always in valid range [0, rows]", async () => {
        const serverSeed = "4351b2c37e32c3575ccbcd51214ff1ca6da8b460dc15f9bb7930e0c753795204";
        const clientSeed = "PH_NW_777fLkqsHC";
        for (const rows of [8, 9, 10, 11, 12, 13, 14, 15, 16]) {
            for (let nonce = 0; nonce < 10; nonce++) {
                const slot = await generator.generatePlinkoResult(serverSeed, clientSeed, nonce, rows);
                expect(slot).to.be.gte(0, `slot < 0 at rows=${rows} nonce=${nonce}`);
                expect(slot).to.be.lte(rows, `slot > rows at rows=${rows} nonce=${nonce}`);
            }
        }
    });
});
