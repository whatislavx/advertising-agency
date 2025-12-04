import { Request, Response } from 'express';
import Report from '../models/Report';
import { OrderDB } from '../db/postgres';

// Метод 1: Створення звіту
// POST /reports
export const createReport = async (req: Request, res: Response) => {
    try {
        const { type, period, data, managerId } = req.body;

        // Створення документу в MongoDB
        const report = new Report({
            type,
            period,
            generatedData: data, // JSON-об'єкт будь-якої структури
            managerId
        });

        await report.save(); 

        res.status(200).json({ success: true, id: report._id });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ message: 'Error creating report' });
    }
};

// Метод 2: Отримання списку (Архів)
// GET /reports
export const getReports = async (req: Request, res: Response) => {
    try {
        const reports = await Report.find()
            .select('-generatedData') 
            .sort({ createdAt: -1 }); // Нові зверху

        res.json(reports);
    } 
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Error fetching reports' });
    }
};

// Метод 3: Перегляд деталей
// GET /reports/:id
export const getReportById = async (req: Request, res: Response) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json(report);
    } 
    catch (error) {
        console.error('Error fetching report details:', error);
        res.status(500).json({ message: 'Error fetching report details' });
    }
};

// Метод 4: Dashboard Stats
// GET /dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // Total Orders
        const ordersResult = await OrderDB.countAll();
        const totalOrders = parseInt(ordersResult.rows[0].count);

        // Total Revenue (sum of total_cost of paid/completed orders)
        const revenueResult = await OrderDB.getTotalRevenue();
        const totalRevenue = parseFloat(revenueResult.rows[0].sum || '0');

        // Total Views (Mocked for now, or fetch from Mongo if implemented)
        const totalViews = 254000; // Placeholder

        res.json({
            totalOrders,
            totalRevenue,
            totalViews
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};