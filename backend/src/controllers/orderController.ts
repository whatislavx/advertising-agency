import { Request, Response } from 'express';
import { OrderDB, ServiceDB, ResourceDB, runTransaction } from '../db/postgres';

export const getOrders = async (req: Request, res: Response) => {
    try {
        const result = await OrderDB.getAll();
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createOrder = async (req: Request, res: Response) => {
    const { user_id, service_id, event_date, end_date, resources } = req.body; // resources - масив ID
    
    try {
        const result = await runTransaction(async (client) => {
            // 1. Отримання ціни послуги
            const serviceRes = await ServiceDB.getById(client, service_id);
            if (serviceRes.rows.length === 0) throw new Error('Service not found');
            let total = Number(serviceRes.rows[0].base_price);

            // 2. Розрахунок вартості ресурсів
            if (resources && resources.length > 0) {
                const resQuery = await ResourceDB.getByIds(client, resources);
                resQuery.rows.forEach(r => total += Number(r.cost));
            }

            // 3. Вставка замовлення
            const orderRes = await OrderDB.create(client, user_id, service_id, event_date, end_date, total, 'new');
            const orderId = orderRes.rows[0].id;

            // 4. Вставка зв'язків з ресурсами
            if (resources && resources.length > 0) {
                for (const resId of resources) {
                    await OrderDB.addResource(client, orderId, resId);
                }
            }
            
            return { orderId, total };
        });

        res.status(201).json({ message: 'Order created', orderId: result.orderId, total: result.total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getOrdersByUserId = async (req: Request, res: Response) => {
    try {
        const result = await OrderDB.getByUserId(req.params.id);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const { status } = req.body;
    try {
        const result = await OrderDB.updateStatus(req.params.id, status);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const rescheduleOrder = async (req: Request, res: Response) => {
    const { newDate, newEndDate } = req.body;
    const { id } = req.params;

    try {
        // 1. Перевірка доступності ресурсів на нову дату (спрощена логіка)
        // В реальному проекті тут був би SELECT count(*) ... JOIN order_resources ... WHERE date = newDate
        
        // 2. Оновлення дати
        const result = await OrderDB.updateDate(id, newDate, newEndDate);
        
        if (result.rowCount === 0) {
             return res.status(404).json({ message: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};