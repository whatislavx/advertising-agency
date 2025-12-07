import { createOrder } from '../../src/controllers/orderController';
import { ServiceDB, ResourceDB, OrderDB, runTransaction } from '../../src/db/postgres';
import { Request, Response } from 'express';

jest.mock('../../src/db/postgres');

describe('Unit Test: OrderController Logic', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseObject: any;

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {}); 
        
        mockRequest = {
            body: {
                user_id: 1,
                service_id: 1,
                event_date: '2025-10-01',
                end_date: '2025-10-05', 
                resources: [1, 2]
            }
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockImplementation((result) => {
                responseObject = result;
            })
        };

        (runTransaction as jest.Mock).mockImplementation(async (cb) => await cb({})); 
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should calculate total cost correctly and create order', async () => {
        // Базова ціна послуги = 10000 грн
        (ServiceDB.getById as jest.Mock).mockResolvedValue({ 
            rows: [{ base_price: 10000 }] 
        });

        // Ціни ресурсів: 2000 + 3000 = 5000 грн
        (ResourceDB.getByIds as jest.Mock).mockResolvedValue({ 
            rows: [{ cost: 2000 }, { cost: 3000 }] 
        });

        // Створення замовлення
        (OrderDB.create as jest.Mock).mockResolvedValue({ 
            rows: [{ id: 101 }] 
        });

        // Виконання методу
        await createOrder(mockRequest as Request, mockResponse as Response);

        // Перевірка 
        // Розрахунок: (10000 послуга + 5000 ресурси) * 5 днів = 75000
        const expectedTotal = 75000;

        expect(OrderDB.create).toHaveBeenCalledWith(
            expect.anything(), 
            1, 
            1, 
            '2025-10-01',
            '2025-10-05',
            expectedTotal, 
            'new'
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(responseObject).toEqual({
            message: 'Order created',
            orderId: 101,
            total: expectedTotal
        });
    });

    it('should return error for invalid date range', async () => {
        mockRequest.body.end_date = '2025-09-01'; 
        (ServiceDB.getById as jest.Mock).mockResolvedValue({ rows: [{ base_price: 1000 }] });

        await createOrder(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500); 
    });
});
