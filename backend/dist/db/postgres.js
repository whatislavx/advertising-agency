"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTransaction = exports.PaymentDB = exports.ServiceViewsDB = exports.OrderDB = exports.ResourceDB = exports.ServiceDB = exports.UserDB = void 0;
// Database Access Objects
const postgres_1 = __importDefault(require("../config/postgres"));
exports.UserDB = {
    getAll: () => postgres_1.default.query('SELECT id, email, role, first_name, last_name, personal_discount FROM users'),
    getById: (id) => postgres_1.default.query(`
        SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.personal_discount, u.registration_date,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
        FROM users u 
        WHERE u.id = $1
    `, [id]),
    getByEmail: (email) => postgres_1.default.query('SELECT * FROM users WHERE email = $1', [email]),
    create: (email, passwordHash, role, first_name, last_name, phone) => postgres_1.default.query('INSERT INTO users (email, password_hash, role, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role', [email, passwordHash, role, first_name, last_name, phone]),
    update: (id, first_name, last_name, phone, email) => postgres_1.default.query('UPDATE users SET first_name = $1, last_name = $2, phone = $3, email = $4 WHERE id = $5 RETURNING *', [first_name, last_name, phone, email, id]),
    updatePassword: (id, passwordHash) => postgres_1.default.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]),
    updateDiscount: (id, discount) => postgres_1.default.query('UPDATE users SET personal_discount = $1 WHERE id = $2 RETURNING personal_discount', [discount, id]),
    incrementOrderCount: (client, id) => client.query("UPDATE users SET order_count = order_count + 1 WHERE id = $1", [id]),
    getPasswordHashById: (id) => postgres_1.default.query('SELECT password_hash FROM users WHERE id = $1', [id])
};
exports.ServiceDB = {
    getAll: () => postgres_1.default.query(`
        SELECT s.*, 
               COALESCE((SELECT json_agg(sr.resource_id) 
                         FROM service_resources sr 
                         WHERE sr.service_id = s.id), '[]') as allowed_resources
        FROM services s
        ORDER BY s.id ASC
    `),
    getAllAvailable: () => postgres_1.default.query(`
        SELECT s.*, 
               COALESCE((SELECT json_agg(sr.resource_id) 
                         FROM service_resources sr 
                         WHERE sr.service_id = s.id), '[]') as allowed_resources
        FROM services s
        WHERE s.is_available = TRUE
        ORDER BY s.id ASC
    `),
    getById: (client, id) => client.query('SELECT base_price FROM services WHERE id = $1', [id]),
    create: (client, name, base_price, type, description, imagePath, is_available) => client.query('INSERT INTO services (name, base_price, type, description, image_path, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, base_price, type || 'other', description, imagePath, is_available]),
    update: (client, id, name, base_price, type, description, imagePath, is_available) => client.query('UPDATE services SET name = $1, base_price = $2, type = COALESCE($3, type), description = COALESCE($4, description), image_path = COALESCE($5, image_path), is_available = $6 WHERE id = $7 RETURNING *', [name, base_price, type, description, imagePath, is_available, id]),
    delete: (id) => postgres_1.default.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]),
    clearResources: (client, serviceId) => client.query('DELETE FROM service_resources WHERE service_id = $1', [serviceId]),
    addResource: (client, serviceId, resourceId) => client.query('INSERT INTO service_resources (service_id, resource_id) VALUES ($1, $2)', [serviceId, resourceId])
};
exports.ResourceDB = {
    getAll: () => postgres_1.default.query('SELECT * FROM resources ORDER BY id ASC'),
    getAllAvailable: () => postgres_1.default.query('SELECT * FROM resources WHERE is_available = TRUE ORDER BY id ASC'),
    getByIds: (client, ids) => client.query('SELECT id, cost FROM resources WHERE id = ANY($1) AND is_available = TRUE', [ids]),
    create: (name, type, cost, is_available) => postgres_1.default.query('INSERT INTO resources (name, type, cost, is_available) VALUES ($1, $2, $3, $4) RETURNING *', [name, type, cost, is_available]),
    update: (id, name, type, cost, is_available) => postgres_1.default.query('UPDATE resources SET name = $1, type = $2, cost = $3, is_available = $4 WHERE id = $5 RETURNING *', [name, type, cost, is_available, id]),
    delete: (id) => postgres_1.default.query('DELETE FROM resources WHERE id = $1 RETURNING *', [id])
};
exports.OrderDB = {
    getAll: () => postgres_1.default.query(`
        SELECT 
            o.*, 
            u.email as user_email, 
            s.name as service_name,
            (
                SELECT json_agg(r.name)
                FROM order_resources or_link
                JOIN resources r ON or_link.resource_id = r.id
                WHERE or_link.order_id = o.id
            ) as resources
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN services s ON o.service_id = s.id
        ORDER BY o.created_at DESC
    `),
    getByUserId: (userId) => postgres_1.default.query(`
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
    `, [userId]),
    getById: (client, id) => client.query('SELECT * FROM orders WHERE id = $1', [id]),
    getResourceIdsByOrderId: (client, orderId) => client.query('SELECT resource_id FROM order_resources WHERE order_id = $1', [orderId]),
    create: (client, user_id, service_id, event_date, end_date, total, status) => client.query('INSERT INTO orders (user_id, service_id, event_date, end_date, total_cost, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [user_id, service_id, event_date, end_date, total, status]),
    addResource: (client, order_id, resource_id) => client.query('INSERT INTO order_resources (order_id, resource_id) VALUES ($1, $2)', [order_id, resource_id]),
    updateStatus: (id, status) => postgres_1.default.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]),
    updateStatusTx: (client, id, status) => client.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]),
    updateOrderDetails: (id, event_date, end_date, total_cost) => postgres_1.default.query('UPDATE orders SET event_date = $1, end_date = $2, total_cost = $3 WHERE id = $4 RETURNING *', [event_date, end_date, total_cost, id]),
    getUserIdByOrderId: (client, id) => client.query('SELECT user_id FROM orders WHERE id = $1', [id]),
    countAll: () => postgres_1.default.query('SELECT COUNT(*) FROM orders'),
    countByDateRange: (startDate, endDate) => postgres_1.default.query('SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at < $2', [startDate, endDate]),
    getTotalRevenue: () => postgres_1.default.query("SELECT SUM(total_cost) FROM orders WHERE status IN ('paid', 'completed')"),
    getRevenueByDateRange: (startDate, endDate) => postgres_1.default.query("SELECT SUM(total_cost) FROM orders WHERE status IN ('paid', 'completed') AND created_at >= $1 AND created_at < $2", [startDate, endDate]),
    getOrdersCountByService: () => postgres_1.default.query('SELECT service_id, COUNT(*) as count FROM orders GROUP BY service_id'),
    // Топ-5 послуг за доходом
    getTopServicesByRevenue: (startDate, endDate) => postgres_1.default.query(`
        SELECT s.name, SUM(o.total_cost) as revenue, COUNT(o.id) as count
        FROM orders o
        JOIN services s ON o.service_id = s.id
        WHERE o.status IN ('paid', 'completed') AND o.created_at >= $1 AND o.created_at < $2
        GROUP BY s.name
        ORDER BY revenue DESC
        LIMIT 5
    `, [startDate, endDate]),
    // Розподіл доходу за типом (для діаграми)
    getRevenueByType: (startDate, endDate) => postgres_1.default.query(`
        SELECT s.type, SUM(o.total_cost) as revenue
        FROM orders o
        JOIN services s ON o.service_id = s.id
        WHERE o.status IN ('paid', 'completed') AND o.created_at >= $1 AND o.created_at < $2
        GROUP BY s.type
    `, [startDate, endDate]),
    // Топ-5 клієнтів
    getTopClients: (startDate, endDate) => postgres_1.default.query(`
        SELECT u.first_name, u.last_name, u.email, SUM(o.total_cost) as total_spent, COUNT(o.id) as orders_count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.status IN ('paid', 'completed') AND o.created_at >= $1 AND o.created_at < $2
        GROUP BY u.id
        ORDER BY total_spent DESC
        LIMIT 5
    `, [startDate, endDate]),
    // Найпопулярніші ресурси
    getTopResources: (startDate, endDate) => postgres_1.default.query(`
        SELECT r.name, r.type, COUNT(orr.resource_id) as usage_count
        FROM order_resources orr
        JOIN orders o ON orr.order_id = o.id
        JOIN resources r ON orr.resource_id = r.id
        WHERE o.created_at >= $1 AND o.created_at < $2
        GROUP BY r.id, r.name, r.type
        ORDER BY usage_count DESC
        LIMIT 5
    `, [startDate, endDate]),
    // инаміка доходу по днях (якщо знадобиться для графіка)
    getDailyRevenue: (startDate, endDate) => postgres_1.default.query(`
        SELECT DATE(created_at) as date, SUM(total_cost) as revenue
        FROM orders
        WHERE status IN ('paid', 'completed') AND created_at >= $1 AND created_at < $2
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `, [startDate, endDate]),
    getFirstOrderDate: () => postgres_1.default.query('SELECT MIN(created_at) as first_date FROM orders')
};
exports.ServiceViewsDB = {
    create: (serviceId, userId) => postgres_1.default.query('INSERT INTO service_views (service_id, user_id) VALUES ($1, $2)', [serviceId, userId]),
    countAll: () => postgres_1.default.query('SELECT COUNT(*) FROM service_views'),
    countByDateRange: (startDate, endDate) => postgres_1.default.query('SELECT COUNT(*) FROM service_views WHERE viewed_at >= $1 AND viewed_at < $2', [startDate, endDate]),
    getViewsCountByService: () => postgres_1.default.query('SELECT service_id, COUNT(*) as count FROM service_views GROUP BY service_id')
};
exports.PaymentDB = {
    create: (order_id, amount) => postgres_1.default.query("INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, 'pending')", [order_id, amount])
};
const runTransaction = async (callback) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
};
exports.runTransaction = runTransaction;
