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

    async generateHMAC_SHA256(keyHex: string, message: Uint8Array<ArrayBuffer>) {
        const keyBytes = this.hexToBytes(keyHex);

        // Import raw key for HMAC use
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            {name: 'HMAC', hash: 'SHA-256'},
            false,
            ['sign'],
        );

        // Generate HMAC signature
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
        return this.bytesToHex(new Uint8Array(signature)); // Return signature as hex
    }
}
