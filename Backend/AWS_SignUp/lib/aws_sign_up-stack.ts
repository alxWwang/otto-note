import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class AwsSignUpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Layers (dependencies needed in the Lambda function)
    const lambdaLayer = new lambda.LayerVersion(this, 'MysqlLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/layers/signup-layer")), 
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X], 
      description: 'A custom Lambda layer for mysql2 dependency',
    });


    const ottoLambda = new lambda.Function(this, 'OttoLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',  
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist')),
      environment: {
        RDS_ENDPOINT: process.env.ENDPOINT || '',
        RDS_USERNAME: 'admin',
        RDS_PASSWORD: process.env.PASSWORD || '',
        RDS_DATABASE_NAME: 'otto',
      },
      layers: [lambdaLayer], 
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'OttoAPI', {
      restApiName: 'OttoNote API',
      description: 'API for App: OttoNote',
    });

    // Route for Signup
    const signup = api.root.addResource('signup');
    signup.addMethod('POST', new apigateway.LambdaIntegration(ottoLambda));

    // Route for Login
    const login = api.root.addResource('login');
    login.addMethod('GET', new apigateway.LambdaIntegration(ottoLambda));
  }
}

