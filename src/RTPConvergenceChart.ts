import * as fs from "fs";
import * as path from "path";
import {ChartJSNodeCanvas} from "chartjs-node-canvas";

export class RTPConvergenceChart {

    private static readonly RTP_STANDARD_ERROR_LOWER_BOUND_NAME = "RTP Standard Error Lower Bound";

    static async generate(rtp: Map<number, number>, rtpStandardError: Map<number, number>, theoreticalRTP: number, printChartFrom: number = 0, destinationPath: string = __dirname, simulationTimeInMs: number = 0, title: string = "RTP Convergence", fileName: string = "RTP_Convergence"): Promise<void> {
        const width = 900;
        const height = 500;

        const ADDITIONAL_PADDING = 0.0002;

        const chartJSNodeCanvas = new ChartJSNodeCanvas({
            width,
            height,
            backgroundColour: "white",
        });

        for (const [key, value] of rtp) {
            if (key < printChartFrom) {
                rtp.delete(key);
                rtpStandardError.delete(key);
            }
        }

        const finalRTPValue: number = [...rtp.values()].pop() as number;

        const rtpStandardErrorValues = Array.from(rtpStandardError.values());
        const upperStandardDeviationBound = Array.from(rtp.values()).map((element: number, index: number) => {
            return element + rtpStandardErrorValues[index];
        });

        const lowerStandardDeviationBound = Array.from(rtp.values()).map((element: number, index: number) => {
            return element - rtpStandardErrorValues[index];
        });

        let minY: number = Infinity;
        let maxY: number = 0;
        let minX: number = 0;
        let maxX: number = 0;

        for (const v of upperStandardDeviationBound) {
            if (v > maxY) {
                maxY = v;
            }
        }

        for (const v of lowerStandardDeviationBound) {
            if (v < minY) {
                minY = v;
            }
        }

        minY -= ADDITIONAL_PADDING;
        maxY += ADDITIONAL_PADDING;

        for (const v of rtp.keys()) {
            if (v < minX) {
                minX = v;
            }
            if (v > maxX) {
                maxX = v;
            }
        }

        const subtitleText = [];
        if (simulationTimeInMs > 0) {
            subtitleText.push("Simulation time: " + (simulationTimeInMs / 1000 / 60).toFixed(2) + " minutes");
        }
        subtitleText.push("Final RTP: " + (finalRTPValue * 100).toFixed(3) + "%");

        // Regular Chart.js config
        const configuration = {
            type: "line",
            data: {
                labels: Array.from(rtp.keys()),
                datasets: [
                    {
                        label: "RTP",
                        data: Array.from(rtp.values()),
                        pointRadius: 0,
                        borderColor: "#36a2eb",
                        backgroundColor: "rgb(54,162,235, 0.3)",
                    },
                    {
                        label: "RTP Standard Deviation",
                        data: upperStandardDeviationBound,
                        pointRadius: 0,
                        borderColor: "#ff6384",
                        backgroundColor: "rgb(255,99,132, 0.3)",
                    },
                    {
                        label: RTPConvergenceChart.RTP_STANDARD_ERROR_LOWER_BOUND_NAME,
                        data: lowerStandardDeviationBound,
                        pointRadius: 0,
                        borderColor: "#ff6384",
                        backgroundColor: "rgb(255,99,132, 0.3)",
                    },
                    {
                        label: "Theoretical RTP (" + theoreticalRTP * 100 + "%)",
                        data: [
                            {
                                x: minX,
                                y: theoreticalRTP,
                            },
                            {
                                x: maxX,
                                y: theoreticalRTP,
                            }
                        ],
                        pointRadius: 0,
                        borderColor: "#fd9b36",
                        backgroundColor: "rgb(253,155,54, 0.3)",
                    },
                ],
            },
            options: {
                plugins: {
                    title: {display: true, text: title},
                    subtitle: {
                        display: true,
                        text: subtitleText,
                    },
                    legend: {
                        labels: {
                            filter: (legendItem: any) => {
                                return legendItem.text !== RTPConvergenceChart.RTP_STANDARD_ERROR_LOWER_BOUND_NAME;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Simulated Rounds'
                        },
                        min: minX,
                        max: maxX,
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'RTP'
                        },
                        min: minY,
                        max: maxY,
                    },
                },
            },
        };

        const pngBuffer = await chartJSNodeCanvas.renderToBuffer(configuration as any, "image/png");
        fs.mkdirSync(destinationPath, {recursive: true});
        fs.writeFileSync(path.join(destinationPath, fileName + ".png"), pngBuffer);
    }
}
