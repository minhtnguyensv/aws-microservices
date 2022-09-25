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

const getProduct = async (productId) => {
  console.log('getProduct');

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: productId }),
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));
    console.log(Item);
    return Item ? unmarshall(Item) : {};
  } catch (error) {
    console.error(error);

    throw error;
  }
};

const getAllProducts = async () => {
  console.log('geAlltProducts');

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };

    const { Items } = await ddbClient.send(new ScanCommand(params));
    console.log(Items);
    return Items ? Items.map((Item) => unmarshall(Item)) : {};
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const createProduct = async (event) => {
  console.log(`createProduct function. event: "${event}"`);

  try {
    const productRequest = JSON.parse(event.body);

    const productId = v4();
    productRequest.id = productId;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(productRequest || {}),
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log(createResult);
    return createResult;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deleteProduct = async (productId) => {
  console.log(`deleteProduct function. productId: "${productId}"`);

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: productId }),
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log('Success, item deleted', deleteResult);
    return deleteResult;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const updateProduct = async (event) => {
  console.log(`updateProduct function. event: "${event}"`);
  try {
    const requestBody = JSON.parse(event.body);
    const objKeys = Object.keys(requestBody);
    console.log(
      `updateProduct function. requestBody : "${requestBody}", objKeys: "${objKeys}"`,
    );

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: event.pathParameters.id }),
      UpdateExpression: `SET ${objKeys
        .map((_, index) => `#key${index} = :value${index}`)
        .join(', ')}`,
      ExpressionAttributeNames: objKeys.reduce(
        (acc, key, index) => ({
          ...acc,
          [`#key${index}`]: key,
        }),
        {},
      ),
      ExpressionAttributeValues: marshall(
        objKeys.reduce(
          (acc, key, index) => ({
            ...acc,
            [`:value${index}`]: requestBody[key],
          }),
          {},
        ),
      ),
    };

    const updateResult = await ddbClient.send(new UpdateItemCommand(params));
    console.log(updateResult);
    return updateResult;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getProductByCategory = async (event) => {
  console.log(`getProductByCategory function. event: "${event}"`);

  try {
    // product/123?category=Phone
    const productId = event.pathParameters.id;
    const category = event.pathParameters.queryStringParameters;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      KeyConditionExpression: 'id = :productId',
      FilterExpression: 'contains (category, :category)',
      ExpressionAttributeValues: {
        ':productId': { S: productId },
        ':category': { S: category },
      },
    };

    const { Itmes } = await ddbClient.send(new QueryCommand(params));

    console.log(Itmes);

    return Items ? Items.map((Item) => unmarshall(Item)) : {};
  } catch (err) {
    console.log(err);
    throw err;
  }
};
