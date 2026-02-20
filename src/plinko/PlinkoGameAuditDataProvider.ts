import {PlinkoGameData} from "./PlinkoGameData";
import {RiskLevel} from "./PlinkoGameProfiles";
import gameAuditData from "../../dataScripts/plinko/duel-plinko-sim-1771364316980.json";
import {AuditDataProvider} from "../AuditDataProvider";

export class PlinkoGameAuditDataProvider extends AuditDataProvider {
    constructor() {
        super(gameAuditData);
    }

    public getGameData(): Array<PlinkoGameData> {
        const gameData: Array<PlinkoGameData> = [];
        const seeds = gameAuditData.seeds;
        const bets = gameAuditData.bets;
        for (let i = 0; i < bets.length; i++) {
            const serverSeed = this.findSeedFromSeedHash(seeds, bets[i].response.server_seed_hashed);
            if (serverSeed) {
                gameData.push(new PlinkoGameData(
                        bets[i].response.server_seed_hashed,
                        serverSeed,
                        bets[i].response.client_seed,
                        bets[i].response.nonce,
                        bets[i].response.rows,
                        bets[i].response.risk_level as RiskLevel,
                        bets[i].response.final_slot,
                        parseFloat(bets[i].response.amount_currency),
                        parseFloat(bets[i].response.win_amount),
                        parseFloat(bets[i].response.payout_multiplier),
                    )
                );
            }
        }
        return gameData;
    }
}
