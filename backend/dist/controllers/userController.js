"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDiscount = exports.changePassword = exports.updateUser = exports.register = exports.login = exports.getUserById = exports.getUsers = void 0;
const postgres_1 = require("../db/postgres");
const crypto_1 = __importDefault(require("crypto"));
const hashPassword = (password) => crypto_1.default.createHash('sha256').update(password).digest('hex');

const getUsers = async (req, res) => {
    try {
        const result = await postgres_1.UserDB.getAll();
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.getUsers = getUsers;

const getUserById = async (req, res) => {
    try {

        const result = await postgres_1.UserDB.getById(req.params.id);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Користувача не знайдено' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.getUserById = getUserById;

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await postgres_1.UserDB.getByEmail(email);
        if (result.rows.length === 0)
            return res.status(401).json({ message: 'Неправильна пошта або пароль' });
        const user = result.rows[0];
        const hashedPassword = hashPassword(password);
        if (user.password_hash !== hashedPassword) {
            return res.status(401).json({ message: 'Неправильна пошта або пароль' });
        }

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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.login = login;

const register = async (req, res) => {
    const { email, password, first_name, last_name, phone } = req.body;
    try {
        const hashedPassword = hashPassword(password);

        const result = await postgres_1.UserDB.create(email, hashedPassword, 'client', first_name, last_name, phone);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Користувач з таким email вже існує' });
        }
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.register = register;

const updateUser = async (req, res) => {
    const { first_name, last_name, phone, email } = req.body;
    try {
        const result = await postgres_1.UserDB.update(req.params.id, first_name, last_name, phone, email);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.updateUser = updateUser;

const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;
    try {

        const userResult = await postgres_1.UserDB.getPasswordHashById(userId);
        if (userResult.rows.length === 0)
            return res.status(404).json({ message: 'Користувача не знайдено' });
        const user = userResult.rows[0];
        const oldPasswordHash = hashPassword(oldPassword);

        if (user.password_hash !== oldPasswordHash) {
            return res.status(401).json({ message: 'Неправильний старий пароль' });
        }
        if (oldPassword === newPassword) {
            return res.status(400).json({ message: 'Старий і новий паролі співпадають' });
        }

        const newPasswordHash = hashPassword(newPassword);
        await postgres_1.UserDB.updatePassword(userId, newPasswordHash);
        res.json({ message: 'Пароль успішно оновлено' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.changePassword = changePassword;

const setDiscount = async (req, res) => {
    const { discount, initiatorRole } = req.body; 

    if (initiatorRole !== 'director') {
        return res.status(403).json({ message: 'Доступ заборонено. Тільки директор може встановлювати знижки.' });
    }
    try {
        const result = await postgres_1.UserDB.updateDiscount(req.params.id, discount);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.setDiscount = setDiscount;

