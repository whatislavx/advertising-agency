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

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 

    },
    filename: (req, file, cb) => {

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Дозволені лише формати .png, .jpg та .jpeg!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});

router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUserById); 

router.post('/auth/login', userController.login);
router.post('/auth/register', userController.register);
router.patch('/users/:id', userController.updateUser); 

router.patch('/users/:id/password', userController.changePassword); 

router.patch('/users/:id/discount', userController.setDiscount); 

router.get('/orders', orderController.getOrders);
router.post('/orders', orderController.createOrder); 

router.get('/orders/user/:id', orderController.getOrdersByUserId); 

router.patch('/orders/:id/status', orderController.updateOrderStatus);
router.post('/orders/:id/reschedule', orderController.rescheduleOrder); 

router.post('/payments', paymentController.processPayment); 

router.patch('/payments/:id/confirm', paymentController.confirmPayment); 

router.get('/services', catalogController.getAllServices); 
router.get('/resources', catalogController.getResources);

router.post('/services', upload.single('image'), catalogController.createService);
router.patch('/services/:id', upload.single('image'), catalogController.patchService);

router.delete('/services/:id', catalogController.deleteService);
router.post('/resources', catalogController.createResource);
router.patch('/resources/:id', catalogController.patchResource);
router.delete('/resources/:id', catalogController.deleteResource);
router.post('/analytics/view', catalogController.trackView);

router.get('/dashboard/stats', reportController.getDashboardStats);
router.get('/reports', reportController.getReports); 

router.post('/reports', reportController.createReport); 

router.get('/reports/:id', reportController.getReportById); 

router.get('/reports/export/pdf', reportController.exportPdfReport);

export default router;