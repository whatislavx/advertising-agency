import { Request, Response } from 'express';
import { UserDB } from '../db/postgres';
import crypto from 'crypto';

const hashPassword = (password: string) => crypto.createHash('sha256').update(password).digest('hex');

// GET /users (Для адмін-панелі)
export const getUsers = async (req: Request, res: Response) => {
    try {
        const result = await UserDB.getAll();
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

// GET /users/:id (Профіль + Контакти)
export const getUserById = async (req: Request, res: Response) => {
    try {
        // Отримуємо дані користувача та підраховуємо кількість замовлень
        const result = await UserDB.getById(req.params.id);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Користувача не знайдено' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

// POST /auth/login
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const result = await UserDB.getByEmail(email);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Неправильна пошта або пароль' });

        const user = result.rows[0];
        const hashedPassword = hashPassword(password);

        if (user.password_hash !== hashedPassword) {
             return res.status(401).json({ message: 'Неправильна пошта або пароль' });
        }
        
        // Повертаємо дані користувача (в реальному проекті тут був би JWT токен)
        res.json({ 
            message: 'Вхід успішний',
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
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

// POST /auth/register
export const register = async (req: Request, res: Response) => {
    const { email, password, first_name, last_name, phone } = req.body;
    try {
        const hashedPassword = hashPassword(password);
        // Додаємо phone згідно з
        const result = await UserDB.create(email, hashedPassword, 'client', first_name, last_name, phone);
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Користувач з таким email вже існує' });
        }
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

// PATCH /users/:id (Оновлення контактів)
export const updateUser = async (req: Request, res: Response) => {
    const { first_name, last_name, phone, email } = req.body;
    try {
        const result = await UserDB.update(req.params.id, first_name, last_name, phone, email);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

// PATCH /users/:id/password (Зміна пароля)
export const changePassword = async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;

    try {
        // 1. Отримуємо поточний хеш пароля
        const userResult = await UserDB.getPasswordHashById(userId);
        if (userResult.rows.length === 0) return res.status(404).json({ message: 'Користувача не знайдено' });

        const user = userResult.rows[0];
        const oldPasswordHash = hashPassword(oldPassword);

        // 2. Перевіряємо старий пароль
        if (user.password_hash !== oldPasswordHash) {
            return res.status(401).json({ message: 'Неправильний старий пароль' });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: 'Старий і новий паролі співпадають' });
        }

        // 3. Оновлюємо пароль
        const newPasswordHash = hashPassword(newPassword);
        await UserDB.updatePassword(userId, newPasswordHash);

        res.json({ message: 'Пароль успішно оновлено' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

// PATCH /users/:id/discount (Встановлення знижки - Тільки для Директора)
export const setDiscount = async (req: Request, res: Response) => {
    const { discount, initiatorRole } = req.body; // initiatorRole передаємо з фронту для спрощення (в реальності - з токена)
    
    if (initiatorRole !== 'director') {
        return res.status(403).json({ message: 'Доступ заборонено. Тільки директор може встановлювати знижки.' });
    }

    try {
        const result = await UserDB.updateDiscount(req.params.id, discount);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};