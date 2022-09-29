import {
  Table,
  AttributeType,
  BillingMode,
  ITable,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

// Swn - just random name
export class SwnDatabase extends Construct {
  public readonly productTable: ITable;
  public readonly basketTable: ITable;
  public readonly orderTable: ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // product table
    this.productTable = this.createProductTable();
    // basket table
    this.basketTable = this.createBasketTable();
    // order table
    this.orderTable = this.createOrderTable();
  }

  private createProductTable(): ITable {
    // Product DynamoDb table creation
    // product: PK: id -- name -- description -- imageFile -- price -- category
    const productTable = new Table(this, 'product', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      tableName: 'product',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    return productTable;
  }

  private createBasketTable(): ITable {
    // Basket table
    // Basket PK-userName -- items (SET-MAP object)
    // item 1 - { quantity - color - price - productId - productName }
    // item 2 - { quantity - color - price - productId - productName }

    const basketTable = new Table(this, 'basket', {
      partitionKey: {
        name: 'userName',
        type: AttributeType.STRING,
      },
      tableName: 'basket',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    return basketTable;
  }

  private createOrderTable(): ITable {
    // Basket table
    // Basket PK-userName -- SK: orderData

    const orderTable = new Table(this, 'order', {
      partitionKey: {
        name: 'userName',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'orderDate',
        type: AttributeType.STRING,
      },
      tableName: 'order',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    return orderTable;
  }
}
