"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.SQSMetrics=void 0;class SQSMetrics{static numberOfMessagesSentAverage(dimensions){return{namespace:"AWS/SQS",metricName:"NumberOfMessagesSent",dimensionsMap:dimensions,statistic:"Average"}}static approximateNumberOfMessagesDelayedAverage(dimensions){return{namespace:"AWS/SQS",metricName:"ApproximateNumberOfMessagesDelayed",dimensionsMap:dimensions,statistic:"Average"}}static numberOfMessagesReceivedAverage(dimensions){return{namespace:"AWS/SQS",metricName:"NumberOfMessagesReceived",dimensionsMap:dimensions,statistic:"Average"}}static numberOfMessagesDeletedAverage(dimensions){return{namespace:"AWS/SQS",metricName:"NumberOfMessagesDeleted",dimensionsMap:dimensions,statistic:"Average"}}static approximateNumberOfMessagesNotVisibleAverage(dimensions){return{namespace:"AWS/SQS",metricName:"ApproximateNumberOfMessagesNotVisible",dimensionsMap:dimensions,statistic:"Average"}}static approximateNumberOfMessagesVisibleAverage(dimensions){return{namespace:"AWS/SQS",metricName:"ApproximateNumberOfMessagesVisible",dimensionsMap:dimensions,statistic:"Average"}}static approximateAgeOfOldestMessageAverage(dimensions){return{namespace:"AWS/SQS",metricName:"ApproximateAgeOfOldestMessage",dimensionsMap:dimensions,statistic:"Average"}}static numberOfEmptyReceivesAverage(dimensions){return{namespace:"AWS/SQS",metricName:"NumberOfEmptyReceives",dimensionsMap:dimensions,statistic:"Average"}}static sentMessageSizeAverage(dimensions){return{namespace:"AWS/SQS",metricName:"SentMessageSize",dimensionsMap:dimensions,statistic:"Average"}}}exports.SQSMetrics=SQSMetrics;
