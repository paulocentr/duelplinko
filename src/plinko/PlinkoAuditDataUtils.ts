import gameAuditData from "../../dataScripts/plinko/duel-plinko-sim-1771364316980.json";

export class PlinkoAuditDataUtils {
    public static printMultipliersData(): void {
        const bets = gameAuditData.bets;
        const seen = new Set<string>();
        for (let i = 0; i < bets.length; i++) {
            const key = `${bets[i].response.risk_level}_${bets[i].response.rows}_${bets[i].response.final_slot}`;
            if (!seen.has(key)) {
                seen.add(key);
                console.log(
                    `${bets[i].response.risk_level}/${bets[i].response.rows}rows slot ${bets[i].response.final_slot}: ` +
                    `multiplier=${bets[i].response.payout_multiplier}`
                );
            }
        }
    }
}
