import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class AwsSignUpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaLayer = new lambda.LayerVersion(this, 'MysqlLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, "..src/layers/signup-layer")), // Use the mysql-layer folder
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X], // Compatible runtime
      description: 'A custom Lambda layer for mysql2 dependency',
    });

    // Lambda Function
    const signupLambda = new lambda.Function(this, 'SignupLambda', {
      runtime: lambda.Runtime.NODEJS_22_X, // Node version 22
      handler: 'handler.handler',  // This should match the file and function name (signup-handler.ts -> handler function)
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist')), // Path to the lambda folder
      environment: {
        RDS_ENDPOINT: process.env.ENDPOINT || '',
        RDS_USERNAME: 'admin',
        RDS_PASSWORD: process.env.PASSWORD || '',
        RDS_DATABASE_NAME: 'otto',
      },
      layers: [lambdaLayer], // Attach the Lambda layer here
    });



    // API Gateway
    const api = new apigateway.RestApi(this, 'UserSignupAPI', {
      restApiName: 'User Signup API',
      description: 'API for user signup and management',
    });

    const signup = api.root.addResource('signup');
    signup.addMethod('POST', new apigateway.LambdaIntegration(signupLambda)); // Integrate Lambda with API Gateway


  }
}

