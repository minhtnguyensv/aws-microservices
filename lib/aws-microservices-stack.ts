import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SwnApiGate } from './apigateway';
import { SwnDatabase } from './database';
import { SwnMicroservices } from './microservice';

export class AwsMicroservicesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new SwnDatabase(this, 'Database');

    const microservices = new SwnMicroservices(this, 'Microservices', {
      productTable: database.productTable,
      basketTable: database.basketTable,
    });

    const apiGateway = new SwnApiGate(this, 'ApiGateway', {
      productMicroservice: microservices.productMicroservice,
      basketMicroservice: microservices.basketMicroservice,
    });
  }
}
