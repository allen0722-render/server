import { ECPayAdapter } from "@/adapters/ecpay";
import { PaypalAdapter } from "@/adapters/paypal";
import { PaymentProvider, PaymentWay } from "@/model/order";
import dayjs from "dayjs"; 

interface OrderDetail {
    name: string;
    price: number;
    amount: number;
    desc: string;
}

export interface PaymentPayload {
    billId: string;
    totalPrice: number;
    desc: string;
    details: OrderDetail[];
    returnURL: string;
}

export const paymentDispatcher = async ({
    paymentProvider,
    paymentWay,
    payload,
}:{
    paymentProvider: PaymentProvider,
    paymentWay: PaymentWay,
    payload: PaymentPayload,
}) => {
    const ecpay = new ECPayAdapter();

    if(paymentProvider === PaymentProvider.ECPAY){
        if(paymentWay === PaymentWay.CVS){
            const html = ecpay.createCVS({
                cvsParams: {
                    MerchantTradeNo: payload.billId,
                    MerchantTradeDate: dayjs(new Date()).format("YYYY/MM/DD HH:mm:ss"),
                    TotalAmount: String(payload.totalPrice),
                    TradeDesc: payload.desc,
                    ItemName: payload.details.map(content => `${content.name} x ${content.price}`).join("#"),
                    ReturnURL: payload.returnURL,
                }
            });
            return html;
        }else throw new Error("No suitable payment way.");
    }else if(paymentProvider === PaymentProvider.PAYPAL){

        const paypal = new PaypalAdapter();
        const id = await paypal.createOrder({
            billId: payload.billId,
            totalPrice: payload.totalPrice,
            details: payload.details,
        });

        return id;
    }
}


