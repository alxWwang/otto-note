"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.ElasticBeanstalkMetrics=void 0;class ElasticBeanstalkMetrics{static environmentHealthAverage(dimensions){return{namespace:"AWS/ElasticBeanstalk",metricName:"EnvironmentHealth",dimensionsMap:dimensions,statistic:"Average"}}static applicationRequests5XxAverage(dimensions){return{namespace:"AWS/ElasticBeanstalk",metricName:"ApplicationRequests5xx",dimensionsMap:dimensions,statistic:"Average"}}static applicationRequests2XxAverage(dimensions){return{namespace:"AWS/ElasticBeanstalk",metricName:"ApplicationRequests2xx",dimensionsMap:dimensions,statistic:"Average"}}static applicationRequests3XxAverage(dimensions){return{namespace:"AWS/ElasticBeanstalk",metricName:"ApplicationRequests3xx",dimensionsMap:dimensions,statistic:"Average"}}static applicationRequests4XxAverage(dimensions){return{namespace:"AWS/ElasticBeanstalk",metricName:"ApplicationRequests4xx",dimensionsMap:dimensions,statistic:"Average"}}}exports.ElasticBeanstalkMetrics=ElasticBeanstalkMetrics;
