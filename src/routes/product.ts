import { ControllerContext } from "@/manager/controllerManager";
import express from 'express';

export const mountProductRouter = ({
    controllerCtx,
}:{
    controllerCtx: ControllerContext;
}) => {

    let router = express.Router();
    
    router.get('/list',controllerCtx.productController.findAll);

    return router;
};