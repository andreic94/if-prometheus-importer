import { PrometheusDriver } from 'prometheus-query';
import { GetMetricsParams, PrometheusInputs, PrometheusOutputs } from './types';
import { z } from 'zod';
import { allDefined, validate } from '../../util/validations';
import { buildErrorMessage } from '../../util/helpers';
import { ERRORS } from '../../util/errors';
import { ConfigParams, PluginParams } from '../../types/common';
import { PluginInterface } from '../../interfaces';
const { ConfigValidationError } =
  ERRORS;


export const PrometheusImporter = (): PluginInterface => {

  const prom = new PrometheusDriver({
    endpoint: "https://prometheus.demo.do.prometheus.io",
    baseURL: "/api/v1"
  });
  const metadata = { kind: 'execute' };
  const errorBuilder = buildErrorMessage(PrometheusImporter.name);


  const execute = async (inputs: PluginParams[], config?: ConfigParams): Promise<PluginParams[]> => {
    const validatedConfig = validateConfig(config);
    let enrichedOutputsArray: PluginParams[] = [];


    for await (const input of inputs) {
      const mergedWithConfig = Object.assign(
        {},
        validateInput(input),
        validatedConfig
      );

      const prometheusInput = mapInputToPrometheusInputs(mergedWithConfig);

      const rawResults = await getMetrics(prometheusInput);

      enrichedOutputsArray = enrichOutputs(
        rawResults,
        mergedWithConfig
      );


    }


    return enrichedOutputsArray.flat();
  };

  const getMetrics = async (metricParams: PrometheusInputs): Promise<PrometheusOutputs> => {
    const timestamps: string[] = [];
    const cpuUtils: string[] = [];
    const memAvailable: string[] = [];
    const memUsed: string[] = [];
    const memoryUtilization: string[] = [];

    // Helper function to parse metric data and populate metricArray and timestamps.
    const parseMetrics = async (
      // timeSeriesData: Promise<any[]>,
      timeSeriesData: any[],
      metricArray: string[],
      metricName: string
    ) => {
      const series = timeSeriesData;
      series.forEach((serie) => {
        serie.values.forEach((value: any) => {
          metricArray.push(value.value);
          
          if (metricName === 'cpuUtilizations') {
            timestamps.push(value.time);

          }
        });

      });
    }

    const cpuUtilizationQuery = '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[' + metricParams.window + '])) * 100)';
    const memoryAvailableQuery = 'node_memory_MemTotal_bytes';
    const memoryUsedQuery = 'node_memory_MemTotal_bytes - node_memory_MemFree_bytes'; 

    parseMetrics((await getAllMetrics(metricParams, cpuUtilizationQuery)), cpuUtils, 'cpuUtilizations');
    parseMetrics((await getAllMetrics(metricParams, memoryAvailableQuery)), memAvailable, '');
    parseMetrics((await getAllMetrics(metricParams, memoryUsedQuery)), memUsed, '');

    for (let i = 0; i < memUsed.length; i++) {
      const used = parseFloat(memUsed[i]);
      const available = parseFloat(memAvailable[i]);
      const utilization = (used / available) * 100;
      memoryUtilization.push(utilization.toString());
    }


    return { timestamps, cpuUtilizations: cpuUtils, memAvailable, memUsed, memoryUtilization };
  }


  const getAllMetrics = async (metricParams: GetMetricsParams, q: string) => {

    const start = new Date(metricParams.timestamp);
    const end = new Date(start.getTime() + Number(metricParams.duration) * 1000);

    return (await prom.rangeQuery(q, start, end, 300)).result;
  };


  // const getCPUMetrics = async (metricParams: GetMetricsParams) => {

  //   const start = new Date(metricParams.timestamp);
  //   const end = new Date(start.getTime() + Number(metricParams.duration) * 1000);

  //   const q = '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[' + metricParams.window + '])) * 100)';

  //   return (await prom.rangeQuery(q, start, end, 300)).result;
  // };

  // const getMemoryMetrics = async (metricParams: GetMetricsParams) => {

  //   const start = new Date(metricParams.timestamp);
  //   const end = new Date(start.getTime() + Number(metricParams.duration) * 1000);

  //   const q = 'node_memory_MemAvailable_bytes';

  //   return (await prom.rangeQuery(q, start, end, 300)).result;
  // };

  const enrichOutputs = (
    rawResults: PrometheusOutputs,
    input: PluginParams
  ) => {
    return rawResults.timestamps.map((timestamp, index) => ({
      timestamp,
      ...input,
      'cpu/utilization': rawResults.cpuUtilizations[index],
      'memory/available/B': rawResults.memAvailable[index],
      'memory/used/B': rawResults.memUsed[index],
      'memory/utilization': rawResults.memoryUtilization[index],
    }));
  };

  const mapInputToPrometheusInputs = (input: PluginParams): PrometheusInputs => {
    return {
      timestamp: input['timestamp']!,
      duration: input['duration'].toString(),
      promURL: input['prometheus-url'],
      window: input['prometheus-observation-window'],
      customQuery: input['customQuery']
    };
  };

  const validateInput = (input: PluginParams) => {
    const schema = z
      .object({
        timestamp: z.string().datetime(),
        duration: z.number(),
      })
      .refine(allDefined);

    return validate<z.infer<typeof schema>>(schema, input);
  };
  const validateConfig = (config?: ConfigParams) => {
    if (!config) {
      throw new ConfigValidationError(
        errorBuilder({ message: 'Config must be provided.' })
      );
    }

    const schema = z
      .object({
        'prometheus-url': z.string(),
        'prometheus-observation-window': z.string(),
      })
      .refine(allDefined, {
        message: 'All parameters should be present.',
      });

    return validate<z.infer<typeof schema>>(schema, config);
  };


  return {
    metadata,
    execute,
  };

};
