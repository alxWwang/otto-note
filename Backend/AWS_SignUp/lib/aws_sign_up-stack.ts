import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class AwsSignUpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Layers (dependecies needed in the lambda functions)
    const lambdaLayer = new lambda.LayerVersion(this, 'MysqlLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/layers/signup-layer")), // Use the mysql-layer folder
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X], 
      description: 'A custom Lambda layer for mysql2 dependency',
    });

    // Lambda Function (Sign up)
    const signupLambda = new lambda.Function(this, 'SignupLambda', {
      runtime: lambda.Runtime.NODEJS_22_X, 
      handler: 'handler.handler',  
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist')), 
      environment: {
        RDS_ENDPOINT: process.env.ENDPOINT || '',
        RDS_USERNAME: 'admin',
        RDS_PASSWORD: process.env.PASSWORD || '',
        RDS_DATABASE_NAME: 'otto',
      },
      layers: [lambdaLayer], // Attach the Lambda layer here
    });


    // Lambda Function (Log in)
    const loginLambda = new lambda.Function(this, 'LoginLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'login.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/Login')),
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

    //Post Request for Sign Up
    const signup = api.root.addResource('signup');
    signup.addMethod('POST', new apigateway.LambdaIntegration(signupLambda)); // Integrate Lambda with API Gateway

    //Get Request for Log in
    const login = api.root.addResource('login');
    login.addMethod('GET', new apigateway.LambdaIntegration(loginLambda));


  }
}

