"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.AppStreamMetrics=void 0;class AppStreamMetrics{static capacityUtilizationAverage(dimensions){return{namespace:"AWS/AppStream",metricName:"CapacityUtilization",dimensionsMap:dimensions,statistic:"Average"}}static insufficientCapacityErrorSum(dimensions){return{namespace:"AWS/AppStream",metricName:"InsufficientCapacityError",dimensionsMap:dimensions,statistic:"Sum"}}static actualCapacityAverage(dimensions){return{namespace:"AWS/AppStream",metricName:"ActualCapacity",dimensionsMap:dimensions,statistic:"Average"}}static availableCapacityAverage(dimensions){return{namespace:"AWS/AppStream",metricName:"AvailableCapacity",dimensionsMap:dimensions,statistic:"Average"}}static desiredCapacityAverage(dimensions){return{namespace:"AWS/AppStream",metricName:"DesiredCapacity",dimensionsMap:dimensions,statistic:"Average"}}static inUseCapacityAverage(dimensions){return{namespace:"AWS/AppStream",metricName:"InUseCapacity",dimensionsMap:dimensions,statistic:"Average"}}static pendingCapacityAverage(dimensions){return{namespace:"AWS/AppStream",metricName:"PendingCapacity",dimensionsMap:dimensions,statistic:"Average"}}static runningCapacityAverage(dimensions){return{namespace:"AWS/AppStream",metricName:"RunningCapacity",dimensionsMap:dimensions,statistic:"Average"}}}exports.AppStreamMetrics=AppStreamMetrics;
