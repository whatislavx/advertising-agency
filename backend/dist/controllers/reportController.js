"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPdfReport = exports.getReportById = exports.getReports = exports.createReport = exports.getDashboardStats = void 0;
// @ts-ignore
const Report_1 = __importDefault(require("../models/Report"));
const postgres_1 = require("../db/postgres");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const reportTemplate_1 = require("../utils/reportTemplate");
// --- Helper functions ---
const fmt = (num) => num.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// Словник перекладів для типів
const typeTranslations = {
    'equipment': 'Обладнання',
    'personnel': 'Персонал'
};
// Helper to calculate percentage change
const calculateChange = (current, previous) => {
    if (previous === 0)
        return null; // Return null to indicate "dash"
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
};
// --- Dashboard & Analytics Methods ---
// GET /dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // --- Запит на першу дату ---
        const firstOrderRes = await postgres_1.OrderDB.getFirstOrderDate();
        let firstOrderDate = firstOrderRes.rows[0].first_date;
        if (!firstOrderDate)
            firstOrderDate = startOfThisMonth;
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
            firstOrderDate,
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
// --- Report Archive Methods (MongoDB) ---
// Метод 1: Створення звіту (збереження в архів)
// POST /reports
const createReport = async (req, res) => {
    try {
        const { type, period, data, managerId } = req.body;
        const report = new Report_1.default({
            type,
            period,
            generatedData: data,
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
            .sort({ createdAt: -1 });
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
// --- PDF Generation Method (Gotenberg) ---
// Експорт PDF через Gotenberg
const exportPdfReport = async (req, res) => {
    try {
        // 1. Отримуємо дані
        const { startDate, endDate, managerId } = req.query;
        const now = new Date();
        let startPeriodForDb;
        let endPeriodForDb;
        let startPeriodForDisplay;
        let endPeriodForDisplay;
        if (startDate && endDate) {
            // Створюємо дати для БД
            startPeriodForDb = new Date(startDate);
            endPeriodForDb = new Date(endDate);
            endPeriodForDb.setHours(23, 59, 59, 999); // Кінець дня для пошуку
            // Створюємо дати суто для відображення (без часу, щоб уникнути Timezone shift)
            startPeriodForDisplay = new Date(startDate);
            endPeriodForDisplay = new Date(endDate);
        }
        else {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startPeriodForDb = startOfMonth;
            endPeriodForDb = now;
            startPeriodForDisplay = startOfMonth;
            endPeriodForDisplay = now;
        }
        let managerName = "Адміністратор";
        if (managerId) {
            try {
                const managerRes = await postgres_1.UserDB.getById(managerId);
                if (managerRes.rows.length > 0) {
                    const m = managerRes.rows[0];
                    managerName = `${m.first_name} ${m.last_name}`;
                }
            }
            catch (e) {
                console.warn('Could not fetch manager name', e);
            }
        }
        const [ordersCountRes, revenueRes, topServicesRes, topClientsRes, topResourcesRes] = await Promise.all([
            postgres_1.OrderDB.countByDateRange(startPeriodForDb, endPeriodForDb),
            postgres_1.OrderDB.getRevenueByDateRange(startPeriodForDb, endPeriodForDb),
            postgres_1.OrderDB.getTopServicesByRevenue(startPeriodForDb, endPeriodForDb),
            postgres_1.OrderDB.getTopClients(startPeriodForDb, endPeriodForDb),
            postgres_1.OrderDB.getTopResources(startPeriodForDb, endPeriodForDb)
        ]);
        const totalOrders = parseInt(ordersCountRes.rows[0].count);
        const totalRevenue = parseFloat(revenueRes.rows[0].sum || '0');
        const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const cancelledRes = await postgres_1.OrderDB.getAll();
        const cancelledCount = cancelledRes.rows.filter((o) => o.status === 'cancelled').length;
        const totalAll = cancelledRes.rows.length;
        const cancelRate = totalAll > 0 ? (cancelledCount / totalAll) * 100 : 0;
        const periodStr = `${startPeriodForDisplay.toLocaleDateString('uk-UA')} — ${endPeriodForDisplay.toLocaleDateString('uk-UA')}`;
        const dateStrStart = startPeriodForDisplay.toLocaleDateString('uk-UA').replace(/\./g, '-');
        const dateStrEnd = endPeriodForDisplay.toLocaleDateString('uk-UA').replace(/\./g, '-');
        const filename = `report_${dateStrStart}_${dateStrEnd}.pdf`;
        const encodedFilename = encodeURIComponent(filename);
        // 2. Готуємо дані для шаблону
        const reportData = {
            title: filename,
            period: periodStr,
            generatedAt: now.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }),
            managerName,
            totalRevenue: fmt(totalRevenue) + ' грн',
            totalOrders,
            averageOrderValue: fmt(Math.round(avgCheck)) + ' грн',
            cancelRate: cancelRate.toFixed(1),
            topServices: topServicesRes.rows.map(s => ({ ...s, revenue: fmt(Number(s.revenue)) + ' грн' })),
            topClients: topClientsRes.rows.map(c => ({ ...c, total_spent: fmt(Number(c.total_spent)) + ' грн' })),
            topResources: topResourcesRes.rows.map(r => ({
                ...r,
                type: typeTranslations[r.type] || r.type // Перекладаємо тип, якщо є у словнику
            }))
        };
        // 3. Генеруємо HTML рядок
        const htmlContent = (0, reportTemplate_1.generateReportHtml)(reportData);
        // 4. Відправляємо в Gotenberg
        const gotenbergUrl = process.env.GOTENBERG_URL || 'http://gotenberg:3000';
        const form = new form_data_1.default();
        form.append('files', Buffer.from(htmlContent), { filename: 'index.html', contentType: 'text/html' });
        form.append('marginTop', '0.8');
        form.append('marginBottom', '0.8');
        form.append('marginLeft', '0.8');
        form.append('marginRight', '0.8');
        console.log(`Sending request to Gotenberg: ${gotenbergUrl}/forms/chromium/convert/html`);
        const pdfResponse = await axios_1.default.post(`${gotenbergUrl}/forms/chromium/convert/html`, form, {
            headers: {
                ...form.getHeaders()
            },
            responseType: 'stream'
        });
        // 5. Віддаємо PDF клієнту
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`
        });
        pdfResponse.data.pipe(res);
    }
    catch (error) {
        console.error('Report Generation Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to generate PDF report' });
        }
    }
};
exports.exportPdfReport = exportPdfReport;
