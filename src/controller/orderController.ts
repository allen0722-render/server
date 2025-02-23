import { IProductModel} from './../model/product';
import { IOrderModel, PaymentWay, PaymentProvider, OrderContent, OrderStatus } from './../model/order';
import { NextFunction, Request, Response } from "express"
import { Knex } from 'knex';
import { isEmpty, pick} from 'lodash';
import { body, ValidationChain, validationResult } from 'express-validator';
import { genUID, transactionHandler } from '@/utils';
import { paymentDispatcher } from '@/dispatcher';

interface CreateOrderRequestParams{
    paymentProvider: PaymentProvider;
    paymentWay: PaymentWay;
    contents: OrderContent[];
}

export interface IOrderController{
    createOrderValidator():ValidationChain[];
    createOrder(req: Request<any,any,CreateOrderRequestParams,any> , res: Response , next: NextFunction): void;
    updateOrder(req: Request<any,any,any,any> , res: Response , next: NextFunction): void;
}



export class OrderController implements IOrderController{

    knexSql: Knex;
    orderModel: IOrderModel;
    productModel: IProductModel;

    public static createController = ({
        knexSql,
        orderModel,
        productModel,
    }:{
        knexSql: Knex;
        orderModel: IOrderModel;
        productModel: IProductModel;
    }) => {
        return new OrderController({
            knexSql,
            orderModel,
            productModel,
        });
    }

    constructor({knexSql, orderModel, productModel}: {
        knexSql: Knex;
        orderModel: IOrderModel;
        productModel: IProductModel;
    }){
        this.knexSql = knexSql;
        this.orderModel = orderModel;
        this.productModel = productModel;
    }

    public createOrderValidator = () =>{

        const paymentProviderValidator = (value:any) =>{
            return [PaymentProvider.ECPAY, PaymentProvider.PAYPAL].includes(value);
        }

        const paymentWayValidator = (value:any) =>{
            return [PaymentWay.CVS, PaymentWay.PAYPAL].includes(value);
        }

        const contentValidator = (value:OrderContent[]) =>{
            if(isEmpty(value)) return false;

            for(const product of value){
                if([product.productId,product.amount,product.price].some(val => !val))
                    return false;
            }

            return true;
        }
        return[
            body("paymentProvider", "Invalid payment provider").custom(
                paymentProviderValidator
            ),
            body("paymentWay", "Invalid payment way").custom(
                paymentWayValidator
            ),
            body("contents", "Invalid product content").isArray().custom(
                contentValidator
            ),
        ]
    }

    public createOrder:IOrderController["createOrder"] = async (req, res, _next) => {
        let {paymentProvider, paymentWay, contents} = req.body;
        console.log(paymentProvider, paymentWay, contents);

        //1.資料驗證 (ID、AMOUNT、PRICE)

        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        //2.將資料寫入DATABASE(ORDER)

        try{
            await transactionHandler(this.knexSql,async(trx:Knex.Transaction)=>{
                const results = await Promise.all(    
                    contents.map(async(product) => await this.productModel.preSell(
                        {
                            id: product.productId,
                            ...pick(product, ["price", "amount"]),
                        },
                        trx
                    ))
                );

                if(results.some((result) => !result)){
                    throw new Error("Cannot buy,because out of stuff.");
                }
                const totalPrice = contents.reduce(
                    (acc,product) => acc + product.price * product.amount,
                    0
                );
                
                const uid = genUID();    
                //訂單開立
                await this.orderModel.create({
                    id: uid,
                    total: totalPrice,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    paymentProvider,
                    paymentWay,
                    status: OrderStatus.WAITING,
                    contents,
                },trx);

                const products = await this.productModel.findByIds(contents.map((product) => product.productId));

                const contentInfos = contents.map((content) => {
                    const product =  products?.find((p) => p.id  === content.productId);
                    
                    return{
                        name:product?.name || "",
                        price: content.price,
                        amount: content.amount,
                        desc: product?.description || "",
                    };
                });

                //3.金流API的串接(ECPAY,PAYPAL)
                const result = await paymentDispatcher({
                    paymentProvider,
                    paymentWay,
                    payload: {
                        billId: uid,
                        totalPrice,
                        desc: `create order bill from ${uid} with ${contents.map((content) => content.productId).join(",")}`,
                        returnURL: `${process.env.END_POINT}/orders/update}`,
                        details: contentInfos || [],
                    },
                })

                //4.Return database create success
                res.json({ status:"success" , data: result });
            });
        }catch(err){
            res.status(500).json({errors:err})
            throw err;
        }
    };

    public updateOrder:IOrderController["updateOrder"] = async(req, res, _next) => {
        console.log(
            req.body
        );

        let merchantTradeNo ="";
        let tradeDate ="";

        if("RtnCode" in req.body && "MerchantTradeNo" in req.body){
            //ECPay
            const {MerchantTradeNo, RtnCode, TradeDate } = req.body;
            if(RtnCode !== "1") return res.status(500).send("0|Failed");

            merchantTradeNo = MerchantTradeNo;
            tradeDate = TradeDate;
        }else if ("resource" in req.body){
            //Paypal
            const { custom_id, status, update_time} = req.body.resource;

            if( status !== "COMPLETED" ) return res.status(500).send(500);

            merchantTradeNo = custom_id;
            tradeDate = update_time;
        }

        try{
            // 從 order 中找出我們的訂單
            const order = await this.orderModel.findOne(merchantTradeNo);

            if(isEmpty(order)) res.status(500).send("0 |Failed");

            if(order?.status !== OrderStatus.WAITING) return  res.status(500).send("0|Failed");

            // 更新 product 減少的商品
            const results = await Promise.all(
                order!.contents.map(
                    async(product)=>
                        await this.productModel.updateAmount({
                            id: product.productId,
                            ...pick(product, ["price", "amount"]),
                        })
                )
            );

            if(results.some((result) => !result))
                return res.status(500).send("0|Failed");

            //更新 order 狀態
            await this.orderModel.update(merchantTradeNo,{
                status: OrderStatus.SUCCESS,
                updatedAt: new Date(tradeDate),
            });

            res.status(200).send("1|OK");
        }catch (err:any){
            console.error(err);
            res.status(500).send("0|Failed");
        }
    };
}