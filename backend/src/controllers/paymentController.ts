import { Request, Response } from 'express';
import { PaymentDB, OrderDB, UserDB, runTransaction } from '../db/postgres';

// processPayment (Створення запису про платіж)
// POST /payments
export const processPayment = async (req: Request, res: Response) => {
    const { order_id, amount } = req.body;
    
    try {
        // Просто створюємо запис зі статусом pending
        await PaymentDB.create(order_id, amount);
        
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
    
    try {
        await runTransaction(async (client) => {
            // 1. Оновлюємо статус платежу (якщо ми знаємо ID платежу) 
            // або створюємо успішний платіж
            
            // 2. Оновлюємо статус замовлення
            await OrderDB.updateStatusTx(client, id, 'paid');

            // 3. Отримуємо ID користувача для цього замовлення
            const orderRes = await OrderDB.getUserIdByOrderId(client, id);
            
            if (orderRes.rows.length > 0) {
                const userId = orderRes.rows[0].user_id;
                await UserDB.incrementOrderCount(client, userId);
            }
        });

        res.json({ message: 'Payment confirmed and order updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};