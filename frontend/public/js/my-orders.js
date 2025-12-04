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
    function formatCurrency(num) {
        return num.toLocaleString('uk-UA') + ' ₴';
    }
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('uk-UA');
    }
    function getStatusBadge(status) {
        switch (status) {
            case 'paid': return `<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Оплачено</span>`;
            case 'new': return `<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Нове</span>`;
            case 'completed': return `<span class="badge badge-gray"><i data-lucide="check" class="w-3 h-3"></i> Виконано</span>`;
            case 'cancelled': return `<span class="badge badge-red"><i data-lucide="x-circle" class="w-3 h-3"></i> Скасовано</span>`;
            default: return `<span class="badge badge-gray">${status}</span>`;
        }
    }
    function loadOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                window.location.href = 'index.html';
                return;
            }
            const user = JSON.parse(userStr);
            try {
                const response = yield fetch(`/api/orders/user/${user.id}`);
                if (response.ok) {
                    const orders = yield response.json();
                    // Оновлюємо статистику
                    document.getElementById('totalOrders').innerText = orders.length.toString();
                    document.getElementById('activeCampaigns').innerText = orders.filter((o) => o.status === 'new' || o.status === 'paid').length.toString();
                    const totalSum = orders.reduce((sum, o) => sum + Number(o.total_cost), 0);
                    document.getElementById('totalSpent').innerText = formatCurrency(totalSum);
                    const tbody = document.getElementById('ordersTableBody');
                    if (tbody) {
                        tbody.innerHTML = '';
                        if (orders.length === 0) {
                            tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">
                                <div class="flex flex-col items-center justify-center gap-2">
                                    <i data-lucide="inbox" class="w-8 h-8 text-gray-400"></i>
                                    <p>У вас ще немає замовлень</p>
                                    <a href="catalog.html" class="text-blue-600 hover:underline text-sm">Перейти до каталогу</a>
                                </div>
                            </td>
                        </tr>
                    `;
                        }
                        else {
                            orders.forEach((order) => {
                                // Main Row
                                const tr = document.createElement('tr');
                                tr.className = "hover:bg-gray-50 transition-colors cursor-pointer";
                                tr.onclick = (e) => {
                                    // Prevent toggling if clicking on a button
                                    if (e.target.closest('button'))
                                        return;
                                    window.toggleDetails(order.id);
                                };
                                tr.innerHTML = `
                            <td class="text-[#1a3a5c] font-medium">ORD-${order.id}</td>
                            <td class="text-gray-900">${order.service_name}</td>
                            <td class="text-gray-600 text-sm">${formatDate(order.event_date)}</td>
                            <td class="text-right text-[#1a3a5c] font-bold">${formatCurrency(Number(order.total_cost))}</td>
                            <td class="text-center">${getStatusBadge(order.status)}</td>
                            <td class="text-center flex items-center justify-center gap-2">
                                ${order.status === 'new' ? `<button class="btn btn-primary text-xs py-1 px-3" onclick="payOrder(${order.id}, ${order.total_cost})">Сплатити</button>` : ''}
                                <button class="btn-icon text-gray-400 hover:text-gray-600" onclick="toggleDetails(${order.id})">
                                    <i data-lucide="chevron-down" class="w-5 h-5 transition-transform" id="icon-${order.id}"></i>
                                </button>
                            </td>
                        `;
                                tbody.appendChild(tr);
                                // Details Row
                                const detailsTr = document.createElement('tr');
                                detailsTr.id = `details-${order.id}`;
                                detailsTr.className = "hidden bg-gray-50 border-t border-gray-100";
                                const resourcesHtml = order.resources && order.resources.length > 0
                                    ? order.resources.map((r) => `<span class="badge badge-gray bg-white border border-gray-200">${r}</span>`).join('')
                                    : '<span class="text-gray-400 text-sm">Немає додаткових ресурсів</span>';
                                detailsTr.innerHTML = `
                            <td colspan="6" class="p-4">
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
                        }
                        lucide.createIcons();
                    }
                }
            }
            catch (e) {
                console.error(e);
            }
        });
    }
    // Toggle details function
    window.toggleDetails = (id) => {
        const detailsRow = document.getElementById(`details-${id}`);
        const icon = document.getElementById(`icon-${id}`);
        if (detailsRow) {
            detailsRow.classList.toggle('hidden');
            if (icon) {
                if (detailsRow.classList.contains('hidden')) {
                    icon.style.transform = 'rotate(0deg)';
                }
                else {
                    icon.style.transform = 'rotate(180deg)';
                }
            }
        }
    };
    // Функція для глобального доступу (викликається з HTML onclick)
    window.payOrder = (orderId, amount) => __awaiter(this, void 0, void 0, function* () {
        if (!confirm(`Підтвердити оплату замовлення ORD-${orderId}?`))
            return;
        try {
            const res = yield fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, amount: amount })
            });
            if (res.ok) {
                // Одразу підтверджуємо (для демо)
                yield fetch(`/api/payments/${orderId}/confirm`, { method: 'PATCH' });
                alert('Оплата пройшла успішно!');
                loadOrders(); // Перезавантажити таблицю
            }
        }
        catch (e) {
            alert('Помилка оплати');
        }
    });
    document.addEventListener("DOMContentLoaded", () => {
        loadOrders();
    });
})();
