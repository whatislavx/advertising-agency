"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rescheduleOrder = exports.updateOrderStatus = exports.getOrdersByUserId = exports.createOrder = exports.getOrders = void 0;
const postgres_1 = require("../db/postgres");
const getOrders = async (req, res) => {
    try {
        const result = await postgres_1.OrderDB.getAll();
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOrders = getOrders;
const createOrder = async (req, res) => {
    const { user_id, service_id, event_date, end_date, resources } = req.body;
    try {
        const result = await (0, postgres_1.runTransaction)(async (client) => {
            const serviceRes = await postgres_1.ServiceDB.getById(client, service_id);
            if (serviceRes.rows.length === 0)
                throw new Error('Service not found');
            const basePricePerDay = Number(serviceRes.rows[0].base_price);
            let resourcesCostPerDay = 0;
            if (resources && resources.length > 0) {
                const resQuery = await postgres_1.ResourceDB.getByIds(client, resources);
                resQuery.rows.forEach(r => resourcesCostPerDay += Number(r.cost));
            }
            const start = new Date(event_date);
            const end = new Date(end_date || event_date);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (days <= 0)
                throw new Error('Invalid date range');
            const total = (basePricePerDay + resourcesCostPerDay) * days;
            const orderRes = await postgres_1.OrderDB.create(client, user_id, service_id, event_date, end_date, total, 'new');
            const orderId = orderRes.rows[0].id;
            if (resources && resources.length > 0) {
                for (const resId of resources) {
                    await postgres_1.OrderDB.addResource(client, orderId, resId);
                }
            }
            return { orderId, total };
        });
        res.status(201).json({ message: 'Order created', orderId: result.orderId, total: result.total });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createOrder = createOrder;
const getOrdersByUserId = async (req, res) => {
    try {
        const result = await postgres_1.OrderDB.getByUserId(req.params.id);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOrdersByUserId = getOrdersByUserId;
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const result = await postgres_1.OrderDB.updateStatus(req.params.id, status);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const rescheduleOrder = async (req, res) => {
    const { event_date, end_date } = req.body;
    const { id } = req.params;
    try {
        const updatedOrder = await (0, postgres_1.runTransaction)(async (client) => {
            // 1. Отримуємо поточне замовлення
            const orderRes = await postgres_1.OrderDB.getById(client, id);
            if (orderRes.rows.length === 0)
                throw new Error('Order not found');
            const order = orderRes.rows[0];
            // 2. Розрахунок нової тривалості
            const start = new Date(event_date);
            const end = new Date(end_date);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const newDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (newDays <= 0)
                throw new Error('Invalid dates');
            let newTotal = Number(order.total_cost);
            // 3. Логіка перевірки статусу
            if (order.status === 'paid') {
                // Для оплачених замовлень тривалість має зберігатися
                const oldStart = new Date(order.event_date);
                const oldEnd = new Date(order.end_date || order.event_date);
                const oldDiff = Math.abs(oldEnd.getTime() - oldStart.getTime());
                const oldDays = Math.ceil(oldDiff / (1000 * 60 * 60 * 24)) + 1;
                if (newDays !== oldDays) {
                    throw new Error('Duration change not allowed for paid orders');
                }
                // Сума залишається старою, бо тривалість та сама
            }
            else {
                // Для нових замовлень перераховуємо ціну
                const serviceRes = await postgres_1.ServiceDB.getById(client, order.service_id);
                const basePricePerDay = Number(serviceRes.rows[0].base_price);
                const resourcesRes = await postgres_1.OrderDB.getResourceIdsByOrderId(client, id);
                let resourcesCostPerDay = 0;
                if (resourcesRes.rows.length > 0) {
                    const resourceIds = resourcesRes.rows.map(r => r.resource_id);
                    const resourceDetails = await postgres_1.ResourceDB.getByIds(client, resourceIds);
                    resourceDetails.rows.forEach(r => resourcesCostPerDay += Number(r.cost));
                }
                newTotal = (basePricePerDay + resourcesCostPerDay) * newDays;
            }
            // 4. Оновлення в БД
            const updateRes = await postgres_1.OrderDB.updateOrderDetails(id, event_date, end_date, newTotal);
            return updateRes.rows[0];
        });
        res.json(updatedOrder);
    }
    catch (error) {
        console.error(error);
        if (error.message === 'Order not found')
            return res.status(404).json({ message: 'Order not found' });
        if (error.message === 'Duration change not allowed for paid orders') {
            return res.status(400).json({ message: 'Зміна тривалості заборонена для оплачених замовлень' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};
exports.rescheduleOrder = rescheduleOrder;
