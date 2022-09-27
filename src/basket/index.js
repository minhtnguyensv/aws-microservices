'use strict';
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { ddbClient } from './ddbClient';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 } from 'uuid';

exports.handler = async function (event) {
  // TODO - switch case event.httpMethod to perform CRUD operations with using ddbClient object
  try {
    let body;
    switch (event.httpMethod) {
      case 'GET':
        if (event.queryStringParameters !== null) {
          body = await getProductByCategory(event); // GET product/123?category=Phone
        } else if (event.pathParameters !== null) {
          body = await getProduct(event.pathParameters.id); // GET product/{id}
        } else {
          body = await getAllProducts(); // GET product
        }
        break;
      case 'POST':
        body = await createProduct(event);
        break;
      case 'DELETE':
        body = await deleteProduct(event.pathParameters.id); // DELETE product/{id}
        break;
      case 'PUT':
        body = await updateProduct(event); // PUT product/{id}
        break;
      default:
        throw new Error(`Unsupported route: ${event.httpMethod}`);
    }

    console.log(body);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully finished operation: "${event.httpMethod}"`,
        body: body,
      }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Failed to perform operation: "${event.httpMethod}"`,
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };
  }
};
