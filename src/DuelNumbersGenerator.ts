import crypto from "crypto";

export abstract class DuelNumbersGenerator {

    public getCachedResult<T extends (...args: any[]) => any>(
        fn: T,
        ...params: Parameters<T>
    ): ReturnType<T> {
        const cacheKey = JSON.stringify(params);
        if (!this.cache.has(cacheKey)) {
            this.cache.set(cacheKey, fn(...params));
        }

        return this.cache.get(cacheKey) as ReturnType<T>;
    }

    hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    bytesToHex(bytes: Uint8Array<ArrayBuffer>) {
        return Array.from(bytes)
            .map((b: number) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    hexToUtf8String(publicSeed: string): string {
        const bytes = this.hexToBytes(publicSeed);
        return new TextDecoder('utf-8').decode(bytes);
    }

    private readonly cache = new Map<string, any>();

    /**
     * Async HMAC-SHA256 using WebCrypto API.
     * Used for verification (correctness-critical path).
     */
    async generateHMAC_SHA256(keyHex: string, message: Uint8Array<ArrayBuffer>) {
        const keyBytes = this.hexToBytes(keyHex);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            {name: 'HMAC', hash: 'SHA-256'},
            false,
            ['sign'],
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
        return this.bytesToHex(new Uint8Array(signature));
    }

    /**
     * Sync HMAC-SHA256 using Node.js crypto.createHmac.
     * Used for simulation (performance-critical path).
     * Returns first 4 bytes as big-endian uint32.
     */
    generateHMAC_SHA256_sync_uint32(keyBuffer: Buffer, message: string): number {
        const hmac = crypto.createHmac('sha256', keyBuffer);
        hmac.update(message);
        const hash = hmac.digest();
        return hash.readUInt32BE(0);
    }
}
