import express from 'express';
import { getLogger } from '@/utils/loggers';
import { env } from 'process';
const router = express.Router();
const logger = getLogger('INDEX_ROUTE');

/* GET home page. */
router.get('/', function (_req, res, _next) {
  res.render('index-2', { title: 'Home'});
});

/* GET index page. */
router.get('/index', function (_req, res, _next) {
  res.render('index', { title: 'Index' , pay_pal_client_id:env.PAYPAL_CLIENT_ID});
});

export default router;
