import {RTPConvergenceSimulationDetails} from "./RTPConvergenceSimulationDetails";

export class RelevantStatistics {
    constructor(public count: number,
                public rtp: number,
                public standardErrorOfRTP: number,
                public standardDeviation: number,
                public rtpConvergence: Map<number, number>,
                public rtpConvergenceSD: Map<number, number>,
                public rtpConvergenceSimulationDetails: RTPConvergenceSimulationDetails,
                public chartTitle: string = "",
                public chartFileName: string = "",
    ) {
    }
}
