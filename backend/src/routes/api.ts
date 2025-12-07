import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as userController from '../controllers/userController';
import * as orderController from '../controllers/orderController';
import * as paymentController from '../controllers/paymentController';
import * as catalogController from '../controllers/catalogController';
import * as reportController from '../controllers/reportController';

const router = Router();

// --- Multer Configuration (Завантаження файлів) ---
// Перевіряємо, чи існує папка uploads, якщо ні - створюємо
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Папка для збереження
    },
    filename: (req, file, cb) => {
        // Генеруємо унікальне ім'я: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});

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

// --- Catalog/Resources Routes ---
router.get('/services', catalogController.getAllServices); 
router.get('/resources', catalogController.getResources);

// ОНОВЛЕНІ РОУТИ: Додаємо middleware upload.single('image')
// 'image' - це ім'я поля у FormData, яке ми будемо відправляти з фронтенду
router.post('/services', upload.single('image'), catalogController.createService);
router.patch('/services/:id', upload.single('image'), catalogController.patchService);

router.delete('/services/:id', catalogController.deleteService);
router.post('/resources', catalogController.createResource);
router.patch('/resources/:id', catalogController.patchResource);
router.delete('/resources/:id', catalogController.deleteResource);
router.post('/analytics/view', catalogController.trackView);

// --- Report Routes (MongoDB) ---
router.get('/dashboard/stats', reportController.getDashboardStats);
router.get('/reports', reportController.getReports); // Список (полегшений)
router.post('/reports', reportController.createReport); // Створення (з mixed data)
router.get('/reports/:id', reportController.getReportById); // Деталі (повний JSON)
router.get('/reports/export/pdf', reportController.exportPdfReport);

export default router;