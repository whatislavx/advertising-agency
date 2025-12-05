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
    const flatpickr = window.flatpickr;
    // Змінні стану
    let currentOrderId = null;
    let currentOrderStatus = null;
    let currentOrderDuration = null; // у днях
    let rescheduleStartPicker = null;
    let rescheduleEndPicker = null;
    function formatCurrency(num) {
        return num.toLocaleString('uk-UA') + ' ₴';
    }
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('uk-UA');
    }
    // Розрахунок тривалості в днях (включно з початковою датою)
    function calculateDuration(startStr, endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr || startStr);
        // Різниця в часі / мілісекунд в добі
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return days + 1;
    }
    function getDisplayStatus(order) {
        if (order.status === 'paid' && order.end_date) {
            const endDate = new Date(order.end_date);
            const now = new Date();
            if (now > endDate) {
                return 'completed';
            }
        }
        return order.status;
    }
    function getStatusBadge(status) {
        switch (status) {
            case 'paid': return `<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Оплачено</span>`;
            case 'new': return `<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Нове</span>`;
            case 'completed': return `<span class="badge badge-blue"><i data-lucide="check" class="w-3 h-3"></i> Виконано</span>`;
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
                    const totalOrdersEl = document.getElementById('totalOrders');
                    if (totalOrdersEl)
                        totalOrdersEl.innerText = orders.length.toString();
                    const activeCampaignsEl = document.getElementById('activeCampaigns');
                    if (activeCampaignsEl)
                        activeCampaignsEl.innerText = orders.filter((o) => o.status === 'new' || o.status === 'paid').length.toString();
                    const totalSum = orders.reduce((sum, o) => sum + Number(o.total_cost), 0);
                    const totalSpentEl = document.getElementById('totalSpent');
                    if (totalSpentEl)
                        totalSpentEl.innerText = formatCurrency(totalSum);
                    const tbody = document.getElementById('ordersTableBody');
                    if (tbody) {
                        tbody.innerHTML = '';
                        if (orders.length === 0) {
                            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">У вас ще немає замовлень</td></tr>`;
                        }
                        else {
                            orders.forEach((order) => {
                                const displayStatus = getDisplayStatus(order);
                                const tr = document.createElement('tr');
                                tr.className = "hover:bg-gray-50 transition-colors cursor-pointer";
                                tr.onclick = (e) => {
                                    if (e.target.closest('button'))
                                        return;
                                    window.toggleDetails(order.id);
                                };
                                let actionButtons = '';
                                if (displayStatus === 'new') {
                                    actionButtons += `<button class="btn btn-primary text-xs py-1 px-3" onclick="payOrder(${order.id}, ${order.total_cost})">Сплатити</button>`;
                                }
                                if (displayStatus === 'new' || displayStatus === 'paid') {
                                    actionButtons += `
                                    <button class="btn-icon text-blue-600 hover:bg-blue-50" onclick="openRescheduleModal(${order.id}, '${order.event_date}', '${order.end_date}', '${order.status}')" title="Перенести">
                                        <i data-lucide="calendar" class="w-4 h-4"></i>
                                    </button>
                                `;
                                }
                                if (displayStatus === 'new' || displayStatus === 'paid') {
                                    actionButtons += `
                                    <button class="btn-icon text-red-600 hover:bg-red-50" onclick="cancelOrder(${order.id}, '${order.status}')" title="Скасувати">
                                        <i data-lucide="x-circle" class="w-4 h-4"></i>
                                    </button>
                                `;
                                }
                                actionButtons += `
                                <button class="btn-icon text-gray-400 hover:text-gray-600" onclick="toggleDetails(${order.id})">
                                    <i data-lucide="chevron-down" class="w-5 h-5 transition-transform" id="icon-${order.id}"></i>
                                </button>
                            `;
                                tr.innerHTML = `
                                <td class="text-[#1a3a5c] font-medium">ORD-${order.id}</td>
                                <td class="text-gray-900">${order.service_name}</td>
                                <td class="text-gray-600 text-sm">${formatDate(order.event_date)}</td>
                                <td class="text-right text-[#1a3a5c] font-bold">${formatCurrency(Number(order.total_cost))}</td>
                                <td class="text-center">${getStatusBadge(displayStatus)}</td>
                                <td class="text-center flex items-center justify-center gap-2">${actionButtons}</td>
                            `;
                                tbody.appendChild(tr);
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
    // --- Функції дій ---
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
    window.payOrder = (orderId, amount) => __awaiter(this, void 0, void 0, function* () {
        const e = window.event;
        if (e)
            e.stopPropagation();
        if (!confirm(`Підтвердити оплату замовлення ORD-${orderId}?`))
            return;
        try {
            const res = yield fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, amount: amount })
            });
            if (res.ok) {
                yield fetch(`/api/payments/${orderId}/confirm`, { method: 'PATCH' });
                alert('Оплата пройшла успішно!');
                loadOrders();
            }
        }
        catch (e) {
            alert('Помилка оплати');
        }
    });
    window.cancelOrder = (id, status) => __awaiter(this, void 0, void 0, function* () {
        const e = window.event;
        if (e)
            e.stopPropagation();
        const confirmMsg = status === 'paid'
            ? 'Ви впевнені, що хочете скасувати оплачене замовлення? Кошти будуть повернуті.'
            : 'Ви впевнені, що хочете скасувати це замовлення?';
        if (!confirm(confirmMsg))
            return;
        try {
            const res = yield fetch(`/api/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' })
            });
            if (res.ok) {
                if (status === 'paid') {
                    alert('Замовлення скасовано. Кошти будуть повернуті протягом 30 робочих днів.');
                }
                else {
                    alert('Замовлення скасовано.');
                }
                loadOrders();
            }
            else {
                alert('Помилка при скасуванні');
            }
        }
        catch (e) {
            console.error(e);
            alert('Помилка з\'єднання');
        }
    });
    window.closeRescheduleModal = () => {
        const modal = document.getElementById('rescheduleModal');
        modal === null || modal === void 0 ? void 0 : modal.classList.add('hidden');
        modal === null || modal === void 0 ? void 0 : modal.classList.remove('flex');
    };
    // Ініціалізація календарів
    function initPickers() {
        if (typeof flatpickr === 'undefined')
            return;
        const startEl = document.getElementById('rescheduleStart');
        const endEl = document.getElementById('rescheduleEnd');
        if (rescheduleStartPicker && rescheduleEndPicker)
            return;
        if (startEl) {
            rescheduleStartPicker = flatpickr(startEl, {
                locale: "uk",
                dateFormat: "d.m.Y",
                minDate: "today",
                // Логіка при зміні початкової дати
                onChange: function (selectedDates) {
                    if (selectedDates.length > 0 && rescheduleEndPicker) {
                        const newStartDate = selectedDates[0];
                        // Якщо замовлення оплачене - ФІКСУЄМО тривалість
                        if (currentOrderStatus === 'paid' && currentOrderDuration) {
                            // Рахуємо нову кінцеву дату: start + (duration - 1)
                            const fixedEndDate = new Date(newStartDate);
                            fixedEndDate.setDate(newStartDate.getDate() + (currentOrderDuration - 1));
                            // Встановлюємо цю дату як єдину можливу
                            rescheduleEndPicker.setDate(fixedEndDate);
                            rescheduleEndPicker.set('minDate', fixedEndDate);
                            rescheduleEndPicker.set('maxDate', fixedEndDate);
                        }
                        // Якщо не оплачене - просто зсуваємо мінімальну дату
                        else {
                            rescheduleEndPicker.set('minDate', newStartDate);
                            // Знімаємо обмеження maxDate, якщо воно було
                            rescheduleEndPicker.set('maxDate', undefined);
                        }
                    }
                }
            });
        }
        if (endEl) {
            rescheduleEndPicker = flatpickr(endEl, {
                locale: "uk",
                dateFormat: "d.m.Y",
                minDate: "today"
            });
        }
    }
    window.openRescheduleModal = (id, start, end, status) => {
        const e = window.event;
        if (e)
            e.stopPropagation();
        currentOrderId = id;
        currentOrderStatus = status;
        currentOrderDuration = calculateDuration(start, end);
        const modal = document.getElementById('rescheduleModal');
        modal === null || modal === void 0 ? void 0 : modal.classList.remove('hidden');
        modal === null || modal === void 0 ? void 0 : modal.classList.add('flex');
        initPickers();
        // Встановлюємо початкові значення
        if (rescheduleStartPicker) {
            rescheduleStartPicker.setDate(new Date(start));
        }
        if (rescheduleEndPicker) {
            const endDateObj = end ? new Date(end) : new Date(start);
            rescheduleEndPicker.setDate(endDateObj);
            // Якщо статус 'paid', то відразу блокуємо вибір кінцевої дати на поточну
            if (status === 'paid') {
                rescheduleEndPicker.set('minDate', endDateObj);
                rescheduleEndPicker.set('maxDate', endDateObj);
            }
            else {
                // Якщо 'new', то просто мінімум = старт
                rescheduleEndPicker.set('minDate', new Date(start));
                rescheduleEndPicker.set('maxDate', undefined);
            }
        }
    };
    window.submitReschedule = () => __awaiter(this, void 0, void 0, function* () {
        const startInput = document.getElementById('rescheduleStart');
        const endInput = document.getElementById('rescheduleEnd');
        if (!currentOrderId || !startInput.value || !endInput.value)
            return;
        const [d1, m1, y1] = startInput.value.split('.');
        const [d2, m2, y2] = endInput.value.split('.');
        const startDateObj = new Date(`${y1}-${m1}-${d1}`);
        const endDateObj = new Date(`${y2}-${m2}-${d2}`);
        if (endDateObj < startDateObj) {
            alert('Дата завершення не може бути раніше дати початку');
            return;
        }
        const event_date = `${y1}-${m1}-${d1}`;
        const end_date = `${y2}-${m2}-${d2}`;
        // Подвійна перевірка на клієнті (для безпеки)
        if (currentOrderStatus === 'paid') {
            const newDuration = calculateDuration(event_date, end_date);
            if (newDuration !== currentOrderDuration) {
                alert(`Для оплачених замовлень зміна тривалості заборонена.`);
                return;
            }
        }
        try {
            const response = yield fetch(`/api/orders/${currentOrderId}/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_date, end_date })
            });
            if (response.ok) {
                const data = yield response.json();
                let msg = 'Замовлення успішно перенесено!';
                if (currentOrderStatus !== 'paid') {
                    msg += ` Нова сума: ${formatCurrency(Number(data.total_cost))}`;
                }
                alert(msg);
                window.closeRescheduleModal();
                loadOrders();
            }
            else {
                try {
                    const err = yield response.json();
                    alert('Помилка: ' + (err.message || 'Невідома помилка'));
                }
                catch (_a) {
                    alert('Помилка при оновленні замовлення (500)');
                }
            }
        }
        catch (e) {
            console.error(e);
            alert('Помилка з\'єднання');
        }
    });
    document.addEventListener("DOMContentLoaded", () => {
        var _a, _b, _c;
        loadOrders();
        initPickers();
        (_a = document.getElementById('closeRescheduleBtn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', window.closeRescheduleModal);
        (_b = document.getElementById('closeRescheduleIcon')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', window.closeRescheduleModal);
        (_c = document.getElementById('confirmRescheduleBtn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', window.submitReschedule);
    });
})();
