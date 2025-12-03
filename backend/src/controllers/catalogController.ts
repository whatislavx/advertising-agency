import { Request, Response } from 'express';

export const getCatalog = async (req: Request, res: Response) => {
    res.json({ message: 'Get catalog items' });
};
