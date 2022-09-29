import {
  GetItemCommand,
  ScanCommand,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayEvent,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { ddbClient } from './ddbClient';
import { ebClient } from './eventBridgeClient';
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
const checkoutBaskset = async (event: any) => {
  // publish and event to eventbridge - this will subscribe by other microservice and start ordering process.

  const checkoutRequest = JSON.parse(event.body);
  if (checkoutRequest === null || !('userName' in checkoutRequest)) {
    throw new Error(
      `userName should exist in checkoutRequest: ${checkoutRequest}`,
    );
  }
  // 1- get exsiting basket with items
  const basket = await getBaskset(checkoutRequest.userName);
  // 2- create an event json object with basket items, calculate totalprice, prepare order create json data to send ordering ms
  const checkoutPayload = preppareOrderPayload(checkoutRequest, basket);
  // 3- publish an event to eventbridge - this will subscribe by order microservice and start ordering process.
  const publishedEvent = await publishCheckoutBasketEnvent(checkoutPayload);
  // 4- remove existing basket

  await deleteBaskset(checkoutRequest.userName);
};
const preppareOrderPayload = (checkoutRequest: any, basket: any) => {
  console.log('preppareOrderPayload');
  // prepare order payload -> calculate totalprice and combine checkoutRequest and basket items
  // aggregate and enrich request and basket data in order to create order payload
  try {
    if (checkoutRequest === null || basket.items === null) {
      throw new Error(`items should exist in basket: ${basket}`);
    }

    let totalPrice = 0;

    basket.items.array.forEach(
      (item: any) => (totalPrice = totalPrice + item.price),
    );

    checkoutRequest.totalPrice = totalPrice;
    // copies all properties from basket into checkoutRequest
    Object.assign(checkoutRequest, basket);

    console.log(
      `Success preppareOrderPayload, orderPayload: ${checkoutRequest}`,
    );
    return checkoutRequest;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const publishCheckoutBasketEnvent = async (checkoutPayload: any) => {
  console.log('publishCheckoutBasketEvent with payload :', checkoutPayload);

  try {
    const params: PutEventsCommandInput = {
      Entries: [
        {
          Source: process.env.EVENT_SOURCE,
          Detail: JSON.stringify(checkoutPayload),
          DetailType: process.env.EVENT_DETAILTYPE,
          Resources: [],
          EventBusName: process.env.EVENT_BUSNAME,
        },
      ],
    };

    const data = await ebClient.send(new PutEventsCommand(params));
    console.log('Success, event sent; requestID:', data);
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
