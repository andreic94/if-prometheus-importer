export type GlobalConfig = Record<string, any>;

export type PrometheusOutputs = {
    timestamps: string[];
    cpuUtilizations: string[];
    memAvailable: string[];
};