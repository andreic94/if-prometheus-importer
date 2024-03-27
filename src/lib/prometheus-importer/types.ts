export type GlobalConfig = Record<string, any>;
 
export type PrometheusOutputs = {
  timestamps: string[];
  cpuUtilizations: string[];
  memAvailable: string[];
 
};
 
export type PrometheusInputs = {
  duration: string;
  timestamp: string;
  promURL: string;
  customQuery: string;
  window: string;
};

export type GetMetricsParams = {
  timestamp: string;
  duration: string;
  window: string;
};
