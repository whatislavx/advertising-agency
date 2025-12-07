import { login, register, changePassword } from '../../src/controllers/userController';
import { UserDB } from '../../src/db/postgres';
import { Request, Response } from 'express';
import crypto from 'crypto';

jest.mock('../../src/db/postgres');

const hashPassword = (password: string) => crypto.createHash('sha256').update(password).digest('hex');

describe('User Controller Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = { status: statusMock, json: jsonMock };
    });

    describe('register()', () => {
        it('should register a new user successfully', async () => {
            req = { body: { email: 'new@test.com', password: 'pass', role: 'client', first_name: 'John', last_name: 'Doe', phone: '123' } };
            const createdUser = { id: 1, email: 'new@test.com', role: 'client' };
            
            (UserDB.create as jest.Mock).mockResolvedValue({ rows: [createdUser] });

            await register(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(createdUser);
        });

        it('should return 409 if user already exists', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            req = { body: { email: 'exist@test.com', password: 'pass' } };
            const error: any = new Error('Duplicate');
            error.code = '23505';
            (UserDB.create as jest.Mock).mockRejectedValue(error);

            await register(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Користувач з таким email вже існує' });

            consoleSpy.mockRestore();
        });
    });

    describe('login()', () => {
        it('should authenticate user with correct credentials', async () => {
            const password = 'valid';
            const hashedPassword = hashPassword(password);
            
            req = { body: { email: 'admin@test.com', password: password } };
            (UserDB.getByEmail as jest.Mock).mockResolvedValue({
                rows: [{ id: 1, email: 'admin@test.com', password_hash: hashedPassword, role: 'admin' }]
            });

            await login(req as Request, res as Response);

            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ 
                message: 'Вхід успішний',
                user: expect.objectContaining({ email: 'admin@test.com' })
            }));
        });

        it('should deny access with incorrect password', async () => {
            const password = 'valid';
            const hashedPassword = hashPassword(password);

            req = { body: { email: 'admin@test.com', password: 'wrong' } };
            (UserDB.getByEmail as jest.Mock).mockResolvedValue({
                rows: [{ id: 1, password_hash: hashedPassword }]
            });

            await login(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Неправильна пошта або пароль' });
        });
    });

    describe('changePassword()', () => {
        it('should change password successfully', async () => {
            const oldPassword = 'old';
            const newPassword = 'new';
            const oldHash = hashPassword(oldPassword);
            const userId = '1';

            req = { 
                body: { oldPassword, newPassword },
                params: { id: userId }
            };

            (UserDB.getPasswordHashById as jest.Mock).mockResolvedValue({
                rows: [{ password_hash: oldHash }]
            });
            (UserDB.updatePassword as jest.Mock).mockResolvedValue({});

            await changePassword(req as Request, res as Response);

            expect(jsonMock).toHaveBeenCalledWith({ message: 'Пароль успішно оновлено' });
        });

        it('should return 400 if new password is same as old password', async () => {
            const oldPassword = 'same';
            const newPassword = 'same';
            const oldHash = hashPassword(oldPassword);
            const userId = '1';

            req = { 
                body: { oldPassword, newPassword },
                params: { id: userId }
            };

            (UserDB.getPasswordHashById as jest.Mock).mockResolvedValue({
                rows: [{ password_hash: oldHash }]
            });

            await changePassword(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Старий і новий паролі співпадають' });
        });
    });
});
