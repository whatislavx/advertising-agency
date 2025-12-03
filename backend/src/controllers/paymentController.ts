import { Request, Response } from 'express';

export const processPayment = async (req: Request, res: Response) => {
    res.json({ message: 'Process payment' });
};
