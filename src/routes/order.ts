import { ControllerContext } from '@/manager/controllerManager';
import express from 'express';

export const mountOrderRouter = ({
    controllerCtx
}: {controllerCtx: ControllerContext}) =>{
    let router = express.Router();

    router.post(
        '/create',
        controllerCtx.orderController.createOrderValidator(),
        controllerCtx.orderController.createOrder,

    );

    router.post(
        '/update',
        controllerCtx.orderController.updateOrder,
    );

    return router;
};