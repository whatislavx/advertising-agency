"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const userController = __importStar(require("../controllers/userController"));
const orderController = __importStar(require("../controllers/orderController"));
const paymentController = __importStar(require("../controllers/paymentController"));
const catalogController = __importStar(require("../controllers/catalogController"));
const reportController = __importStar(require("../controllers/reportController"));
const router = (0, express_1.Router)();
// --- Multer Configuration (Завантаження файлів) ---
// Перевіряємо, чи існує папка uploads, якщо ні - створюємо
const uploadDir = 'uploads';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Папка для збереження
    },
    filename: (req, file, cb) => {
        // Генеруємо унікальне ім'я: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    }
    else {
        cb(new Error('Дозволені лише формати .png, .jpg та .jpeg!'), false);
    }
};
const upload = (0, multer_1.default)({
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
exports.default = router;
