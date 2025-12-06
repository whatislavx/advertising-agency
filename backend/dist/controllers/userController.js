"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDiscount = exports.changePassword = exports.updateUser = exports.register = exports.login = exports.getUserById = exports.getUsers = void 0;
const postgres_1 = require("../db/postgres");
const crypto_1 = __importDefault(require("crypto"));
const hashPassword = (password) => crypto_1.default.createHash('sha256').update(password).digest('hex');
// GET /users (Для адмін-панелі)
const getUsers = async (req, res) => {
    try {
        const result = await postgres_1.UserDB.getAll();
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUsers = getUsers;
// GET /users/:id (Профіль + Контакти)
const getUserById = async (req, res) => {
    try {
        // Отримуємо дані користувача та підраховуємо кількість замовлень
        const result = await postgres_1.UserDB.getById(req.params.id);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'User not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUserById = getUserById;
// POST /auth/login
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await postgres_1.UserDB.getByEmail(email);
        if (result.rows.length === 0)
            return res.status(401).json({ message: 'Invalid credentials' });
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.login = login;
// POST /auth/register
const register = async (req, res) => {
    const { email, password, first_name, last_name, phone } = req.body;
    try {
        const hashedPassword = hashPassword(password);
        // Додаємо phone згідно з
        const result = await postgres_1.UserDB.create(email, hashedPassword, 'client', first_name, last_name, phone);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Користувач з таким email вже існує' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};
exports.register = register;
// PATCH /users/:id (Оновлення контактів)
const updateUser = async (req, res) => {
    const { first_name, last_name, phone, email } = req.body;
    try {
        const result = await postgres_1.UserDB.update(req.params.id, first_name, last_name, phone, email);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUser = updateUser;
// PATCH /users/:id/password (Зміна пароля)
const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;
    try {
        // 1. Отримуємо поточний хеш пароля
        const userResult = await postgres_1.UserDB.getPasswordHashById(userId);
        if (userResult.rows.length === 0)
            return res.status(404).json({ message: 'User not found' });
        const user = userResult.rows[0];
        const oldPasswordHash = hashPassword(oldPassword);
        // 2. Перевіряємо старий пароль
        if (user.password_hash !== oldPasswordHash) {
            return res.status(401).json({ message: 'Incorrect old password' });
        }
        // 3. Оновлюємо пароль
        const newPasswordHash = hashPassword(newPassword);
        await postgres_1.UserDB.updatePassword(userId, newPasswordHash);
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.changePassword = changePassword;
// PATCH /users/:id/discount (Встановлення знижки - Тільки для Директора)
const setDiscount = async (req, res) => {
    const { discount, initiatorRole } = req.body; // initiatorRole передаємо з фронту для спрощення (в реальності - з токена)
    if (initiatorRole !== 'director') {
        return res.status(403).json({ message: 'Access denied. Only Director can set discounts.' });
    }
    try {
        const result = await postgres_1.UserDB.updateDiscount(req.params.id, discount);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.setDiscount = setDiscount;
