import { Request, Response } from 'express';
import pgPool from '../config/postgres';

// processPayment (Створення запису про платіж)
// POST /payments
export const processPayment = async (req: Request, res: Response) => {
    const { order_id, amount } = req.body;
    
    try {
        // Просто створюємо запис зі статусом pending
        await pgPool.query(
            "INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, 'pending')",
            [order_id, amount]
        );
        
        // В реальній системі тут був би виклик LiqPay/Stripe
        // Для емуляції ми одразу викликаємо підтвердження (або це робить вебхук)
        // Для Lab 3 ми часто викликаємо confirmPayment окремо або імітуємо тут.
        
        // Імітуємо успішну оплату через виклик логіки підтвердження (для спрощення UI)
        // Або повертаємо success, щоб фронтенд викликав confirm
        
        res.json({ message: 'Payment processed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// confirmPayment (Транзакція підтвердження)
// PATCH /payments/:id/confirm (або викликається внутрішньо)
export const confirmPayment = async (req: Request, res: Response) => {
    const { id } = req.params; // Це може бути ID замовлення або платежу, залежно від роута.
    // Припустимо, що в роуті передається ID замовлення для зручності
    
    const client = await pgPool.connect();
    
    try {
        await client.query('BEGIN'); 

        // 1. Оновлюємо статус платежу (якщо ми знаємо ID платежу) 
        // або створюємо успішний платіж
        
        // 2. Оновлюємо статус замовлення
        await client.query(
            "UPDATE orders SET status = 'paid' WHERE id = $1", 
            [id]
        );

        // 3. Отримуємо ID користувача для цього замовлення
        const orderRes = await client.query('SELECT user_id FROM orders WHERE id = $1', [id]);
        
        if (orderRes.rows.length > 0) {
            const userId = orderRes.rows[0].user_id;
            await client.query(
                "UPDATE users SET order_count = order_count + 1 WHERE id = $1",
                [userId]
            );
        }

        await client.query('COMMIT'); // Фіксація змін
        res.json({ message: 'Payment confirmed and order updated' });
    } catch (error) {
        await client.query('ROLLBACK'); // Відміна змін у разі помилки
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};