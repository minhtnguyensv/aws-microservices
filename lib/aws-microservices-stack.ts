import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SwnApiGate } from './apigateway';
import { SwnDatabase } from './database';
import { SwnEventBus } from './eventbus';
import { SwnMicroservices } from './microservice';

export class AwsMicroservicesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new SwnDatabase(this, 'Database');

    const microservices = new SwnMicroservices(this, 'Microservices', {
      productTable: database.productTable,
      basketTable: database.basketTable,
      orderTable: database.orderTable,
    });

    const apiGateway = new SwnApiGate(this, 'ApiGateway', {
      productMicroservice: microservices.productMicroservice,
      basketMicroservice: microservices.basketMicroservice,
      orderMicroservice: microservices.orderMicroservice,
    });

    const eventBus = new SwnEventBus(this, 'EventBus', {
      publisherFunction: microservices.basketMicroservice,
      targetFunction: microservices.orderMicroservice,
    });
  }
}
