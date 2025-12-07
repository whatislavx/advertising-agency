import { Request, Response } from 'express';
import { OrderDB, ServiceDB, ResourceDB, UserDB, runTransaction } from '../db/postgres';

export const getOrders = async (req: Request, res: Response) => {
    try {
        const result = await OrderDB.getAll();
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

export const createOrder = async (req: Request, res: Response) => {
    const { user_id, service_id, event_date, end_date, resources } = req.body;

    try {
        const result = await runTransaction(async (client) => {
            const serviceRes = await ServiceDB.getById(client, service_id);
            if (serviceRes.rows.length === 0) throw new Error('Service not found');
            const basePricePerDay = Number(serviceRes.rows[0].base_price);

            let resourcesCostPerDay = 0;
            if (resources && resources.length > 0) {
                const resQuery = await ResourceDB.getByIds(client, resources);
                resQuery.rows.forEach(r => resourcesCostPerDay += Number(r.cost));
            }

            const start = new Date(event_date);
            const end = new Date(end_date || event_date);
            const diffTime = end.getTime() - start.getTime();
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

            if (days <= 0) throw new Error('Invalid date range');

            // Get user discount
            const userRes = await UserDB.getById(user_id);
            let discount = 0;
            if (userRes.rows.length > 0) {
                discount = Number(userRes.rows[0].personal_discount) || 0;
            }

            const subtotal = (basePricePerDay + resourcesCostPerDay) * days;
            const total = subtotal * (1 - discount / 100);

            const orderRes = await OrderDB.create(client, user_id, service_id, event_date, end_date, total, 'new');
            const orderId = orderRes.rows[0].id;

            if (resources && resources.length > 0) {
                for (const resId of resources) {
                    await OrderDB.addResource(client, orderId, resId);
                }
            }

            return { orderId, total };
        });

        res.status(201).json({ message: 'Замовлення створено', orderId: result.orderId, total: result.total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

export const getOrdersByUserId = async (req: Request, res: Response) => {
    try {
        const result = await OrderDB.getByUserId(req.params.id);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const { status } = req.body;
    const orderId = req.params.id;

    try {
        const result = await runTransaction(async (client) => {
            const updateRes = await OrderDB.updateStatus(orderId, status);
            
            if (status === 'completed') {
                const orderRes = await OrderDB.getById(client, orderId);
                if (orderRes.rows.length > 0) {
                    const userId = orderRes.rows[0].user_id;
                    await UserDB.incrementOrderCount(client, userId);
                    
                    // Check for automatic discount upgrade
                    await UserDB.checkAndApplyDiscount(client, userId);
                }
            }
            
            return updateRes.rows[0];
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

export const rescheduleOrder = async (req: Request, res: Response) => {
    const { event_date, end_date } = req.body;
    const { id } = req.params;

    try {
        const updatedOrder = await runTransaction(async (client) => {

            const orderRes = await OrderDB.getById(client, id);
            if (orderRes.rows.length === 0) throw new Error('Order not found');
            const order = orderRes.rows[0];

            const start = new Date(event_date);
            const end = new Date(end_date);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const newDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (newDays <= 0) throw new Error('Invalid dates');

            let newTotal = Number(order.total_cost);

            if (order.status === 'paid') {

                const oldStart = new Date(order.event_date);
                const oldEnd = new Date(order.end_date || order.event_date);
                const oldDiff = Math.abs(oldEnd.getTime() - oldStart.getTime());
                const oldDays = Math.ceil(oldDiff / (1000 * 60 * 60 * 24)) + 1;

                if (newDays !== oldDays) {
                    throw new Error('Duration change not allowed for paid orders');
                }

            } else {

                const serviceRes = await ServiceDB.getById(client, order.service_id);
                const basePricePerDay = Number(serviceRes.rows[0].base_price);

                const resourcesRes = await OrderDB.getResourceIdsByOrderId(client, id);
                let resourcesCostPerDay = 0;

                if (resourcesRes.rows.length > 0) {
                    const resourceIds = resourcesRes.rows.map(r => r.resource_id);
                    const resourceDetails = await ResourceDB.getByIds(client, resourceIds);
                    resourceDetails.rows.forEach(r => resourcesCostPerDay += Number(r.cost));
                }

                newTotal = (basePricePerDay + resourcesCostPerDay) * newDays;
            }

            const updateRes = await OrderDB.updateOrderDetails(id, event_date, end_date, newTotal);
            return updateRes.rows[0];
        });

        res.json(updatedOrder);
    } catch (error: any) {
        console.error(error);
        if (error.message === 'Order not found') return res.status(404).json({ message: 'Замовлення не знайдено' });
        if (error.message === 'Duration change not allowed for paid orders') {
            return res.status(400).json({ message: 'Зміна тривалості заборонена для оплачених замовлень' });
        }
        res.status(500).json({ message: 'Помилка сервера' });
    }
};