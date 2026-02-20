import {DuelNumbersGenerator} from "../DuelNumbersGenerator";

/**
 * Generates Plinko bucket positions from seed inputs.
 *
 * Algorithm (source: duel.com/fairness/verify, Plinko):
 *   For each row 0..rows-1:
 *     message = "${clientSeed}:${nonce}:${cursor}"  (cursor = row index)
 *     hash    = HMAC-SHA256(serverSeed_bytes, message)
 *     value   = first 4 bytes of hash interpreted as big-endian uint32
 *     position += value % 2   (0 = left, 1 = right)
 *   Returns position ∈ [0, rows]
 *
 * No rejection sampling is required: 2^32 is evenly divisible by 2.
 */
export class PlinkoResultsGenerator extends DuelNumbersGenerator {

    async generatePlinkoResult(
        serverSeed: string,
        clientSeed: string,
        nonce: number,
        rows: number,
    ): Promise<number> {
        if (rows < 8 || rows > 16) {
            throw new Error(`rows must be 8–16, got ${rows}`);
        }

        let position = 0;

        for (let cursor = 0; cursor < rows; cursor++) {
            const message = new TextEncoder().encode(`${clientSeed}:${nonce}:${cursor}`);
            const bounceHash = await this.generateHMAC_SHA256(serverSeed, message);

            // Extract first 4 bytes as big-endian uint32
            const value = parseInt(bounceHash.slice(0, 8), 16);

            // 0 = left, 1 = right. No bias: 2^32 % 2 === 0
            position += value % 2;
        }

        return position;
    }
}
