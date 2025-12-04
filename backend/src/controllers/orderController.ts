import { Request, Response } from 'express';
import pgPool from '../config/postgres';

export const getOrders = async (req: Request, res: Response) => {
    try {
        const result = await pgPool.query(`
            SELECT o.*, u.email as user_email, s.name as service_name 
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN services s ON o.service_id = s.id
            ORDER BY o.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createOrder = async (req: Request, res: Response) => {
    const { user_id, service_id, event_date, end_date, resources } = req.body; // resources - масив ID
    
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Отримання ціни послуги
        const serviceRes = await client.query('SELECT base_price FROM services WHERE id = $1', [service_id]);
        if (serviceRes.rows.length === 0) throw new Error('Service not found');
        let total = Number(serviceRes.rows[0].base_price);

        // 2. Розрахунок вартості ресурсів
        if (resources && resources.length > 0) {
            const resQuery = await client.query('SELECT id, cost FROM resources WHERE id = ANY($1)', [resources]);
            resQuery.rows.forEach(r => total += Number(r.cost));
        }

        // 3. Вставка замовлення
        const orderRes = await client.query(
            'INSERT INTO orders (user_id, service_id, event_date, end_date, total_cost, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, service_id, event_date, end_date, total, 'new']
        );
        const orderId = orderRes.rows[0].id;

        // 4. Вставка зв'язків з ресурсами
        if (resources && resources.length > 0) {
            for (const resId of resources) {
                await client.query('INSERT INTO order_resources (order_id, resource_id) VALUES ($1, $2)', [orderId, resId]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Order created', orderId, total });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

export const getOrdersByUserId = async (req: Request, res: Response) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                o.*, 
                s.name as service_name,
                (
                    SELECT json_agg(r.name)
                    FROM order_resources or_link
                    JOIN resources r ON or_link.resource_id = r.id
                    WHERE or_link.order_id = o.id
                ) as resources
            FROM orders o
            JOIN services s ON o.service_id = s.id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const { status } = req.body;
    try {
        const result = await pgPool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const rescheduleOrder = async (req: Request, res: Response) => {
    const { newDate } = req.body;
    const { id } = req.params;

    try {
        // 1. Перевірка доступності ресурсів на нову дату (спрощена логіка)
        // В реальному проекті тут був би SELECT count(*) ... JOIN order_resources ... WHERE date = newDate
        
        // 2. Оновлення дати
        const result = await pgPool.query(
            'UPDATE orders SET event_date = $1 WHERE id = $2 RETURNING *', 
            [newDate, id]
        );
        
        if (result.rowCount === 0) {
             return res.status(404).json({ message: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};