"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPayment = exports.processPayment = void 0;
const postgres_1 = require("../db/postgres");
// processPayment (Створення запису про платіж)
// POST /payments
const processPayment = async (req, res) => {
    const { order_id, amount } = req.body;
    try {
        // Просто створюємо запис зі статусом pending
        await postgres_1.PaymentDB.create(order_id, amount);
        // В реальній системі тут був би виклик LiqPay/Stripe
        // Для емуляції ми одразу викликаємо підтвердження (або це робить вебхук)
        // Для Lab 3 ми часто викликаємо confirmPayment окремо або імітуємо тут.
        // Імітуємо успішну оплату через виклик логіки підтвердження (для спрощення UI)
        // Або повертаємо success, щоб фронтенд викликав confirm
        res.json({ message: 'Payment processed' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.processPayment = processPayment;
// confirmPayment (Транзакція підтвердження)
// PATCH /payments/:id/confirm (або викликається внутрішньо)
const confirmPayment = async (req, res) => {
    const { id } = req.params; // Це може бути ID замовлення або платежу, залежно від роута.
    // Припустимо, що в роуті передається ID замовлення для зручності
    try {
        await (0, postgres_1.runTransaction)(async (client) => {
            // 1. Оновлюємо статус платежу (якщо ми знаємо ID платежу) 
            // або створюємо успішний платіж
            // 2. Оновлюємо статус замовлення
            await postgres_1.OrderDB.updateStatusTx(client, id, 'paid');
            // 3. Отримуємо ID користувача для цього замовлення
            const orderRes = await postgres_1.OrderDB.getUserIdByOrderId(client, id);
            if (orderRes.rows.length > 0) {
                const userId = orderRes.rows[0].user_id;
                await postgres_1.UserDB.incrementOrderCount(client, userId);
            }
        });
        res.json({ message: 'Payment confirmed and order updated' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.confirmPayment = confirmPayment;
