"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.Between=exports.BinaryCondition=exports.BeginsWith=exports.BaseKeyCondition=void 0;class BaseKeyCondition{and(cond){return new class extends BaseKeyCondition{constructor(left,right){super(),this.left=left,this.right=right}renderCondition(){return`${this.left.renderCondition()} AND ${this.right.renderCondition()}`}keyNames(){return concatAndDedup(this.left.keyNames(),this.right.keyNames())}args(){return concatAndDedup(this.left.args(),this.right.args())}}(this,cond)}renderExpressionNames(){return this.keyNames().map(keyName=>`"#${keyName}" : "${keyName}"`).join(", ")}renderExpressionValues(){return this.args().map(arg=>`":${arg}" : $util.dynamodb.toDynamoDBJson($ctx.args.${arg})`).join(", ")}}exports.BaseKeyCondition=BaseKeyCondition;class BeginsWith extends BaseKeyCondition{constructor(keyName,arg){super(),this.keyName=keyName,this.arg=arg}renderCondition(){return`begins_with(#${this.keyName}, :${this.arg})`}keyNames(){return[this.keyName]}args(){return[this.arg]}}exports.BeginsWith=BeginsWith;class BinaryCondition extends BaseKeyCondition{constructor(keyName,op,arg){super(),this.keyName=keyName,this.op=op,this.arg=arg}renderCondition(){return`#${this.keyName} ${this.op} :${this.arg}`}keyNames(){return[this.keyName]}args(){return[this.arg]}}exports.BinaryCondition=BinaryCondition;class Between extends BaseKeyCondition{constructor(keyName,arg1,arg2){super(),this.keyName=keyName,this.arg1=arg1,this.arg2=arg2}renderCondition(){return`#${this.keyName} BETWEEN :${this.arg1} AND :${this.arg2}`}keyNames(){return[this.keyName]}args(){return[this.arg1,this.arg2]}}exports.Between=Between;function concatAndDedup(left,right){return left.concat(right).filter((elem,index,self)=>index===self.indexOf(elem))}
