"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    const lucide = window.lucide;
    function formatCurrency(amount) {
        return amount.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }
    function fetchDashboardStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/dashboard/stats');
                if (!response.ok)
                    throw new Error('Failed to fetch dashboard stats');
                const stats = yield response.json();
                const totalOrdersEl = document.getElementById('total-orders');
                const totalRevenueEl = document.getElementById('total-revenue');
                const totalViewsEl = document.getElementById('total-views');
                if (totalOrdersEl)
                    totalOrdersEl.textContent = stats.totalOrders.toString();
                if (totalRevenueEl)
                    totalRevenueEl.textContent = formatCurrency(stats.totalRevenue);
                if (totalViewsEl)
                    totalViewsEl.textContent = stats.totalViews.toLocaleString();
            }
            catch (error) {
                console.error('Error fetching dashboard stats:', error);
            }
        });
    }
    document.addEventListener("DOMContentLoaded", () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        fetchDashboardStats();
    });
})();
