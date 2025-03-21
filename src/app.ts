import { Knex } from 'knex';
import createError from 'http-errors';

import express, { RequestHandler, ErrorRequestHandler  } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';
import indexRouter from './routes/index';
import usersRouter from './routes/users';
import { createDatabase } from './utils';
import { ModelContext, modelManager } from './manager/modelManager';
import { ControllerContext, controllerManager } from './manager/controllerManager';
import { mountProductRouter } from './routes/product';
import { mountOrderRouter } from './routes/order';

class App {
  public app: express.Application;
  private knexSql: Knex;
  private modelCtx: ModelContext;
  controllerCtx: ControllerContext;

  constructor() {
    this.app = express();
    dotenv.config();
    this.config();

    this.knexSql = createDatabase();

    this.modelCtx = modelManager({ knexSql: this.knexSql });
    this.controllerCtx = controllerManager({
      knexSql: this.knexSql,
      modelCtx: this.modelCtx 
    });

    this.routerSetup();
    this.errorHandler();

    this.knexSql.select().from('products').then((result)=>{
      console.log(result);
    });
  }

  private config() {
    // view engine setup
    this.app.set('views', path.join(__dirname, 'views'));
    this.app.set('view engine', 'ejs');

    this.app.use(logger('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private routerSetup() {
    this.app.use('/', indexRouter);
    this.app.use('/users', usersRouter);
    this.app.use('/products', mountProductRouter({ controllerCtx: this.controllerCtx }));
    this.app.use('/orders', mountOrderRouter({ controllerCtx: this.controllerCtx }));
  }

  private errorHandler() {
    // catch 404 and forward to error handler
    const requestHandler: RequestHandler = function (_req, _res, next) {
      next(createError(404));
    };
    this.app.use(requestHandler);

    // error handler
    const errorRequestHandler: ErrorRequestHandler = function (
      err,
      req,
      res,
      _next
    ) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get("env") === "development" ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render("error");
    };
    this.app.use(errorRequestHandler);
  }
}

export default new App().app;

