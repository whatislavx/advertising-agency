import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as orderController from '../controllers/orderController';
import * as paymentController from '../controllers/paymentController';
import * as catalogController from '../controllers/catalogController';
import * as reportController from '../controllers/reportController';

const router = Router();

// User routes
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUserById);

// Order routes
router.get('/orders', orderController.getOrders);
router.post('/orders', orderController.createOrder);

// Payment routes
router.post('/payments', paymentController.processPayment);

// Catalog routes
router.get('/catalog', catalogController.getCatalog);

// Report routes
router.get('/reports', reportController.getReports);

export default router;
