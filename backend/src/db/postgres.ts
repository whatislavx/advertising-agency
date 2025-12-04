import pool from '../config/postgres';
import { PoolClient } from 'pg';

export const UserDB = {
    getAll: () => pool.query('SELECT id, email, role, first_name, last_name, personal_discount FROM users'),
    
    getById: (id: string) => pool.query(`
        SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.personal_discount, u.registration_date,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
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

    updateDiscount: (id: string, discount: number) => 
        pool.query(
            'UPDATE users SET personal_discount = $1 WHERE id = $2 RETURNING personal_discount',
            [discount, id]
        ),

    incrementOrderCount: (client: PoolClient, id: number) => 
        client.query("UPDATE users SET order_count = order_count + 1 WHERE id = $1", [id]),

    getPasswordHashById: (id: string) => 
        pool.query('SELECT password_hash FROM users WHERE id = $1', [id])
};

export const ServiceDB = {
    getAll: () => pool.query('SELECT * FROM services'),

    getById: (client: PoolClient, id: number) => 
        client.query('SELECT base_price FROM services WHERE id = $1', [id]),

    create: (name: string, base_price: number, type: string) => 
        pool.query(
            'INSERT INTO services (name, base_price, type) VALUES ($1, $2, $3) RETURNING *',
            [name, base_price, type || 'other']
        ),

    update: (id: string, name: string, base_price: number, type: string) => 
        pool.query(
            'UPDATE services SET name = $1, base_price = $2, type = COALESCE($3, type) WHERE id = $4 RETURNING *',
            [name, base_price, type, id]
        ),

    delete: (id: string) => pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id])
};

export const ResourceDB = {
    getAll: () => pool.query('SELECT * FROM resources'),

    getByIds: (client: PoolClient, ids: number[]) => 
        client.query('SELECT id, cost FROM resources WHERE id = ANY($1)', [ids]),

    create: (name: string, type: string, cost: number) => 
        pool.query(
            'INSERT INTO resources (name, type, cost) VALUES ($1, $2, $3) RETURNING *',
            [name, type, cost]
        ),

    delete: (id: string) => pool.query('DELETE FROM resources WHERE id = $1 RETURNING *', [id])
};

export const OrderDB = {
    getAll: () => pool.query(`
        SELECT o.*, u.email as user_email, s.name as service_name 
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

    updateDate: (id: string, newDate: string) => 
        pool.query('UPDATE orders SET event_date = $1 WHERE id = $2 RETURNING *', [newDate, id]),

    getUserIdByOrderId: (client: PoolClient, id: string) => 
        client.query('SELECT user_id FROM orders WHERE id = $1', [id]),

    countAll: () => pool.query('SELECT COUNT(*) FROM orders'),

    getTotalRevenue: () => pool.query("SELECT SUM(total_cost) FROM orders WHERE status IN ('paid', 'completed')")
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
