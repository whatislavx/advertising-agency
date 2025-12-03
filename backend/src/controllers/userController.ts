import { Request, Response } from 'express';

export const getUsers = async (req: Request, res: Response) => {
    res.json({ message: 'Get all users' });
};

export const getUserById = async (req: Request, res: Response) => {
    res.json({ message: `Get user with id ${req.params.id}` });
};
