import { Request, Response } from 'express';
import pgPool from '../config/postgres';
import crypto from 'crypto';

const hashPassword = (password: string) => crypto.createHash('sha256').update(password).digest('hex');

// GET /users (Для адмін-панелі)
export const getUsers = async (req: Request, res: Response) => {
    try {
        const result = await pgPool.query('SELECT id, email, role, first_name, last_name, personal_discount FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /users/:id (Профіль + Контакти)
export const getUserById = async (req: Request, res: Response) => {
    try {
        // Отримуємо дані користувача та підраховуємо кількість замовлень
        const result = await pgPool.query(`
            SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.personal_discount, u.registration_date,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
            FROM users u 
            WHERE u.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /auth/login
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const result = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        const user = result.rows[0];
        const hashedPassword = hashPassword(password);

        if (user.password_hash !== hashedPassword) {
             return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Повертаємо дані користувача (в реальному проекті тут був би JWT токен)
        res.json({ 
            message: 'Login successful',
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role, 
                first_name: user.first_name, 
                last_name: user.last_name,
                discount: user.personal_discount 
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /auth/register
export const register = async (req: Request, res: Response) => {
    const { email, password, first_name, last_name, phone } = req.body;
    try {
        const hashedPassword = hashPassword(password);
        // Додаємо phone згідно з
        const result = await pgPool.query(
            'INSERT INTO users (email, password_hash, role, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role',
            [email, hashedPassword, 'client', first_name, last_name, phone]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Користувач з таким email вже існує' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// PATCH /users/:id (Оновлення контактів)
export const updateUser = async (req: Request, res: Response) => {
    const { first_name, last_name, phone, email } = req.body;
    try {
        const result = await pgPool.query(
            'UPDATE users SET first_name = $1, last_name = $2, phone = $3, email = $4 WHERE id = $5 RETURNING *',
            [first_name, last_name, phone, email, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PATCH /users/:id/password (Зміна пароля)
export const changePassword = async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;

    try {
        // 1. Отримуємо поточний хеш пароля
        const userResult = await pgPool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = userResult.rows[0];
        const oldPasswordHash = hashPassword(oldPassword);

        // 2. Перевіряємо старий пароль
        if (user.password_hash !== oldPasswordHash) {
            return res.status(401).json({ message: 'Incorrect old password' });
        }

        // 3. Оновлюємо пароль
        const newPasswordHash = hashPassword(newPassword);
        await pgPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PATCH /users/:id/discount (Встановлення знижки - Тільки для Директора)
export const setDiscount = async (req: Request, res: Response) => {
    const { discount, initiatorRole } = req.body; // initiatorRole передаємо з фронту для спрощення (в реальності - з токена)
    
    if (initiatorRole !== 'director') {
        return res.status(403).json({ message: 'Access denied. Only Director can set discounts.' });
    }

    try {
        const result = await pgPool.query(
            'UPDATE users SET personal_discount = $1 WHERE id = $2 RETURNING personal_discount',
            [discount, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};