import { IProductModel } from "@/model/product";
import { NextFunction, Request, Response } from "express";

interface ProductControllerProp {
    productModel: IProductModel;
}

export interface IProductController{
    findAll(
        req: Request<any,any,any,any>,
        res: Response,
        _next: NextFunction
    ):void;
}

export class ProductController implements IProductController{
    private productModel: IProductModel;

    public static createController({productModel}:ProductControllerProp){
        return new ProductController({ productModel });
    }

    constructor({ productModel }: ProductControllerProp){
        this.productModel = productModel;
    } 

    findAll:IProductController["findAll"] = async(_req, res ,_next)=>{
        const result = await this.productModel.findAll();

        res.json(result);
    }
}