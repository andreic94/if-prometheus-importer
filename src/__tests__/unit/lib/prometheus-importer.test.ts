import { PrometheusImporter } from "../../../lib";

describe('PrometheusImporter', () => {
  describe('execute', () => {
    it('should fetch metrics and enrich outputs if customQuery is defined correctly', async () => {
      const inputs = [
      { 
        timestamp: '2024-04-05T09:00:31.820Z', 
        duration: 0,
        customQuery: 'machine_cpu_cores'
      }
    ];
      const config = {
        'prometheus-url': 'https://prometheus.demo.do.prometheus.io', 
        'prometheus-observation-window': '5m' 
      };

      const plugin = PrometheusImporter();
      const result = await plugin.execute(inputs, config);

      expect(result).toStrictEqual([
        {
          timestamp: "2024-04-05T09:00:31.820Z",
          duration: 0,
          customQuery: "machine_cpu_cores",
          "prometheus-url": "https://prometheus.demo.do.prometheus.io",
          "prometheus-observation-window": "5m",
          "cpu/utilization": 42.60000000397365,
          "memory/available/GB": "0.9351959228515625",
          "memory/used/GB": "0.7821769714355469",
          "memory/utilization": "83.6377653412521",
          "custom/customQueryResult": 1
        }
      ]);
    });

    it('should fetch metrics and enrich outputs if customQuery is defined as an empty string', async () => {
      const inputs = [
      { 
        timestamp: '2024-04-05T09:00:31.820Z', 
        duration: 0,
        customQuery: ''
      }
    ];
      const config = {
        'prometheus-url': 'https://prometheus.demo.do.prometheus.io', 
        'prometheus-observation-window': '5m' 
      };

      const plugin = PrometheusImporter();
      const result = await plugin.execute(inputs, config);

      expect(result).toStrictEqual([
        {
          timestamp: "2024-04-05T09:00:31.820Z",
          duration: 0,
          customQuery: "",
          "prometheus-url": "https://prometheus.demo.do.prometheus.io",
          "custom/customQueryResult": undefined,
          "prometheus-observation-window": "5m",
          "cpu/utilization": 42.60000000397365,
          "memory/available/GB": "0.9351959228515625",
          "memory/used/GB": "0.7821769714355469",
          "memory/utilization": "83.6377653412521",
        }
      ]);
    });

    it('should fetch metrics and enrich outputs if customQuery is defined but is an invalid query', async () => {
      const inputs = [
      { 
        timestamp: '2024-04-05T09:00:31.820Z', 
        duration: 0,
        customQuery: 'invalidQuery'
      }
    ];
      const config = {
        'prometheus-url': 'https://prometheus.demo.do.prometheus.io', 
        'prometheus-observation-window': '5m' 
      };

      const plugin = PrometheusImporter();
      const result = await plugin.execute(inputs, config);

      expect(result).toStrictEqual([
        {
          timestamp: "2024-04-05T09:00:31.820Z",
          duration: 0,
          customQuery: "invalidQuery",
          "prometheus-url": "https://prometheus.demo.do.prometheus.io",
          "custom/customQueryResult": undefined,
          "prometheus-observation-window": "5m",
          "cpu/utilization": 42.60000000397365,
          "memory/available/GB": "0.9351959228515625",
          "memory/used/GB": "0.7821769714355469",
          "memory/utilization": "83.6377653412521",
        }
      ]);
    });

    it('should throw error if config is not provided', async () => {
      const inputs = [{ timestamp: '2024-04-05T12:00:00', duration: 300 }];

      const plugin = PrometheusImporter();

      await expect(plugin.execute(inputs)).rejects.toThrow();
    });
  });
});