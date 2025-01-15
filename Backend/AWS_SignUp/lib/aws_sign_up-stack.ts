import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class AwsSignUpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda Function
    const signupLambda = new lambda.Function(this, 'SignupLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'signup-handler.handler',  // This should match the file and function name (signup-handler.ts -> handler function)
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')), // Path to the lambda folder
      environment: {
        RDS_ENDPOINT: 'your-rds-endpoint',
        RDS_USERNAME: 'your-username',
        RDS_PASSWORD: 'your-password',
        RDS_DATABASE_NAME: 'your-database-name',
      },
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

