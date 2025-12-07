import { UserDB } from '../../src/db/postgres';
import { PoolClient } from 'pg';

const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
} as unknown as PoolClient;

describe('Discount System Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkAndApplyDiscount', () => {
        const userId = 1;

        it('should set discount to 0% when orders <= 3', async () => {

            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 0, monthly_order_count: 3 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(1);
            expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.anything());
        });

        it('should upgrade discount to 5% when orders > 3', async () => {

            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 0, monthly_order_count: 4 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(2);
            expect(mockClient.query).toHaveBeenLastCalledWith(
                expect.stringContaining('UPDATE users SET personal_discount = $1'),
                [5, userId]
            );
        });

        it('should upgrade discount to 10% when orders > 10', async () => {

            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 5, monthly_order_count: 11 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(2);
            expect(mockClient.query).toHaveBeenLastCalledWith(
                expect.stringContaining('UPDATE users SET personal_discount = $1'),
                [10, userId]
            );
        });

        it('should upgrade discount to 20% when orders > 20', async () => {

            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 10, monthly_order_count: 21 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(2);
            expect(mockClient.query).toHaveBeenLastCalledWith(
                expect.stringContaining('UPDATE users SET personal_discount = $1'),
                [20, userId]
            );
        });

        it('should downgrade discount if order count drops (e.g. new month)', async () => {

            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 20, monthly_order_count: 2 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(2);
            expect(mockClient.query).toHaveBeenLastCalledWith(
                expect.stringContaining('UPDATE users SET personal_discount = $1'),
                [0, userId]
            );
        });

        it('should not update if calculated discount matches current discount', async () => {

            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 5, monthly_order_count: 5 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(1);
        });

        it('should handle edge case: exactly 10 orders (remains 5%)', async () => {
            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 5, monthly_order_count: 10 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(1);
        });

        it('should handle edge case: exactly 20 orders (remains 10%)', async () => {
            (mockClient.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ personal_discount: 10, monthly_order_count: 20 }]
            });

            await UserDB.checkAndApplyDiscount(mockClient, userId);

            expect(mockClient.query).toHaveBeenCalledTimes(1);
        });
    });
});

