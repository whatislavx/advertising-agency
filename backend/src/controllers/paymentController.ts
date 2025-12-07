import { Request, Response } from 'express';
import { PaymentDB, OrderDB, UserDB, runTransaction } from '../db/postgres';

export const processPayment = async (req: Request, res: Response) => {
    const { order_id, amount } = req.body;

    try {

        await PaymentDB.create(order_id, amount);

        res.json({ message: 'Платіж оброблено' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

export const confirmPayment = async (req: Request, res: Response) => {
    const { id } = req.params; 

    try {
        await runTransaction(async (client) => {

            await OrderDB.updateStatusTx(client, id, 'paid');

            const orderRes = await OrderDB.getUserIdByOrderId(client, id);

            if (orderRes.rows.length > 0) {
                const userId = orderRes.rows[0].user_id;
                await UserDB.incrementOrderCount(client, userId);
            }
        });

        res.json({ message: 'Платіж підтверджено та замовлення оновлено' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};