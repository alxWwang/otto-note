"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.validateProps=validateProps;var core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};function validateProps(props){validateRange("delivery delay",props.deliveryDelay&&props.deliveryDelay.toSeconds(),0,900,"seconds"),validateRange("maximum message size",props.maxMessageSizeBytes,1024,262144,"bytes"),validateRange("message retention period",props.retentionPeriod&&props.retentionPeriod.toSeconds(),60,1209600,"seconds"),validateRange("receive wait time",props.receiveMessageWaitTime&&props.receiveMessageWaitTime.toSeconds(),0,20,"seconds"),validateRange("visibility timeout",props.visibilityTimeout&&props.visibilityTimeout.toSeconds(),0,43200,"seconds"),validateRange("dead letter target maximum receive count",props.deadLetterQueue&&props.deadLetterQueue.maxReceiveCount,1,1/0)}function validateRange(label,value,minValue,maxValue,unit){if(value===void 0||core_1().Token.isUnresolved(value))return;const unitSuffix=unit?` ${unit}`:"";if(value<minValue)throw new Error(`${label} must be ${minValue}${unitSuffix} or more, but ${value} was provided`);if(value>maxValue)throw new Error(`${label} must be ${maxValue}${unitSuffix} or less, but ${value} was provided`)}
