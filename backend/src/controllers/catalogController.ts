import { Request, Response } from 'express';
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
        // 1. Redis
        const cachedServices = await redisClient.get(SERVICES_CACHE_KEY);
        if (cachedServices) {
            console.log('Serving services from Redis cache.');
            return res.json(JSON.parse(cachedServices)); 
        }

        // 2. PostgreSQL
        console.log('Services cache miss. Querying PostgreSQL.');
        const result = await ServiceDB.getAll();
        const services = result.rows;

        // 3. Запис в Redis
        if (services.length > 0) {
            await redisClient.setEx(
                SERVICES_CACHE_KEY,
                SERVICES_TTL,
                JSON.stringify(services) 
            ); 
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
    const { name, base_price, type, resourceIds } = req.body;
    try {
        const newService = await runTransaction(async (client) => {
            const result = await ServiceDB.create(client, name, base_price, type);
            const serviceId = result.rows[0].id;

            if (resourceIds && Array.isArray(resourceIds)) {
                for (const resId of resourceIds) {
                    await ServiceDB.addResource(client, serviceId, resId);
                }
            }
            return result.rows[0];
        });

        await redisClient.del(SERVICES_CACHE_KEY);
        res.status(201).json(newService);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Метод 4: Оновлення послуги (Інвалідація)
export const patchService = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, base_price, type, resourceIds } = req.body;
    try {
        const updatedService = await runTransaction(async (client) => {
            const result = await ServiceDB.update(client, id, name, base_price, type);
            if (result.rowCount === 0) throw new Error('Not found');
            
            if (resourceIds !== undefined && Array.isArray(resourceIds)) {
                await ServiceDB.clearResources(client, parseInt(id));
                for (const resId of resourceIds) {
                    await ServiceDB.addResource(client, parseInt(id), resId);
                }
            }
            return result.rows[0];
        });
        
        await redisClient.del(SERVICES_CACHE_KEY); 
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
        await redisClient.del(SERVICES_CACHE_KEY);
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