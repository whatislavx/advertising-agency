"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPayment = exports.processPayment = void 0;
const postgres_1 = require("../db/postgres");

const processPayment = async (req, res) => {
    const { order_id, amount } = req.body;
    try {

        await postgres_1.PaymentDB.create(order_id, amount);

        res.json({ message: 'Платіж оброблено' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.processPayment = processPayment;

const confirmPayment = async (req, res) => {
    const { id } = req.params; 

    try {
        await (0, postgres_1.runTransaction)(async (client) => {

            await postgres_1.OrderDB.updateStatusTx(client, id, 'paid');

            const orderRes = await postgres_1.OrderDB.getUserIdByOrderId(client, id);
            if (orderRes.rows.length > 0) {
                const userId = orderRes.rows[0].user_id;
                await postgres_1.UserDB.incrementOrderCount(client, userId);
            }
        });
        res.json({ message: 'Платіж підтверджено та замовлення оновлено' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.confirmPayment = confirmPayment;

