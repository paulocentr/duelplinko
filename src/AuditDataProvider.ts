import {SeedsData} from "./SeedsData";

export abstract class AuditDataProvider {

    protected constructor(private readonly gameAuditData: any) {
    }

    public getRawBetsData(): any {
        return this.gameAuditData.bets;
    }

    public getSeeds(): Array<SeedsData> {
        const seedsData: Array<SeedsData> = [];
        const seeds = this.gameAuditData.seeds;
        for (let i = 0; i < seeds.length; i++) {
            seedsData.push(new SeedsData(seeds[i].seed.serverSeedHashed, seeds[i].seed.serverSeed, seeds[i].seed.clientSeed));
        }
        return seedsData;
    }

    protected findSeedFromSeedHash(seeds: Array<any>, hashedServerSeed: string): string {
        if (this.CACHED_SEEDS[hashedServerSeed]) {
            return this.CACHED_SEEDS[hashedServerSeed];
        }

        for (const seed of seeds) {
            if (seed?.seed?.serverSeedHashed === hashedServerSeed) {
                this.CACHED_SEEDS[hashedServerSeed] = seed.seed.serverSeed;
                return this.CACHED_SEEDS[hashedServerSeed];
            }
        }

        return "";
    }

    protected readonly CACHED_SEEDS: any = {};
}
