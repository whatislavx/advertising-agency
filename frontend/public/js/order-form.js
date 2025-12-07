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
    const flatpickr = window.flatpickr;
    const lucide = window.lucide;
    let services = [];
    let resources = [];
    let currentService;
    let selectedItems = [];
    let servicePricePerDay = 0;
    let durationInDays = 0;
    let userDiscount = 0;
    function fetchUserDiscount() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userStr = localStorage.getItem('user');
                if (!userStr)
                    return;
                const user = JSON.parse(userStr);
                const response = yield fetch(`/api/users/${user.id}`);
                if (response.ok) {
                    const userData = yield response.json();
                    userDiscount = Number(userData.personal_discount) || 0;
                }
            }
            catch (e) {
                console.error("Failed to fetch user discount", e);
            }
        });
    }
    function fetchData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fetchUserDiscount();
                const [servicesRes, resourcesRes] = yield Promise.all([
                    fetch('/api/services'),
                    fetch('/api/resources?available=true')
                ]);
                if (servicesRes.ok)
                    services = yield servicesRes.json();
                if (resourcesRes.ok)
                    resources = yield resourcesRes.json();
            }
            catch (e) {
                console.error("Failed to fetch data from backend", e);
                yield Modal.alert("Не вдалося завантажити прайс-лист. Перевірте підключення до сервера.");
            }
        });
    }
    function getServiceIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        return id ? parseInt(id) : 1;
    }
    function formatCurrency(num) {
        return num.toLocaleString('uk-UA') + ' грн';
    }
    function calculateTotal() {
        const resourcesPricePerDay = selectedItems.reduce((acc, item) => acc + item.price, 0);
        const totalPricePerDay = servicePricePerDay + resourcesPricePerDay;
        const subtotal = totalPricePerDay * (durationInDays > 0 ? durationInDays : 0);
        return subtotal * (1 - userDiscount / 100);
    }
    function updateSummary() {
        const listContainer = document.getElementById('selectedResourcesList');
        const dynamicList = document.getElementById('dynamicList');
        const totalEl = document.getElementById('totalPrice');
        const summaryBaseEl = document.getElementById('summaryBasePrice');
        const discountRow = document.getElementById('discountRow');
        const discountValue = document.getElementById('discountValue');
        const oldPriceEl = document.getElementById('oldPrice');
        if (summaryBaseEl) {
            summaryBaseEl.innerHTML = `${formatCurrency(servicePricePerDay)} <span class="text-sm text-gray-400">/ доба</span>`;
        }
        if (dynamicList) {
            dynamicList.innerHTML = '';
            if (selectedItems.length > 0) {
                if (listContainer)
                    listContainer.style.display = 'block';
                selectedItems.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'selected-item';
                    row.innerHTML = `<span>${item.name}</span> <span class="summary-price-val">+${formatCurrency(item.price)}/доба</span>`;
                    dynamicList.appendChild(row);
                });
            }
            else {
                if (listContainer)
                    listContainer.style.display = 'none';
            }
        }
        const total = calculateTotal();
        const subtotal = (servicePricePerDay + selectedItems.reduce((acc, item) => acc + item.price, 0)) * (durationInDays > 0 ? durationInDays : 0);
        if (discountRow && discountValue && oldPriceEl) {
            if (userDiscount > 0 && durationInDays > 0) {
                discountRow.style.display = 'flex';
                const savedAmount = subtotal - total;
                discountValue.textContent = `-${userDiscount}% (-${formatCurrency(savedAmount)})`;
                oldPriceEl.style.display = 'block';
                oldPriceEl.textContent = formatCurrency(subtotal);
            }
            else {
                discountRow.style.display = 'none';
                oldPriceEl.style.display = 'none';
            }
        }
        if (totalEl) {
            const daysText = durationInDays > 0 ? `(${durationInDays} днів)` : '(оберіть дати)';
            totalEl.innerHTML = `${formatCurrency(total)} <span class="text-sm font-normal text-gray-300">${daysText}</span>`;
        }
    }
    function calculateDaysDifference(start, end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1;
    }
    function handleDateChange() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        if (!startDateInput.value || !endDateInput.value) {
            durationInDays = 0;
        }
        else {
            const [d1, m1, y1] = startDateInput.value.split('.');
            const [d2, m2, y2] = endDateInput.value.split('.');
            const start = new Date(`${y1}-${m1}-${d1}`);
            const end = new Date(`${y2}-${m2}-${d2}`);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                durationInDays = calculateDaysDifference(start, end);
            }
            else {
                durationInDays = 0;
            }
        }
        updateSummary();
    }
    function toggleResource(element, resId) {
        const resource = resources.find(r => r.id === resId);
        if (!resource)
            return;
        element.classList.toggle('selected');
        const isSelected = element.classList.contains('selected');
        const price = Number(resource.cost);
        if (isSelected) {
            selectedItems.push({ id: resource.id, name: resource.name, price: price });
        }
        else {
            selectedItems = selectedItems.filter(item => item.id !== resource.id);
        }
        updateSummary();
    }
    function renderResourcesForService() {
        const resourceContainer = document.getElementById('resourceContainer');
        if (!resourceContainer || !currentService)
            return;
        resourceContainer.innerHTML = '';
        const allowedIds = currentService.allowed_resources || [];
        const availableResources = resources.filter(res => allowedIds.includes(res.id));
        if (availableResources.length === 0) {
            resourceContainer.innerHTML = `<div class="col-span-full text-center py-8 text-gray-500">Немає доступних ресурсів</div>`;
            return;
        }
        availableResources.forEach(res => {
            const price = Number(res.cost);
            const card = document.createElement('div');
            card.className = 'resource-item';
            card.innerHTML = `
                <div class="res-name">${res.name}</div>
                <div class="res-price">+${formatCurrency(price)} / добу</div>
            `;
            card.addEventListener('click', () => toggleResource(card, res.id));
            resourceContainer.appendChild(card);
        });
    }
    function initPage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fetchData();
            const serviceId = getServiceIdFromUrl();
            currentService = services.find(s => s.id == serviceId);
            if (!currentService && services.length > 0)
                currentService = services[0];
            if (currentService) {
                servicePricePerDay = Number(currentService.base_price);
                const nameEl = document.getElementById('serviceNameDisplay');
                const priceEl = document.getElementById('basePriceDisplay');
                if (nameEl)
                    nameEl.innerText = currentService.name;
                if (priceEl)
                    priceEl.innerText = formatCurrency(servicePricePerDay) + ' / добу';
                updateSummary();
                renderResourcesForService();
            }
        });
    }
    function submitOrder() {
        return __awaiter(this, void 0, void 0, function* () {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                yield Modal.alert('Будь ласка, увійдіть в систему');
                window.location.href = 'index.html';
                return;
            }
            const user = JSON.parse(userStr);
            if (!currentService)
                return;
            if (durationInDays <= 0) {
                yield Modal.alert('Оберіть коректний період кампанії');
                return;
            }
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            const [d1, m1, y1] = startDateInput.value.split('.');
            const [d2, m2, y2] = endDateInput.value.split('.');
            const event_date = `${y1}-${m1}-${d1}`;
            const end_date = `${y2}-${m2}-${d2}`;
            const payload = {
                user_id: user.id,
                service_id: currentService.id,
                event_date: event_date,
                end_date: end_date,
                resources: selectedItems.map(i => i.id)
            };
            try {
                const res = yield fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = yield res.json();
                    let priceDetailsHtml = '';
                    if (userDiscount > 0) {
                        const subtotal = data.total / (1 - userDiscount / 100);
                        priceDetailsHtml = `
                        <div class="mt-2 text-sm text-gray-500">
                            <p class="flex justify-between"><span>Вартість без знижки:</span> <span>${formatCurrency(subtotal)}</span></p>
                            <p class="flex justify-between text-green-600"><span>Ваша знижка:</span> <span>${userDiscount}%</span></p>
                        </div>
                    `;
                    }
                    yield Modal.alert(`
                    <p class="mb-2">Ваше замовлення успішно зареєстровано в системі.</p>
                    <div class="order-success-details bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p class="flex justify-between mb-1"><span>Номер замовлення:</span> <strong>#${data.orderId}</strong></p>
                        ${priceDetailsHtml}
                        <div class="border-t border-gray-200 my-2 pt-2">
                            <p class="total-price flex justify-between items-center">
                                <span>До сплати:</span> 
                                <span class="text-xl font-bold text-[#1a3a5c]">${formatCurrency(data.total)}</span>
                            </p>
                        </div>
                    </div>
                `, 'Успішно!', 'success');
                    window.location.href = 'my-orders.html';
                }
                else {
                    const err = yield res.json();
                    yield Modal.alert('Помилка: ' + (err.message || 'Не вдалося створити замовлення'));
                }
            }
            catch (e) {
                console.error(e);
                yield Modal.alert('Помилка з\'єднання');
            }
        });
    }
    document.addEventListener('DOMContentLoaded', () => {
        if (lucide)
            lucide.createIcons();
        initPage();
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        let startPicker;
        let endPicker;
        if (startDateInput && typeof flatpickr !== 'undefined') {
            startPicker = flatpickr(startDateInput, {
                locale: "uk",
                dateFormat: "d.m.Y",
                minDate: "today",
                onChange: function (selectedDates) {
                    if (selectedDates.length > 0) {
                        if (endPicker)
                            endPicker.set('minDate', selectedDates[0]);
                    }
                    handleDateChange();
                }
            });
        }
        if (endDateInput && typeof flatpickr !== 'undefined') {
            endPicker = flatpickr(endDateInput, {
                locale: "uk",
                dateFormat: "d.m.Y",
                minDate: "today",
                onChange: function () {
                    handleDateChange();
                }
            });
        }
        const payBtn = document.getElementById('submitOrderBtn');
        payBtn === null || payBtn === void 0 ? void 0 : payBtn.addEventListener('click', submitOrder);
    });
})();
