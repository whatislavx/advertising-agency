import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as orderController from '../controllers/orderController';
import * as paymentController from '../controllers/paymentController';
import * as catalogController from '../controllers/catalogController';
import * as reportController from '../controllers/reportController';

const router = Router();

// --- User Routes (PostgreSQL) ---
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUserById); // Профіль
router.post('/auth/login', userController.login);
router.post('/auth/register', userController.register);
router.patch('/users/:id', userController.updateUser); // Оновлення контактів
router.patch('/users/:id/password', userController.changePassword); // Зміна пароля
router.patch('/users/:id/discount', userController.setDiscount); // Встановлення знижки (Director)

// --- Order Routes (PostgreSQL) ---
router.get('/orders', orderController.getOrders);
router.post('/orders', orderController.createOrder); // Створення замовлення
router.get('/orders/user/:id', orderController.getOrdersByUserId); // "Мої замовлення"
router.patch('/orders/:id/status', orderController.updateOrderStatus);
router.post('/orders/:id/reschedule', orderController.rescheduleOrder); // Перенесення дати

// --- Payment Routes (PostgreSQL) ---
router.post('/payments', paymentController.processPayment); // Обробка платежу
router.patch('/payments/:id/confirm', paymentController.confirmPayment); // Підтвердження

// --- Catalog/Resources Routes (Redis Caching) ---
// Всі READ запити йдуть через Redis (Cache-Aside) [cite: 14, 29]
router.get('/services', catalogController.getAllServices); 
router.get('/resources', catalogController.getResources);

// Всі WRITE запити інвалідують кеш [cite: 34, 42]
router.post('/services', catalogController.createService);
router.patch('/services/:id', catalogController.patchService);
router.delete('/services/:id', catalogController.deleteService);
router.post('/resources', catalogController.createResource);
router.patch('/resources/:id', catalogController.patchResource);
router.delete('/resources/:id', catalogController.deleteResource);

// --- Report Routes (MongoDB) ---
router.get('/dashboard/stats', reportController.getDashboardStats);
router.get('/reports', reportController.getReports); // Список (полегшений) [cite: 182]
router.post('/reports', reportController.createReport); // Створення (з mixed data) [cite: 171]
router.get('/reports/:id', reportController.getReportById); // Деталі (повний JSON) [cite: 193]

export default router;
