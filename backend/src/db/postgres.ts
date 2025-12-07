import pool from '../config/postgres';
import { PoolClient, Pool } from 'pg';

export const UserDB = {
    getAll: () => pool.query('SELECT id, email, role, first_name, last_name, personal_discount FROM users'),

    getById: (id: string) => pool.query(`
        SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.personal_discount, u.registration_date,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status IN ('paid', 'completed')) as order_count
        FROM users u 
        WHERE u.id = $1
    `, [id]),

    getByEmail: (email: string) => pool.query('SELECT * FROM users WHERE email = $1', [email]),

    create: (email: string, passwordHash: string, role: string, first_name: string, last_name: string, phone: string) => 
        pool.query(
            'INSERT INTO users (email, password_hash, role, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role',
            [email, passwordHash, role, first_name, last_name, phone]
        ),

    update: (id: string, first_name: string, last_name: string, phone: string, email: string) => 
        pool.query(
            'UPDATE users SET first_name = $1, last_name = $2, phone = $3, email = $4 WHERE id = $5 RETURNING *',
            [first_name, last_name, phone, email, id]
        ),

    updatePassword: (id: string, passwordHash: string) => 
        pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]),

    updateDiscount: (client: PoolClient | Pool, id: string | number, discount: number) => 
        client.query(
            'UPDATE users SET personal_discount = $1 WHERE id = $2 RETURNING personal_discount',
            [discount, id]
        ),

    incrementOrderCount: (client: PoolClient, id: number) => 
        client.query("UPDATE users SET order_count = order_count + 1 WHERE id = $1", [id]),

    getPasswordHashById: (id: string) => 
        pool.query('SELECT password_hash FROM users WHERE id = $1', [id]),

    checkAndApplyDiscount: async (client: PoolClient | Pool, userId: string | number) => {
        const res = await client.query(`
            SELECT personal_discount, 
            (SELECT COUNT(*) FROM orders 
             WHERE user_id = $1 
             AND status IN ('paid', 'completed')
             AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
            ) as monthly_order_count
            FROM users WHERE id = $1
        `, [userId]);
        
        if (res.rows.length === 0) return;
        
        const { personal_discount, monthly_order_count } = res.rows[0];
        const currentDiscount = Number(personal_discount);
        const count = Number(monthly_order_count);
        
        let newDiscount = 0;
        
        if (count > 20) {
            newDiscount = 20;
        } else if (count > 10) {
            newDiscount = 10;
        } else if (count > 3) {
            newDiscount = 5;
        }
        
        if (newDiscount !== currentDiscount) {
            await client.query('UPDATE users SET personal_discount = $1 WHERE id = $2', [newDiscount, userId]);
        }
    }
};

export const ServiceDB = {
    getAll: () => pool.query(`
        SELECT s.*, 
               COALESCE((SELECT json_agg(sr.resource_id) 
                         FROM service_resources sr 
                         WHERE sr.service_id = s.id), '[]') as allowed_resources
        FROM services s
        ORDER BY s.id ASC
    `),

    getAllAvailable: () => pool.query(`
        SELECT s.*, 
               COALESCE((SELECT json_agg(sr.resource_id) 
                         FROM service_resources sr 
                         WHERE sr.service_id = s.id), '[]') as allowed_resources
        FROM services s
        WHERE s.is_available = TRUE
        ORDER BY s.id ASC
    `),

    getById: (client: PoolClient, id: number) => 
        client.query('SELECT base_price FROM services WHERE id = $1', [id]),

    create: (client: PoolClient | Pool, name: string, base_price: number, type: string, description: string, imagePath: string | null, is_available: boolean) => 
        client.query(
            'INSERT INTO services (name, base_price, type, description, image_path, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, base_price, type || 'other', description, imagePath, is_available]
        ),

    update: (client: PoolClient | Pool, id: string, name: string, base_price: number, type: string, description: string, imagePath: string | null, is_available: boolean) => 
        client.query(
            'UPDATE services SET name = $1, base_price = $2, type = COALESCE($3, type), description = COALESCE($4, description), image_path = COALESCE($5, image_path), is_available = $6 WHERE id = $7 RETURNING *',
            [name, base_price, type, description, imagePath, is_available, id]
        ),

    delete: (id: string) => pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]),

    clearResources: (client: PoolClient | Pool, serviceId: number) =>
        client.query('DELETE FROM service_resources WHERE service_id = $1', [serviceId]),

    addResource: (client: PoolClient | Pool, serviceId: number, resourceId: number) =>
        client.query('INSERT INTO service_resources (service_id, resource_id) VALUES ($1, $2)', [serviceId, resourceId])
};

export const ResourceDB = {
    getAll: () => pool.query('SELECT * FROM resources ORDER BY id ASC'),

    getAllAvailable: () => pool.query('SELECT * FROM resources WHERE is_available = TRUE ORDER BY id ASC'),

    getByIds: (client: PoolClient, ids: number[]) => 
        client.query('SELECT id, cost FROM resources WHERE id = ANY($1) AND is_available = TRUE', [ids]),

    create: (name: string, type: string, cost: number, is_available: boolean) => 
        pool.query(
            'INSERT INTO resources (name, type, cost, is_available) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, type, cost, is_available]
        ),

    update: (id: string, name: string, type: string, cost: number, is_available: boolean) => 
        pool.query(
            'UPDATE resources SET name = $1, type = $2, cost = $3, is_available = $4 WHERE id = $5 RETURNING *',
            [name, type, cost, is_available, id]
        ),

    delete: (id: string) => pool.query('DELETE FROM resources WHERE id = $1 RETURNING *', [id])
};

