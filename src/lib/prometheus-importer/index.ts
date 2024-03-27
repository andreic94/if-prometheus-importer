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

      const rawResults = await getCPUUtilization(prometheusInput);

      enrichedOutputsArray = enrichOutputs(
        rawResults,
        mergedWithConfig
      );

    }

    return enrichedOutputsArray.flat();
  };

  const getCPUUtilization = async (metricParams: PrometheusInputs): Promise<PrometheusOutputs> => {
    const timestamps: string[] = [];
    const cpuUtils: string[] = [];
    const memAvailable: string[] = [];


    // Helper function to parse metric data and populate metricArray and timestamps.
    const parseMetrics = async (
      timeSeriesData: Promise<any[]>,
      metricArray: string[],
      metricName: string
    ) => {
      for (const data of (await timeSeriesData) ?? []) {
        if (typeof data.average !== 'undefined') {
          metricArray.push(data.average.toString());
          if (metricName === 'cpuUtilizations') {
            timestamps.push(data.timeStamp.toISOString());
          }
        }
      }
    };

    parseMetrics(getCPUMetrics(metricParams), cpuUtils, 'cpuUtilizations');
    // parseMetrics(getRawMetrics(metricParams), memAvailable, '');

    return { timestamps, cpuUtilizations: cpuUtils, memAvailable };
  }

  const getCPUMetrics = async (metricParams: GetMetricsParams) => {

    const start = new Date(metricParams.timestamp);
    const end = new Date(start.getTime() + Number(metricParams.duration) * 1000);

    const q = '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[' + metricParams.window + '])) * 100)';

    return (await prom.rangeQuery(q, start, end, 300)).result;
  };

  const enrichOutputs = (
    rawResults: PrometheusOutputs,
    input: PluginParams
  ) => {
    return rawResults.timestamps.map((timestamp, index) => ({
      'cloud/vendor': 'prometheus',
      'cpu/utilization': rawResults.cpuUtilizations[index],
      ...input,
      timestamp,
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
