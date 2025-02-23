import { IOrderModel, OrderModel } from "@/model/order";
import { IProductModel, ProductModel } from "@/model/product";
import { Knex } from "knex";

export interface ModelContext{
    productModel: IProductModel;
    orderModel: IOrderModel;
}

export const modelManager = ({ knexSql }: { knexSql: Knex }): ModelContext=> {

    const productModel = ProductModel.createModel({ knexSql});
    
    const orderModel = OrderModel.createModel({ knexSql});

    return { productModel , orderModel, };
}