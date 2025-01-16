"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var cw=()=>{var tmp=require("../../aws-cloudwatch");return cw=()=>tmp,tmp},cluster_1=()=>{var tmp=require("./cluster");return cluster_1=()=>tmp,tmp},instance_1=()=>{var tmp=require("./instance");return instance_1=()=>tmp,tmp};cluster_1().DatabaseClusterBase.prototype.metric=function(metricName,props){return new(cw()).Metric({namespace:"AWS/RDS",metricName,dimensionsMap:{DBClusterIdentifier:this.clusterIdentifier},...props}).attachTo(this)},cluster_1().DatabaseClusterBase.prototype.metricCPUUtilization=function(props){return this.metric("CPUUtilization",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricDatabaseConnections=function(props){return this.metric("DatabaseConnections",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricDeadlocks=function(props){return this.metric("Deadlocks",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricEngineUptime=function(props){return this.metric("EngineUptime",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricFreeableMemory=function(props){return this.metric("FreeableMemory",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricFreeLocalStorage=function(props){return this.metric("FreeLocalStorage",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricNetworkReceiveThroughput=function(props){return this.metric("NetworkReceiveThroughput",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricNetworkThroughput=function(props){return this.metric("NetworkThroughput",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricNetworkTransmitThroughput=function(props){return this.metric("NetworkTransmitThroughput",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricSnapshotStorageUsed=function(props){return this.metric("SnapshotStorageUsed",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricTotalBackupStorageBilled=function(props){return this.metric("TotalBackupStorageBilled",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricVolumeBytesUsed=function(props){return this.metric("VolumeBytesUsed",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricVolumeReadIOPs=function(props){return this.metric("VolumeReadIOPs",{statistic:"Average",...props})},cluster_1().DatabaseClusterBase.prototype.metricVolumeWriteIOPs=function(props){return this.metric("VolumeWriteIOPs",{statistic:"Average",...props})},instance_1().DatabaseInstanceBase.prototype.metric=function(metricName,props){return new(cw()).Metric({namespace:"AWS/RDS",metricName,dimensionsMap:{DBInstanceIdentifier:this.instanceIdentifier},...props}).attachTo(this)},instance_1().DatabaseInstanceBase.prototype.metricCPUUtilization=function(props){return this.metric("CPUUtilization",{statistic:"Average",...props})},instance_1().DatabaseInstanceBase.prototype.metricDatabaseConnections=function(props){return this.metric("DatabaseConnections",{statistic:"Average",...props})},instance_1().DatabaseInstanceBase.prototype.metricFreeStorageSpace=function(props){return this.metric("FreeStorageSpace",{statistic:"Average",...props})},instance_1().DatabaseInstanceBase.prototype.metricFreeableMemory=function(props){return this.metric("FreeableMemory",{statistic:"Average",...props})},instance_1().DatabaseInstanceBase.prototype.metricWriteIOPS=function(props){return this.metric("WriteIOPS",{statistic:"Average",...props})},instance_1().DatabaseInstanceBase.prototype.metricReadIOPS=function(props){return this.metric("ReadIOPS",{statistic:"Average",...props})};
