import { Request, Response } from 'express';

export const getOrders = async (req: Request, res: Response) => {
    res.json({ message: 'Get all orders' });
};

export const createOrder = async (req: Request, res: Response) => {
    res.json({ message: 'Create new order' });
};
