var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Modal } from './utils/Modal.js';
(function () {
    const lucide = window.lucide;
    function formatCurrency(amount) {
        return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }
    function formatDate(dateString) {
        if (!dateString)
            return '';
        return new Date(dateString).toLocaleDateString('uk-UA');
    }
    function getDisplayStatus(order) {
        if (order.status === 'paid' && order.end_date) {
            const parts = order.end_date.split('-');
            const localEndDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999);
            const now = new Date();
            if (now > localEndDate) {
                return 'completed';
            }
        }
        return order.status;
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
                updateStats(orders);
            }
            catch (error) {
                console.error('Error fetching orders:', error);
            }
        });
    }
    function updateStats(orders) {
        const totalOrdersEl = document.getElementById('statsTotalOrders');
        const pendingOrdersEl = document.getElementById('statsPendingOrders');
        const totalRevenueEl = document.getElementById('statsTotalRevenue');
        if (totalOrdersEl)
            totalOrdersEl.textContent = orders.length.toString();
        if (pendingOrdersEl) {
            const pendingCount = orders.filter(o => o.status === 'new').length;
            pendingOrdersEl.textContent = pendingCount.toString();
        }
        if (totalRevenueEl) {
            const totalRevenue = orders
                .filter(order => order.status !== 'cancelled')
                .reduce((sum, order) => sum + Number(order.total_cost), 0);
            totalRevenueEl.textContent = formatCurrency(totalRevenue);
        }
    }
    function renderOrders(orders) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody)
            return;
        tbody.innerHTML = '';
        orders.forEach(order => {
            const displayStatus = getDisplayStatus(order);
            // Main Row
            const tr = document.createElement('tr');
            tr.className = "order-row hover:bg-gray-50 transition-colors border-b border-gray-100";
            tr.setAttribute('data-status', displayStatus);
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">ORD-${order.id.toString().padStart(3, '0')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${order.user_email || 'User #' + order.user_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.service_name || 'Service #' + order.service_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-left font-medium text-gray-900">${formatCurrency(order.total_cost)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDate(order.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center status-cell">
                    ${getStatusBadge(displayStatus)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-2">
                        ${(displayStatus === 'new' || displayStatus === 'paid') ? `
                            <button class="btn-icon text-red-400 hover:text-red-600 transition-colors" title="Скасувати" onclick="cancelOrder(${order.id})">
                                <i data-lucide="x-circle" class="w-5 h-5"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon text-gray-400 hover:text-blue-600 transition-colors" onclick="toggleDetails(${order.id})">
                            <i data-lucide="eye" class="w-5 h-5" id="icon-${order.id}"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
            // Details Row
            const detailsTr = document.createElement('tr');
            detailsTr.id = `details-${order.id}`;
            detailsTr.className = "hidden bg-gray-50 border-t border-gray-100";
            const resourcesHtml = order.resources && order.resources.length > 0
                ? order.resources.map(r => `<span class="badge badge-gray bg-white border border-gray-200">${r}</span>`).join('')
                : '<span class="text-gray-400 text-sm">Немає додаткових ресурсів</span>';
            detailsTr.innerHTML = `
                <td colspan="7" class="p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">Період кампанії:</p>
                            <p class="text-gray-900">
                                ${formatDate(order.event_date)} ${order.end_date ? '— ' + formatDate(order.end_date) : ''}
                            </p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-1">Додаткові ресурси:</p>
                            <div class="flex flex-wrap gap-2">
                                ${resourcesHtml}
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(detailsTr);
        });
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    window.toggleDetails = (id) => {
        const detailsRow = document.getElementById(`details-${id}`);
        const icon = document.getElementById(`icon-${id}`);
        if (detailsRow) {
            detailsRow.classList.toggle('hidden');
            if (icon) {
                if (detailsRow.classList.contains('hidden')) {
                    icon.classList.remove('text-blue-600');
                }
                else {
                    icon.classList.add('text-blue-600');
                }
            }
        }
    };
    window.filterOrders = () => {
        const searchInput = document.getElementById("searchOrders");
        const statusFilter = document.getElementById("statusFilter");
        if (!searchInput || !statusFilter)
            return;
        const searchValue = searchInput.value.toLowerCase();
        const filterValue = statusFilter.value;
        const rows = document.querySelectorAll(".order-row");
        rows.forEach((row) => {
            var _a;
            const htmlRow = row;
            const text = ((_a = htmlRow.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
            const status = htmlRow.getAttribute('data-status') || "";
            const matchesSearch = text.includes(searchValue);
            const matchesStatus = filterValue === "all" || status === filterValue;
            const nextRow = htmlRow.nextElementSibling;
            const isDetailsRow = nextRow && nextRow.id.startsWith('details-');
            if (matchesSearch && matchesStatus) {
                htmlRow.style.display = "";
                if (isDetailsRow) {
                    nextRow.style.display = "";
                }
            }
            else {
                htmlRow.style.display = "none";
                if (isDetailsRow) {
                    nextRow.style.display = "none";
                    nextRow.classList.add('hidden');
                }
            }
        });
        if (filterValue === 'all' && searchValue === '') {
            document.querySelectorAll('[id^="details-"]').forEach(el => {
                el.classList.add('hidden');
                el.style.display = '';
            });
            document.querySelectorAll('.order-row').forEach(el => {
                el.style.display = '';
            });
        }
    };
    window.cancelOrder = (id) => __awaiter(this, void 0, void 0, function* () {
        if (!(yield Modal.confirm('Ви впевнені, що хочете скасувати це замовлення?')))
            return;
        try {
            const res = yield fetch(`/api/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' })
            });
            if (res.ok) {
                fetchOrders();
            }
            else {
                yield Modal.alert('Помилка при скасуванні');
            }
        }
        catch (e) {
            console.error(e);
            yield Modal.alert('Помилка з\'єднання');
        }
    });
    document.addEventListener("DOMContentLoaded", () => {
        fetchOrders();
        const searchInput = document.getElementById("searchOrders");
        const selectContainer = document.getElementById('customSelectContainer');
        const selectTrigger = document.getElementById('customSelectTrigger');
        const selectMenu = document.getElementById('customSelectMenu');
        const selectArrow = document.getElementById('customSelectArrow');
        const hiddenInput = document.getElementById('statusFilter');
        const selectedText = document.getElementById('selectedStatusText');
        const options = document.querySelectorAll('.custom-option');
        if (selectTrigger && selectMenu && selectArrow && hiddenInput && selectedText) {
            selectTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = selectMenu.classList.contains('hidden');
                if (isHidden) {
                    selectMenu.classList.remove('hidden');
                    selectArrow.style.transform = 'rotate(180deg)';
                }
                else {
                    selectMenu.classList.add('hidden');
                    selectArrow.style.transform = 'rotate(0deg)';
                }
            });
            document.addEventListener('click', (e) => {
                if (selectContainer && !selectContainer.contains(e.target)) {
                    selectMenu.classList.add('hidden');
                    selectArrow.style.transform = 'rotate(0deg)';
                }
            });
            options.forEach(option => {
                option.addEventListener('click', () => {
                    var _a;
                    const value = option.getAttribute('data-value');
                    const text = (_a = option.querySelector('span:last-child')) === null || _a === void 0 ? void 0 : _a.textContent;
                    if (value && text) {
                        hiddenInput.value = value;
                        selectedText.textContent = text;
                        selectMenu.classList.add('hidden');
                        selectArrow.style.transform = 'rotate(0deg)';
                        window.filterOrders();
                    }
                });
            });
        }
        searchInput === null || searchInput === void 0 ? void 0 : searchInput.addEventListener("input", window.filterOrders);
    });
})();
