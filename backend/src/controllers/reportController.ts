import { Request, Response } from 'express';

export const getReports = async (req: Request, res: Response) => {
    res.json({ message: 'Get reports' });
};
