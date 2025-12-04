import { Request, Response } from 'express';
import pgPool from '../config/postgres'; 
import redisClient from '../config/redis';

// --- Константи для кешування ---
const SERVICES_CACHE_KEY = 'catalog:services_list';
const RESOURCES_CACHE_KEY = 'catalog:resources_list';
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
        const result = await pgPool.query('SELECT * FROM services'); 
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
        const cachedResources = await redisClient.get(RESOURCES_CACHE_KEY); 
        if (cachedResources) {
            console.log('Serving resources from Redis cache.');
            return res.json(JSON.parse(cachedResources));
        }

        console.log('Resources cache miss. Querying PostgreSQL.');
        const result = await pgPool.query('SELECT * FROM resources'); 
        const resources = result.rows;

        if (resources.length > 0) {
            await redisClient.setEx(
                RESOURCES_CACHE_KEY,
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
    const { name, base_price, type } = req.body;
    try {
        const result = await pgPool.query(
            'INSERT INTO services (name, base_price, type) VALUES ($1, $2, $3) RETURNING *',
            [name, base_price, type || 'other']
        );
        await redisClient.del(SERVICES_CACHE_KEY);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Метод 4: Оновлення послуги (Інвалідація)
export const patchService = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, base_price, type } = req.body;
    try {
        const result = await pgPool.query(
            'UPDATE services SET name = $1, base_price = $2, type = COALESCE($3, type) WHERE id = $4 RETURNING *',
            [name, base_price, type, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Not found' });
        
        await redisClient.del(SERVICES_CACHE_KEY); // Видалення старого кешу
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Метод 5: Створення ресурсу (Інвалідація)
export const createResource = async (req: Request, res: Response) => {
    const { name, type, cost } = req.body;
    try {
        const result = await pgPool.query(
            'INSERT INTO resources (name, type, cost) VALUES ($1, $2, $3) RETURNING *',
            [name, type, cost]
        );
        await redisClient.del(RESOURCES_CACHE_KEY); 
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /services/:id
export const deleteService = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pgPool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        await redisClient.del(SERVICES_CACHE_KEY);
        res.json({ message: 'Service deleted' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// DELETE /resources/:id
export const deleteResource = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pgPool.query('DELETE FROM resources WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        await redisClient.del(RESOURCES_CACHE_KEY);
        res.json({ message: 'Resource deleted' });
    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};