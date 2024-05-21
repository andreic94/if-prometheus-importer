import {PrometheusImporter} from '../../../lib';

describe('PrometheusImporter', () => {
  describe('execute', () => {
    it('should fetch metrics and enrich outputs if customQuery is defined correctly', async () => {
      const inputs = [
        {
          timestamp: '2024-05-21T08:00:31.820Z',
          duration: 0,
          customQuery: 'machine_cpu_cores',
        },
      ];
      const config = {
        'prometheus-url': 'https://prometheus.demo.do.prometheus.io',
        'prometheus-observation-window': '5m',
      };

      const plugin = PrometheusImporter();
      const result = await plugin.execute(inputs, config);

      expect(result).toStrictEqual([
        {
          timestamp: '2024-05-21T08:00:31.820Z',
          duration: 0,
          customQuery: 'machine_cpu_cores',
          'prometheus-url': 'https://prometheus.demo.do.prometheus.io',
          'prometheus-observation-window': '5m',
          'cpu/utilization': 26.99999999992238,
          'memory/available/GB': '0.9351272583007812',
          'memory/used/GB': '0.8576240539550781',
          'memory/utilization': '91.71201527302989',
          'custom/customQueryResult': 1,
        },
      ]);
    });

    it('should fetch metrics and enrich outputs if customQuery is defined as an empty string', async () => {
      const inputs = [
        {
          timestamp: '2024-05-21T08:00:31.820Z',
          duration: 0,
          customQuery: '',
        },
      ];
      const config = {
        'prometheus-url': 'https://prometheus.demo.do.prometheus.io',
        'prometheus-observation-window': '5m',
      };

      const plugin = PrometheusImporter();
      const result = await plugin.execute(inputs, config);

      expect(result).toStrictEqual([
        {
          timestamp: '2024-05-21T08:00:31.820Z',
          duration: 0,
          customQuery: '',
          'prometheus-url': 'https://prometheus.demo.do.prometheus.io',
          'custom/customQueryResult': undefined,
          'prometheus-observation-window': '5m',
          'cpu/utilization': 26.99999999992238,
          'memory/available/GB': '0.9351272583007812',
          'memory/used/GB': '0.8576240539550781',
          'memory/utilization': '91.71201527302989',
        },
      ]);
    });

    it('should fetch metrics and enrich outputs if customQuery is defined but is an invalid query', async () => {
      const inputs = [
        {
          timestamp: '2024-05-21T08:00:31.820Z',
          duration: 0,
          customQuery: 'invalidQuery',
        },
      ];
      const config = {
        'prometheus-url': 'https://prometheus.demo.do.prometheus.io',
        'prometheus-observation-window': '5m',
      };

      const plugin = PrometheusImporter();
      const result = await plugin.execute(inputs, config);

      expect(result).toStrictEqual([
        {
          timestamp: '2024-05-21T08:00:31.820Z',
          duration: 0,
          customQuery: 'invalidQuery',
          'prometheus-url': 'https://prometheus.demo.do.prometheus.io',
          'custom/customQueryResult': undefined,
          'prometheus-observation-window': '5m',
          'cpu/utilization': 26.99999999992238,
          'memory/available/GB': '0.9351272583007812',
          'memory/used/GB': '0.8576240539550781',
          'memory/utilization': '91.71201527302989',
        },
      ]);
    });

    it('should throw error if config is not provided', async () => {
      const inputs = [{timestamp: '2024-05-21T08:00:31.820Z', duration: 300}];

      const plugin = PrometheusImporter();

      await expect(plugin.execute(inputs)).rejects.toThrow();
    });
  });
});