export const OrderDB = {
    getAll: () => pool.query(`
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

    getByUserId: (userId: string) => pool.query(`
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

    getById: (client: PoolClient, id: string) =>
        client.query('SELECT * FROM orders WHERE id = $1', [id]),

    getResourceIdsByOrderId: (client: PoolClient, orderId: string) =>
        client.query('SELECT resource_id FROM order_resources WHERE order_id = $1', [orderId]),

    create: (client: PoolClient, user_id: number, service_id: number, event_date: string, end_date: string, total: number, status: string) => 
        client.query(
            'INSERT INTO orders (user_id, service_id, event_date, end_date, total_cost, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, service_id, event_date, end_date, total, status]
        ),

    addResource: (client: PoolClient, order_id: number, resource_id: number) => 
        client.query('INSERT INTO order_resources (order_id, resource_id) VALUES ($1, $2)', [order_id, resource_id]),

    updateStatus: (id: string, status: string) => 
        pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]),

    updateStatusTx: (client: PoolClient, id: string, status: string) => 
        client.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]),

    updateOrderDetails: (id: string, event_date: string, end_date: string, total_cost: number) => 
        pool.query(
            'UPDATE orders SET event_date = $1, end_date = $2, total_cost = $3 WHERE id = $4 RETURNING *', 
            [event_date, end_date, total_cost, id]
        ),

    getUserIdByOrderId: (client: PoolClient, id: string) => 
        client.query('SELECT user_id FROM orders WHERE id = $1', [id]),

    countAll: () => pool.query('SELECT COUNT(*) FROM orders'),

    countByDateRange: (startDate: Date, endDate: Date) => 
        pool.query('SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at < $2', [startDate, endDate]),

    getTotalRevenue: () => pool.query("SELECT SUM(total_cost) FROM orders WHERE status IN ('paid', 'completed')"),

    getRevenueByDateRange: (startDate: Date, endDate: Date) => 
        pool.query("SELECT SUM(total_cost) FROM orders WHERE status IN ('paid', 'completed') AND created_at >= $1 AND created_at < $2", [startDate, endDate]),

    getOrdersCountByService: () => 
        pool.query('SELECT service_id, COUNT(*) as count FROM orders GROUP BY service_id'),

    getTopServicesByRevenue: (startDate: Date, endDate: Date) => pool.query(`
        SELECT s.name, SUM(o.total_cost) as revenue, COUNT(o.id) as count
        FROM orders o
        JOIN services s ON o.service_id = s.id
        WHERE o.status IN ('paid', 'completed') AND o.created_at >= $1 AND o.created_at < $2
        GROUP BY s.name
        ORDER BY revenue DESC
        LIMIT 5
    `, [startDate, endDate]),

    getRevenueByType: (startDate: Date, endDate: Date) => pool.query(`
        SELECT s.type, SUM(o.total_cost) as revenue
        FROM orders o
        JOIN services s ON o.service_id = s.id
        WHERE o.status IN ('paid', 'completed') AND o.created_at >= $1 AND o.created_at < $2
        GROUP BY s.type
    `, [startDate, endDate]),

    getTopClients: (startDate: Date, endDate: Date) => pool.query(`
        SELECT u.first_name, u.last_name, u.email, SUM(o.total_cost) as total_spent, COUNT(o.id) as orders_count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.status IN ('paid', 'completed') AND o.created_at >= $1 AND o.created_at < $2
        GROUP BY u.id
        ORDER BY total_spent DESC
        LIMIT 5
    `, [startDate, endDate]),

    getTopResources: (startDate: Date, endDate: Date) => pool.query(`
        SELECT r.name, r.type, COUNT(orr.resource_id) as usage_count
        FROM order_resources orr
        JOIN orders o ON orr.order_id = o.id
        JOIN resources r ON orr.resource_id = r.id
        WHERE o.created_at >= $1 AND o.created_at < $2
        GROUP BY r.id, r.name, r.type
        ORDER BY usage_count DESC
        LIMIT 5
    `, [startDate, endDate]),

    getDailyRevenue: (startDate: Date, endDate: Date) => pool.query(`
        SELECT DATE(created_at) as date, SUM(total_cost) as revenue
        FROM orders
        WHERE status IN ('paid', 'completed') AND created_at >= $1 AND created_at < $2
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `, [startDate, endDate]),

    getFirstOrderDate: () => pool.query('SELECT MIN(created_at) as first_date FROM orders')
};

export const ServiceViewsDB = {
    create: (serviceId: number, userId: number) => 
        pool.query('INSERT INTO service_views (service_id, user_id) VALUES ($1, $2)', [serviceId, userId]),

    countAll: () => pool.query('SELECT COUNT(*) FROM service_views'),

    countByDateRange: (startDate: Date, endDate: Date) => 
        pool.query('SELECT COUNT(*) FROM service_views WHERE viewed_at >= $1 AND viewed_at < $2', [startDate, endDate]),

    getViewsCountByService: () => 
        pool.query('SELECT service_id, COUNT(*) as count FROM service_views GROUP BY service_id')
};

export const PaymentDB = {
    create: (order_id: number, amount: number) => 
        pool.query("INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, 'pending')", [order_id, amount])
};

export const runTransaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};