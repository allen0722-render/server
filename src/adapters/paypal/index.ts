import { PaymentPayload } from "@/dispatcher";

const paypal = require('@paypal/checkout-server-sdk');

export interface IPaypalAdapter{
    createOrder({
        totalPrice,
        details,
    }: Omit<PaymentPayload, "desc" | "returnURL">): Promise<string>;
}

export class PaypalAdapter implements IPaypalAdapter{
    private paypalClient: any;

    constructor(){
        const Environment = process.env.NODE_ENV === 'production'
        ? paypal.core.LiveEnvironment
        : paypal.core.SandboxEnvironment;

        this.paypalClient = new paypal.core.PayPalHttpClient(new Environment(
            process.env.PAYPAL_CLIENT_ID,
            process.env.PAYPAL_CLIENT_SECRET
        ));
    }

    public createOrder: IPaypalAdapter["createOrder"] = async ({
        billId,
        totalPrice,
        details,
    }) => {
        const request = new paypal.orders.OrdersCreateRequest();
        
        request.prefer("return=representation");

        request.requestBody({
            intent: "CAPTURE",
            purchase_units: [
                {
                    custom_id: billId,
                    amount:{
                        currency_code: "USD",
                        value: totalPrice,
                        breakdown: {
                            item_total:{
                                currency_code: "USD",
                                value: totalPrice,
                            },
                        },
                    },
                    items: details.map((item) => ({
                        name: item.name,
                        description: item.desc,
                        unit_amount: {
                            currency_code: "USD",
                            value: item.price,
                        },
                        quantity: item.amount,
                    })),
                },
            ],
        });

        let order;
        try{
            order = await this.paypalClient.execute(request);

            return order.result.id;
        } catch(err: any){
            console.error(err);
            throw new Error(err);
        }
    }; 
}