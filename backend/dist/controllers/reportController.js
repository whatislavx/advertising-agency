"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportById = exports.getReports = exports.createReport = exports.getDashboardStats = void 0;
const Report_1 = __importDefault(require("../models/Report"));
const postgres_1 = require("../db/postgres");
// Helper to calculate percentage change
const calculateChange = (current, previous) => {
    if (previous === 0)
        return null; // Return null to indicate "dash"
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
};
// GET /dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // 1. Total Stats (All Time)
        const totalOrdersRes = await postgres_1.OrderDB.countAll();
        const totalRevenueRes = await postgres_1.OrderDB.getTotalRevenue();
        const totalViewsRes = await postgres_1.ServiceViewsDB.countAll();
        const totalOrders = parseInt(totalOrdersRes.rows[0].count);
        const totalRevenue = parseFloat(totalRevenueRes.rows[0].sum || '0');
        const totalViews = parseInt(totalViewsRes.rows[0].count);
        // 2. Monthly Changes
        // This Month
        const thisMonthOrdersRes = await postgres_1.OrderDB.countByDateRange(startOfThisMonth, now);
        const thisMonthRevenueRes = await postgres_1.OrderDB.getRevenueByDateRange(startOfThisMonth, now);
        const thisMonthViewsRes = await postgres_1.ServiceViewsDB.countByDateRange(startOfThisMonth, now);
        const thisMonthOrders = parseInt(thisMonthOrdersRes.rows[0].count);
        const thisMonthRevenue = parseFloat(thisMonthRevenueRes.rows[0].sum || '0');
        const thisMonthViews = parseInt(thisMonthViewsRes.rows[0].count);
        // Last Month
        const lastMonthOrdersRes = await postgres_1.OrderDB.countByDateRange(startOfLastMonth, startOfThisMonth);
        const lastMonthRevenueRes = await postgres_1.OrderDB.getRevenueByDateRange(startOfLastMonth, startOfThisMonth);
        const lastMonthViewsRes = await postgres_1.ServiceViewsDB.countByDateRange(startOfLastMonth, startOfThisMonth);
        const lastMonthOrders = parseInt(lastMonthOrdersRes.rows[0].count);
        const lastMonthRevenue = parseFloat(lastMonthRevenueRes.rows[0].sum || '0');
        const lastMonthViews = parseInt(lastMonthViewsRes.rows[0].count);
        // 3. Efficiency Report (Table Data)
        const servicesRes = await postgres_1.ServiceDB.getAll();
        const viewsByServiceRes = await postgres_1.ServiceViewsDB.getViewsCountByService();
        const ordersByServiceRes = await postgres_1.OrderDB.getOrdersCountByService();
        console.log('Services found:', servicesRes.rows.length);
        console.log('Views stats:', viewsByServiceRes.rows);
        console.log('Orders stats:', ordersByServiceRes.rows);
        const services = servicesRes.rows.map(service => {
            const viewsRow = viewsByServiceRes.rows.find((r) => r.service_id == service.id);
            const ordersRow = ordersByServiceRes.rows.find((r) => r.service_id == service.id);
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
    }
    catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getDashboardStats = getDashboardStats;
// Метод 1: Створення звіту
// POST /reports
const createReport = async (req, res) => {
    try {
        const { type, period, data, managerId } = req.body;
        // Створення документу в MongoDB
        const report = new Report_1.default({
            type,
            period,
            generatedData: data, // JSON-об'єкт будь-якої структури
            managerId
        });
        await report.save();
        res.status(200).json({ success: true, id: report._id });
    }
    catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ message: 'Error creating report' });
    }
};
exports.createReport = createReport;
// Метод 2: Отримання списку (Архів)
// GET /reports
const getReports = async (req, res) => {
    try {
        const reports = await Report_1.default.find()
            .select('-generatedData')
            .sort({ createdAt: -1 }); // Нові зверху
        res.json(reports);
    }
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Error fetching reports' });
    }
};
exports.getReports = getReports;
// Метод 3: Перегляд деталей
// GET /reports/:id
const getReportById = async (req, res) => {
    try {
        const report = await Report_1.default.findById(req.params.id);
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
exports.getReportById = getReportById;
