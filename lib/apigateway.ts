import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface SwnApiGateProps {
  productMicroservice: IFunction;
  basketMicroservice: IFunction;
}

export class SwnApiGate extends Construct {
  constructor(scope: Construct, id: string, props: SwnApiGateProps) {
    super(scope, id);

    // product api
    this.createProductApi(props.productMicroservice);
    // basket api
    this.createBasketApi(props.basketMicroservice);
  }

  private createProductApi = (productMicroservice: IFunction) => {
    // product microservices api gateway
    const apigw = new LambdaRestApi(this, 'productApi', {
      restApiName: 'Product Service',
      handler: productMicroservice,
      proxy: false, // explicitly define the API model
    });

    const product = apigw.root.addResource('product');
    product.addMethod('GET'); // GET /product
    product.addMethod('POST'); // POST /product

    const singleProduct = product.addResource('{id}'); // product/{id}
    singleProduct.addMethod('GET'); // GET /product/{id}
    singleProduct.addMethod('PUT'); // PUT /product/{id}
    singleProduct.addMethod('DELETE'); // DELETE /product/{id}
  };

  private createBasketApi = (basketMicroservice: IFunction) => {
    // product microservices api gateway
    const apigw = new LambdaRestApi(this, 'basketApi', {
      restApiName: 'Basket Service',
      handler: basketMicroservice,
      proxy: false, // explicitly define the API model
    });

    // basket microservices api gateway
    // root name = basket

    const basket = apigw.root.addResource('basket');
    basket.addMethod('GET'); // GET /basket
    basket.addMethod('POST'); // POST /basket

    const singleBasket = basket.addResource('{userName}'); // basket/{userName}
    singleBasket.addMethod('GET'); // GET /basket/{userName}
    singleBasket.addMethod('DELETE'); // DELETE /basket/{userName}

    const basketCheckout = basket.addResource('checkout'); // basket/checkout
    basketCheckout.addMethod('POST'); // POST basket/checkout

    // expected reqeust payload ; { userName: swc }
  };
}
