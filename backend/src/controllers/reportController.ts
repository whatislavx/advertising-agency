import { Request, Response } from 'express';
import Report from '../models/Report';
import { OrderDB, ServiceDB, ServiceViewsDB } from '../db/postgres';

// Helper to calculate percentage change
const calculateChange = (current: number, previous: number): string | null => {
    if (previous === 0) return null; // Return null to indicate "dash"
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
};

// GET /dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // 1. Total Stats (All Time)
        const totalOrdersRes = await OrderDB.countAll();
        const totalRevenueRes = await OrderDB.getTotalRevenue();
        const totalViewsRes = await ServiceViewsDB.countAll();

        const totalOrders = parseInt(totalOrdersRes.rows[0].count);
        const totalRevenue = parseFloat(totalRevenueRes.rows[0].sum || '0');
        const totalViews = parseInt(totalViewsRes.rows[0].count);

        // 2. Monthly Changes
        // This Month
        const thisMonthOrdersRes = await OrderDB.countByDateRange(startOfThisMonth, now);
        const thisMonthRevenueRes = await OrderDB.getRevenueByDateRange(startOfThisMonth, now);
        const thisMonthViewsRes = await ServiceViewsDB.countByDateRange(startOfThisMonth, now);

        const thisMonthOrders = parseInt(thisMonthOrdersRes.rows[0].count);
        const thisMonthRevenue = parseFloat(thisMonthRevenueRes.rows[0].sum || '0');
        const thisMonthViews = parseInt(thisMonthViewsRes.rows[0].count);

        // Last Month
        const lastMonthOrdersRes = await OrderDB.countByDateRange(startOfLastMonth, startOfThisMonth);
        const lastMonthRevenueRes = await OrderDB.getRevenueByDateRange(startOfLastMonth, startOfThisMonth);
        const lastMonthViewsRes = await ServiceViewsDB.countByDateRange(startOfLastMonth, startOfThisMonth);

        const lastMonthOrders = parseInt(lastMonthOrdersRes.rows[0].count);
        const lastMonthRevenue = parseFloat(lastMonthRevenueRes.rows[0].sum || '0');
        const lastMonthViews = parseInt(lastMonthViewsRes.rows[0].count);

        // 3. Efficiency Report (Table Data)
        const servicesRes = await ServiceDB.getAll();
        const viewsByServiceRes = await ServiceViewsDB.getViewsCountByService();
        const ordersByServiceRes = await OrderDB.getOrdersCountByService();

        console.log('Services found:', servicesRes.rows.length);
        console.log('Views stats:', viewsByServiceRes.rows);
        console.log('Orders stats:', ordersByServiceRes.rows);

        const services = servicesRes.rows.map(service => {
            const viewsRow = viewsByServiceRes.rows.find((r: any) => r.service_id == service.id);
            const ordersRow = ordersByServiceRes.rows.find((r: any) => r.service_id == service.id);
            
            const views = viewsRow ? parseInt(viewsRow.count) : 0;
            const orders = ordersRow ? parseInt(ordersRow.count) : 0;
            const conversion = views > 0 ? ((orders / views) * 100).toFixed(1) : '0.0';

            return {
                id: service.id,
                name: service.name,
                views,
                orders,
                conversion
            };
        });

        res.json({
            totalOrders,
            totalRevenue,
            totalViews,
            changes: {
                orders: calculateChange(thisMonthOrders, lastMonthOrders),
                revenue: calculateChange(thisMonthRevenue, lastMonthRevenue),
                views: calculateChange(thisMonthViews, lastMonthViews)
            },
            services
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

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

