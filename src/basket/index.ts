import {
  GetItemCommand,
  ScanCommand,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayEvent,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { ddbClient } from './ddbClient';
// import { v4 } from 'uuid';

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  try {
    let body;
    switch (event.httpMethod) {
      case 'GET':
        if (event.pathParameters !== null) {
          body = await getBaskset(event.pathParameters.userName || '');
        } else {
          body = await getAllBasksets();
        }
        break;
      case 'POST':
        if (event.path === '/basket/checkout') {
          body = await checkoutBaskset(event);
        } else {
          body = await createBaskset(event);
        }
        break;
      case 'DELETE':
        body = await deleteBaskset(event?.pathParameters?.userName);
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
  } catch (error: any) {
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

// GET /basket/{userName}
const getBaskset: (userName: string) => void = async (userName = '') => {
  console.log('getBaskset');

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ userName: userName }),
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));
    console.log(Item);
    return Item ? unmarshall(Item) : {};
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// GET /basket
const getAllBasksets = async () => {
  console.log('getAllBasksets');

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
// POST /basket
const createBaskset = async (event: APIGatewayProxyEvent) => {
  console.log(`createBaskset function. event: "${event}"`);

  const body = event.body || '';

  try {
    const productRequest = JSON.parse(body);

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

// DELETE /basket/{userName}
const deleteBaskset = async (userName?: string) => {
  console.log(`deleteBaskset function. productId: "${userName}"`);

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ userName: userName }),
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log('Success, basket deleted', deleteResult);
    return deleteResult;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// POST basket/checkout
const checkoutBaskset = (event: APIGatewayProxyEvent) => {
  // publish and event to eventbridge - this will subscribe by other microservice and start ordering process.
};
