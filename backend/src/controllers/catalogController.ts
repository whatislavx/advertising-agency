import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ServiceDB, ResourceDB, ServiceViewsDB, runTransaction } from '../db/postgres';
import redisClient from '../config/redis';

// --- Константи для кешування ---
const SERVICES_CACHE_KEY = 'catalog:services_list';
const RESOURCES_CACHE_KEY = 'catalog:resources_list';
const RESOURCES_AVAILABLE_CACHE_KEY = 'catalog:resources_list:available';
const SERVICES_TTL = 3600; // 1 година 
const RESOURCES_TTL = 1800; // 30 хвилин

// Метод 1: Отримання послуг (Cache-Aside)
export const getAllServices = async (req: Request, res: Response) => {
    try {
        // Перевіряємо, чи це запит від менеджера (all) чи клієнта (only available)
        // Припустимо, клієнтський скрипт буде слати ?available=true
        const onlyAvailable = req.query.available === 'true';

        // Ключі кешу мають бути різні
        const cacheKey = onlyAvailable ? 'catalog:services_list:available' : 'catalog:services_list:all';

        // 1. Redis
        const cachedServices = await redisClient.get(cacheKey);
        if (cachedServices) {
            return res.json(JSON.parse(cachedServices)); 
        }

        // 2. PostgreSQL
        let result;
        if (onlyAvailable) {
            result = await ServiceDB.getAllAvailable();
        } else {
            result = await ServiceDB.getAll();
        }

        const services = result.rows;

        // 3. Запис в Redis
        if (services.length > 0) {
            await redisClient.setEx(cacheKey, SERVICES_TTL, JSON.stringify(services)); 
        }

        res.json(services);
    } catch (error) {
        console.error('Error getting services:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Метод 2: Отримання ресурсів (Cache-Aside)
export const getResources = async (req: Request, res: Response) => {
    try {
        const onlyAvailable = req.query.available === 'true';
        const cacheKey = onlyAvailable ? RESOURCES_AVAILABLE_CACHE_KEY : RESOURCES_CACHE_KEY;

        const cachedResources = await redisClient.get(cacheKey); 
        if (cachedResources) {
            console.log(`Serving resources from Redis cache (${cacheKey}).`);
            return res.json(JSON.parse(cachedResources));
        }

        console.log(`Resources cache miss (${cacheKey}). Querying PostgreSQL.`);
        const result = onlyAvailable ? await ResourceDB.getAllAvailable() : await ResourceDB.getAll();
        const resources = result.rows;

        if (resources.length > 0) {
            await redisClient.setEx(
                cacheKey,
                RESOURCES_TTL,
                JSON.stringify(resources) 
            ); 
        }

        res.json(resources);
    } catch (error) {
        console.error('Error getting resources:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Метод 3: Створення послуги (Інвалідація)
export const createService = async (req: Request, res: Response) => {
    // Отримуємо is_available (прийде як рядок 'true'/'false' через FormData)
    const { name, base_price, type, resourceIds, description, is_available } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // Конвертуємо рядок у булеве значення
    const isAvailableBool = is_available === 'true';

    let parsedResourceIds: number[] = [];
    if (resourceIds) {
        try {
            parsedResourceIds = JSON.parse(resourceIds);
        } catch (e) { parsedResourceIds = []; }
    }

    try {
        const newService = await runTransaction(async (client) => {
            // Передаємо isAvailableBool
            const result = await ServiceDB.create(client, name, base_price, type, description, imagePath, isAvailableBool);
            const serviceId = result.rows[0].id;

            if (parsedResourceIds && Array.isArray(parsedResourceIds)) {
                for (const resId of parsedResourceIds) {
                    await ServiceDB.addResource(client, serviceId, resId);
                }
            }
            return result.rows[0];
        });

        // Чистимо обидва кеші
        await redisClient.del('catalog:services_list:all');
        await redisClient.del('catalog:services_list:available');
        res.status(201).json(newService);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Метод 4: Оновлення послуги (Інвалідація)
export const patchService = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, base_price, type, resourceIds, description, is_available } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const isAvailableBool = is_available === 'true';

    let parsedResourceIds: number[] | undefined = undefined;
    if (resourceIds) {
        try {
            parsedResourceIds = JSON.parse(resourceIds);
        } catch (e) { }
    }

    try {
        const updatedService = await runTransaction(async (client) => {
            // Передаємо isAvailableBool
            const result = await ServiceDB.update(client, id, name, base_price, type, description, imagePath, isAvailableBool);
            if (result.rowCount === 0) throw new Error('Not found');

            if (parsedResourceIds !== undefined && Array.isArray(parsedResourceIds)) {
                await ServiceDB.clearResources(client, parseInt(id));
                for (const resId of parsedResourceIds) {
                    await ServiceDB.addResource(client, parseInt(id), resId);
                }
            }
            return result.rows[0];
        });

        await redisClient.del('catalog:services_list:all');
        await redisClient.del('catalog:services_list:available');
        res.json(updatedService);
    } catch (error: any) {
        console.error(error);
        if (error.message === 'Not found') return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: 'Server error' });
    }
};

export const patchResource = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, type, cost, is_available } = req.body;
    try {
        const result = await ResourceDB.update(id, name, type, cost, is_available);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        
        await redisClient.del(RESOURCES_CACHE_KEY);
        await redisClient.del(RESOURCES_AVAILABLE_CACHE_KEY);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createResource = async (req: Request, res: Response) => {
    const { name, type, cost, is_available } = req.body;
    try {
        const result = await ResourceDB.create(name, type, cost, is_available !== undefined ? is_available : true);
        await redisClient.del(RESOURCES_CACHE_KEY); 
        await redisClient.del(RESOURCES_AVAILABLE_CACHE_KEY);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteService = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await ServiceDB.delete(id);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Видалення файлу зображення
        const deletedService = result.rows[0];
        if (deletedService.image_path) {
            // image_path зберігається як "/uploads/filename.ext"
            // Видаляємо перший слеш, щоб шлях був відносним до кореня проекту
            const relativePath = deletedService.image_path.startsWith('/') 
                ? deletedService.image_path.substring(1) 
                : deletedService.image_path;
            
            const filePath = path.join(process.cwd(), relativePath);
            
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Failed to delete image file: ${filePath}`, err);
                } else {
                    console.log(`Deleted image file: ${filePath}`);
                }
            });
        }

        await redisClient.del('catalog:services_list:all');
        await redisClient.del('catalog:services_list:available');
        res.json({ message: 'Service deleted' });
    } catch (error: any) {
        console.error('Error deleting service:', error);
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Неможливо видалити послугу, оскільки вона використовується в замовленнях.' });
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const deleteResource = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await ResourceDB.delete(id);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        await redisClient.del(RESOURCES_CACHE_KEY);
        await redisClient.del(RESOURCES_AVAILABLE_CACHE_KEY);
        res.json({ message: 'Resource deleted' });
    } catch (error: any) {
        console.error('Error deleting resource:', error);
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Неможливо видалити ресурс, оскільки він використовується в замовленнях.' });
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Метод 5: Трекінг переглядів
export const trackView = async (req: Request, res: Response) => {
    const { serviceId, userId } = req.body;
    try {
        await ServiceViewsDB.create(serviceId, userId);
        res.status(200).json({ message: 'View tracked' });
    } catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({ message: 'Server error' });
    }
};