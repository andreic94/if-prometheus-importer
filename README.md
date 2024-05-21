# Prometheus Importer

> [!NOTE] > `Prometheus Importer` is an unofficial, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

`prometheus-importer` facilitates the consumption and processing of metrics through [Impact Framework](https://if.greensoftware.foundation/?ref=websustainability.org), especially in a Kubernetes environment. 

## Overview
[Prometheus](https://prometheus.io/) is an open-source systems monitoring and alerting tookit originally built at [SoundCloud](https://soundcloud.com/) its inception in 2012 many companies and organizations have adopted Prometheus, and the project has a very active developer and [user comunity](https://prometheus.io/community/). It is now a standalone open source project and maintained independently of any company. 
To emphasize this, and to clarify the project's governance structure, Prometheus joined the [Cloud Native Computing Foundation](https://www.cncf.io/) in 2016 as the second hosted project, after [Kubernetes](https://kubernetes.io/).

## Implementation
The plugin uses the [`prometheus-query`](https://www.npmjs.com/package/prometheus-query), a Javascript client for the Prometheus query API. This module is a thin and minimal low-level HTTP client used to interact with the Prometheus's API.

### Parameters
Mandatory:
- `prometheus-observation-window` -> Specifies the time range for which Prometheus will observe and collect metrics data.
- `prometheus-url` -> Specifies the URL of the Prometheus server from which metrics data will be scraped. This parameter is used to define the endpoint that the system will connect to for collecting monitoring and performance data. 
- `timestamp`-> Specifies the start date and time from which the metrics will be collected. 
- `duration` -> This parameter defines the duration in which the system monitors and records performance metrics. allowing for the analysis and visualization of trends over the specified period.

Optional:
- `custom-query` -> This parameter allows users to define and execute tailored queries to extract and analyze precise performance and monitoring metrics based on their specific needs.

## Usage
### Prerequisites
To successfully run this plugin, it is essential to have a local instance of Prometheus installed and configured.
Use the link to the existing instance as input for the `prometheus-url` parameter.

Example
```typescript
prometheus-url: http://localhost:9090
```

Also, `npm` should be installed on your instance.

### Installation
1. Clone the repository locally
```bash
git clone git@github.com:andreic94/if-prometheus-importer.git
```

2. Navigate to the `if-prometheus-importer` directory
```bash
cd if-prometheus-directory
```

3. Run `npm install` to install the required packages for the plugin
```
npm install
```

4. Run `npm link` to link to the correct version of the plugin.
```
npm link
```

5. The plugin should be ready now for testing. After creating a `manifest.yaml` file, you can run `sudo ie --manifest manifest.yaml` to see the outputs of the `prometheus-importer` plugin.

### Unit tests
The unit test file can be accessed at the following link:
https://github.com/andreic94/if-prometheus-importer/blob/main/src/__tests__/unit/lib/prometheus-importer.test.ts

### Errors that the plugin can raise
The plugin can raise the following errors:
* `ConfigValidationError` with the message: "Config must be provided" if the configuration parameters are wrong.
* `InputValidationError` if the input parameters are wrong.

## Demo manifest file
Here is a demo manifest file for running the `prometheus-importer` plugin:
```yaml
name: plugin-demo-link
description: loads plugin
tags: null
initialize:
  plugins:
    prometheus-importer:
      method: PrometheusImporter
      path: "prometheus-importer"
      global-config: { }
tree:
  children:
    child:
      pipeline:
        - prometheus-importer
      config:
        prometheus-importer:
          prometheus-observation-window: 5m
          prometheus-url: https://prometheus.demo.do.prometheus.io
      inputs:
        - timestamp: '2024-05-21T08:00:31.820Z'
          duration: 0
          customQuery: 'machine_cpu_cores'
```

After running the manifest file with the `sudo ie --manifest manifest.yaml` command, the output should be:
```bash
{
  "name": "plugin-demo-link",
  "description": "loads plugin",
  "tags": null,
  "initialize": {
    "plugins": {
      "prometheus-importer": {
        "path": "prometheus-importer",
        "method": "PrometheusImporter",
        "global-config": {}
      }
    }
  },
  "if-version": "v0.3.1",
  "tree": {
    "children": {
      "child": {
        "pipeline": [
          "prometheus-importer"
        ],
        "config": {
          "prometheus-importer": {
            "prometheus-observation-window": "5m",
            "prometheus-url": "https://prometheus.demo.do.prometheus.io"
          }
        },
        "inputs": [
          {
            "timestamp": "2024-05-21T08:00:31.820Z",
            "duration": 0,
            "customQuery": "machine_cpu_cores"
          }
        ],
        "outputs": [
          {
            "timestamp": "2024-05-21T08:00:31.820Z",
            "duration": 0,
            "customQuery": "machine_cpu_cores",
            "prometheus-url": "https://prometheus.demo.do.prometheus.io",
            "prometheus-observation-window": "5m",
            "cpu/utilization": 26.99999999992238,
            "memory/available/GB": "0.9351272583007812",
            "memory/used/GB": "0.8576240539550781",
            "memory/utilization": "91.71201527302989",
            "custom/customQueryResult": 1
          }
        ]
      }
    }
  }
}
```
