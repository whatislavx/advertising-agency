"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackView = exports.deleteResource = exports.deleteService = exports.createResource = exports.patchResource = exports.patchService = exports.createService = exports.getResources = exports.getAllServices = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const postgres_1 = require("../db/postgres");
const redis_1 = __importDefault(require("../config/redis"));
// --- Константи для кешування ---
const SERVICES_CACHE_KEY = 'catalog:services_list';
const RESOURCES_CACHE_KEY = 'catalog:resources_list';
const RESOURCES_AVAILABLE_CACHE_KEY = 'catalog:resources_list:available';
const SERVICES_TTL = 3600; // 1 година 
const RESOURCES_TTL = 1800; // 30 хвилин
// Метод 1: Отримання послуг (Cache-Aside)
const getAllServices = async (req, res) => {
    try {
        // Перевіряємо, чи це запит від менеджера (all) чи клієнта (only available)
        // Припустимо, клієнтський скрипт буде слати ?available=true
        const onlyAvailable = req.query.available === 'true';
        // Ключі кешу мають бути різні
        const cacheKey = onlyAvailable ? 'catalog:services_list:available' : 'catalog:services_list:all';
        // 1. Redis
        const cachedServices = await redis_1.default.get(cacheKey);
        if (cachedServices) {
            return res.json(JSON.parse(cachedServices));
        }
        // 2. PostgreSQL
        let result;
        if (onlyAvailable) {
            result = await postgres_1.ServiceDB.getAllAvailable();
        }
        else {
            result = await postgres_1.ServiceDB.getAll();
        }
        const services = result.rows;
        // 3. Запис в Redis
        if (services.length > 0) {
            await redis_1.default.setEx(cacheKey, SERVICES_TTL, JSON.stringify(services));
        }
        res.json(services);
    }
    catch (error) {
        console.error('Error getting services:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.getAllServices = getAllServices;
// Метод 2: Отримання ресурсів (Cache-Aside)
const getResources = async (req, res) => {
    try {
        const onlyAvailable = req.query.available === 'true';
        const cacheKey = onlyAvailable ? RESOURCES_AVAILABLE_CACHE_KEY : RESOURCES_CACHE_KEY;
        const cachedResources = await redis_1.default.get(cacheKey);
        if (cachedResources) {
            console.log(`Serving resources from Redis cache (${cacheKey}).`);
            return res.json(JSON.parse(cachedResources));
        }
        console.log(`Resources cache miss (${cacheKey}). Querying PostgreSQL.`);
        const result = onlyAvailable ? await postgres_1.ResourceDB.getAllAvailable() : await postgres_1.ResourceDB.getAll();
        const resources = result.rows;
        if (resources.length > 0) {
            await redis_1.default.setEx(cacheKey, RESOURCES_TTL, JSON.stringify(resources));
        }
        res.json(resources);
    }
    catch (error) {
        console.error('Error getting resources:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.getResources = getResources;
// Метод 3: Створення послуги (Інвалідація)
const createService = async (req, res) => {
    // Отримуємо is_available (прийде як рядок 'true'/'false' через FormData)
    const { name, base_price, type, resourceIds, description, is_available } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    // Конвертуємо рядок у булеве значення
    const isAvailableBool = is_available === 'true';
    let parsedResourceIds = [];
    if (resourceIds) {
        try {
            parsedResourceIds = JSON.parse(resourceIds);
        }
        catch (e) {
            parsedResourceIds = [];
        }
    }
    try {
        const newService = await (0, postgres_1.runTransaction)(async (client) => {
            // Передаємо isAvailableBool
            const result = await postgres_1.ServiceDB.create(client, name, base_price, type, description, imagePath, isAvailableBool);
            const serviceId = result.rows[0].id;
            if (parsedResourceIds && Array.isArray(parsedResourceIds)) {
                for (const resId of parsedResourceIds) {
                    await postgres_1.ServiceDB.addResource(client, serviceId, resId);
                }
            }
            return result.rows[0];
        });
        // Чистимо обидва кеші
        await redis_1.default.del('catalog:services_list:all');
        await redis_1.default.del('catalog:services_list:available');
        res.status(201).json(newService);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.createService = createService;
// Метод 4: Оновлення послуги (Інвалідація)
const patchService = async (req, res) => {
    const { id } = req.params;
    const { name, base_price, type, resourceIds, description, is_available } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const isAvailableBool = is_available === 'true';
    let parsedResourceIds = undefined;
    if (resourceIds) {
        try {
            parsedResourceIds = JSON.parse(resourceIds);
        }
        catch (e) { }
    }
    try {
        const updatedService = await (0, postgres_1.runTransaction)(async (client) => {
            // Передаємо isAvailableBool
            const result = await postgres_1.ServiceDB.update(client, id, name, base_price, type, description, imagePath, isAvailableBool);
            if (result.rowCount === 0)
                throw new Error('Not found');
            if (parsedResourceIds !== undefined && Array.isArray(parsedResourceIds)) {
                await postgres_1.ServiceDB.clearResources(client, parseInt(id));
                for (const resId of parsedResourceIds) {
                    await postgres_1.ServiceDB.addResource(client, parseInt(id), resId);
                }
            }
            return result.rows[0];
        });
        await redis_1.default.del('catalog:services_list:all');
        await redis_1.default.del('catalog:services_list:available');
        res.json(updatedService);
    }
    catch (error) {
        console.error(error);
        if (error.message === 'Not found')
            return res.status(404).json({ message: 'Не знайдено' });
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.patchService = patchService;
const patchResource = async (req, res) => {
    const { id } = req.params;
    const { name, type, cost, is_available } = req.body;
    try {
        const result = await postgres_1.ResourceDB.update(id, name, type, cost, is_available);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ресурс не знайдено' });
        }
        await redis_1.default.del(RESOURCES_CACHE_KEY);
        await redis_1.default.del(RESOURCES_AVAILABLE_CACHE_KEY);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.patchResource = patchResource;
const createResource = async (req, res) => {
    const { name, type, cost, is_available } = req.body;
    try {
        const result = await postgres_1.ResourceDB.create(name, type, cost, is_available !== undefined ? is_available : true);
        await redis_1.default.del(RESOURCES_CACHE_KEY);
        await redis_1.default.del(RESOURCES_AVAILABLE_CACHE_KEY);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.createResource = createResource;
const deleteService = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await postgres_1.ServiceDB.delete(id);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Послугу не знайдено' });
        }
        // Видалення файлу зображення
        const deletedService = result.rows[0];
        if (deletedService.image_path) {
            // image_path зберігається як "/uploads/filename.ext"
            // Видаляємо перший слеш, щоб шлях був відносним до кореня проекту
            const relativePath = deletedService.image_path.startsWith('/')
                ? deletedService.image_path.substring(1)
                : deletedService.image_path;
            const filePath = path_1.default.join(process.cwd(), relativePath);
            fs_1.default.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Failed to delete image file: ${filePath}`, err);
                }
                else {
                    console.log(`Deleted image file: ${filePath}`);
                }
            });
        }
        await redis_1.default.del('catalog:services_list:all');
        await redis_1.default.del('catalog:services_list:available');
        res.json({ message: 'Послугу видалено' });
    }
    catch (error) {
        console.error('Error deleting service:', error);
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Неможливо видалити послугу, оскільки вона використовується в замовленнях.' });
        }
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.deleteService = deleteService;
const deleteResource = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await postgres_1.ResourceDB.delete(id);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ресурс не знайдено' });
        }
        await redis_1.default.del(RESOURCES_CACHE_KEY);
        await redis_1.default.del(RESOURCES_AVAILABLE_CACHE_KEY);
        res.json({ message: 'Ресурс видалено' });
    }
    catch (error) {
        console.error('Error deleting resource:', error);
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Неможливо видалити ресурс, оскільки він використовується в замовленнях.' });
        }
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.deleteResource = deleteResource;
// Метод 5: Трекінг переглядів
const trackView = async (req, res) => {
    const { serviceId, userId } = req.body;
    try {
        await postgres_1.ServiceViewsDB.create(serviceId, userId);
        res.status(200).json({ message: 'Перегляд зараховано' });
    }
    catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.trackView = trackView;
