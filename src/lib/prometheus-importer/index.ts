import {PrometheusDriver} from 'prometheus-query';
import {z} from 'zod';
import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types/common';
import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';
import {allDefined, validate} from '../../util/validations';
import {GetMetricsParams, PrometheusInputs, PrometheusOutputs} from './types';
const {ConfigValidationError} = ERRORS;

export const PrometheusImporter = (): PluginInterface => {
  const metadata = {kind: 'execute'};
  const errorBuilder = buildErrorMessage(PrometheusImporter.name);

  const execute = async (
    inputs: PluginParams[],
    config?: ConfigParams
  ): Promise<PluginParams[]> => {
    const validatedConfig = validateConfig(config);
    let enrichedOutputsArray: PluginParams[] = [];

    for await (const input of inputs) {
      const mergedWithConfig = Object.assign(
        {},
        validateInput(input),
        validatedConfig
      );

      const prometheusInput = mapInputToPrometheusInputs(mergedWithConfig);

      const prom = new PrometheusDriver({
        endpoint: prometheusInput['promURL'],
        baseURL: '/api/v1',
      });

      const rawResults = await getMetrics(prometheusInput, prom);

      enrichedOutputsArray = enrichOutputs(rawResults, mergedWithConfig);
    }

    return enrichedOutputsArray.flat();
  };

  const getMetrics = async (
    metricParams: PrometheusInputs,
    prom: PrometheusDriver
  ): Promise<PrometheusOutputs> => {
    const timestamps: string[] = [];
    const cpuUtils: string[] = [];
    const memAvailable: string[] = [];
    const memUsed: string[] = [];
    const memoryUtilization: string[] = [];
    const customQueryResult: string[] = [];

    const parseMetrics = async (
      timeSeriesData: any[],
      metricArray: string[],
      metricName: string
    ) => {
      const series = timeSeriesData;
      series.forEach(serie => {
        serie.values.forEach((value: any) => {
          metricArray.push(value.value);

          if (metricName === 'cpuUtilizations') {
            timestamps.push(value.time);
          }
        });
      });
    };

    const cpuUtilizationQuery =
      '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[' +
      metricParams.window +
      '])) * 100)';
    const memoryAvailableQuery = 'node_memory_MemTotal_bytes';
    const memoryUsedQuery =
      'node_memory_MemTotal_bytes - node_memory_MemFree_bytes';
    var customQuery = '';
    if (metricParams['customQuery'] != null) {
      customQuery = metricParams['customQuery'];
      parseMetrics(
        await getAllMetrics(prom, metricParams, customQuery),
        customQueryResult,
        ''
      );
    }
    

    parseMetrics(
      await getAllMetrics(prom, metricParams, cpuUtilizationQuery),
      cpuUtils,
      'cpuUtilizations'
    );
    parseMetrics(
      await getAllMetrics(prom, metricParams, memoryAvailableQuery),
      memAvailable,
      ''
    );
    parseMetrics(
      await getAllMetrics(prom, metricParams, memoryUsedQuery),
      memUsed,
      ''
    );
    

    for (let i = 0; i < memUsed.length; i++) {
      const usedGB = parseFloat(memUsed[i]) / (1024 * 1024 * 1024);
      const availableGB = parseFloat(memAvailable[i]) / (1024 * 1024 * 1024);
      const utilization = (usedGB / availableGB) * 100;
      memoryUtilization.push(utilization.toString());
      memAvailable[i] = availableGB.toString();
      memUsed[i] = usedGB.toString();
    }

    return {
      timestamps,
      cpuUtilizations: cpuUtils,
      memAvailable,
      memUsed,
      memoryUtilization,
      customQueryResult
    };
  };

  const getAllMetrics = async (
    prom: PrometheusDriver,
    metricParams: GetMetricsParams,
    q: string
  ) => {
    const start = new Date(metricParams.timestamp);
    const end = new Date(
      start.getTime() + Number(metricParams.duration) * 1000
    );

    return (await prom.rangeQuery(q, start, end, 300)).result;
  };

  const enrichOutputs = (
    rawResults: PrometheusOutputs,
    input: PluginParams
  ) => {
    return rawResults.timestamps.map((timestamp, index) => ({
      timestamp,
      ...input,
      'cpu/utilization': rawResults.cpuUtilizations[index],
      'memory/available/GB': rawResults.memAvailable[index],
      'memory/used/GB': rawResults.memUsed[index],
      'memory/utilization': rawResults.memoryUtilization[index],
      'custom/customQueryResult': rawResults.customQueryResult[index]
    }));
  };

  const mapInputToPrometheusInputs = (
    input: PluginParams
  ): PrometheusInputs => {
    return {
      timestamp: input['timestamp']!,
      duration: input['duration'].toString(),
      promURL: input['prometheus-url'],
      window: input['prometheus-observation-window'],
      customQuery: input['customQuery'],
    };
  };

  const validateInput = (input: PluginParams) => {
    const schema = z
      .object({
        timestamp: z.string().datetime(),
        duration: z.number(),
        customQuery: z.optional(z.string()),
      })
      .refine(allDefined);

    return validate<z.infer<typeof schema>>(schema, input);
  };
  const validateConfig = (config?: ConfigParams) => {
    if (!config) {
      throw new ConfigValidationError(
        errorBuilder({message: 'Config must be provided.'})
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
