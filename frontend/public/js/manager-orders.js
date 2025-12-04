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
        return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }
    function getStatusBadge(status) {
        switch (status) {
            case 'new': return '<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Новий</span>';
            case 'paid': return '<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Оплачено</span>';
            case 'completed': return '<span class="badge badge-blue"><i data-lucide="check" class="w-3 h-3"></i> Виконано</span>';
            case 'cancelled': return '<span class="badge badge-red"><i data-lucide="x-circle" class="w-3 h-3"></i> Скасовано</span>';
            default: return `<span class="badge badge-gray">${status}</span>`;
        }
    }
    function fetchOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/orders');
                if (!response.ok)
                    throw new Error('Failed to fetch orders');
                const orders = yield response.json();
                renderOrders(orders);
            }
            catch (error) {
                console.error('Error fetching orders:', error);
            }
        });
    }
    function renderOrders(orders) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody)
            return;
        tbody.innerHTML = orders.map(order => `
            <tr class="order-row">
                <td class="text-primary font-medium">ORD-${order.id.toString().padStart(3, '0')}</td>
                <td class="text-gray-900">User #${order.user_id}</td>
                <td class="text-gray-700">Service #${order.service_id}</td>
                <td class="text-right text-primary">${formatCurrency(order.total_cost)}</td>
                <td class="text-sm text-gray-600">${formatDate(order.event_date)}</td>
                <td class="text-center status-cell">
                    ${getStatusBadge(order.status)}
                </td>
                <td class="text-center">
                    <button class="btn-icon">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    function filterOrders() {
        const searchInput = document.getElementById("searchOrders");
        const statusFilter = document.getElementById("statusFilter");
        if (!searchInput || !statusFilter)
            return;
        const searchValue = searchInput.value.toLowerCase();
        const filterValue = statusFilter.value;
        const rows = document.querySelectorAll(".order-row");
        rows.forEach((row) => {
            var _a, _b, _c;
            const htmlRow = row;
            const text = ((_a = htmlRow.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
            const statusCell = ((_c = (_b = htmlRow.querySelector(".status-cell")) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.trim()) || "";
            // Map UI status text to filter value if needed, or just check includes
            // Filter value is "Новий", "Оплачено" etc.
            // Status cell text contains "Новий", "Оплачено" etc.
            const matchesSearch = text.includes(searchValue);
            const matchesStatus = filterValue === "all" || statusCell.includes(filterValue);
            if (matchesSearch && matchesStatus) {
                htmlRow.style.display = "";
            }
            else {
                htmlRow.style.display = "none";
            }
        });
    }
    document.addEventListener("DOMContentLoaded", () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        fetchOrders();
        const searchInput = document.getElementById("searchOrders");
        const statusFilter = document.getElementById("statusFilter");
        searchInput === null || searchInput === void 0 ? void 0 : searchInput.addEventListener("input", filterOrders);
        statusFilter === null || statusFilter === void 0 ? void 0 : statusFilter.addEventListener("change", filterOrders);
    });
})();
