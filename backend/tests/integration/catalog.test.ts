import request from 'supertest';
import app from '../../src/index'; 
import redisClient from '../../src/config/redis';
import { ServiceDB } from '../../src/db/postgres';


jest.mock('../../src/config/redis', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        setEx: jest.fn(),
        connect: jest.fn(),
        on: jest.fn()
    }
}));
jest.mock('../../src/db/postgres');
jest.mock('../../src/config/mongo', () => jest.fn());

describe('Integration Test: Catalog API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    // Тест-кейс 1: Отримання послуг з бази даних (Redis порожній)
    it('GET /api/services should return services from DB when cache is empty', async () => {
        const mockServices = [
            { id: 1, name: 'TV Ad', base_price: '5000.00', type: 'tv', is_available: true }
        ];

        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (ServiceDB.getAllAvailable as jest.Mock).mockResolvedValue({ rows: mockServices });

        const response = await request(app).get('/api/services?available=true');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('TV Ad');

        // Перевіряємо, що дані були записані в кеш після запиту
        expect(redisClient.setEx).toHaveBeenCalled(); 
    });

    // Тест-кейс 2: Отримання послуг з кешу Redis
    it('GET /api/services should return services from Redis cache if available', async () => {
        const cachedServices = [
            { id: 2, name: 'Instagram Ad', base_price: '2000.00', type: 'internet' }
        ];

        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedServices));

        const response = await request(app).get('/api/services?available=true');

        expect(response.status).toBe(200);
        expect(response.body[0].name).toBe('Instagram Ad');
        
        // Перевіряємо, що запит до БД НЕ виконувався
        expect(ServiceDB.getAllAvailable).not.toHaveBeenCalled(); 
    });
});