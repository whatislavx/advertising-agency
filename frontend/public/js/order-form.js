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
    const flatpickr = window.flatpickr;
    let services = [];
    let resources = [];
    let currentService;
    let selectedItems = [];
    let currentTotal = 0;
    // Функція завантаження даних з API
    function fetchData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [servicesRes, resourcesRes] = yield Promise.all([
                    fetch('/api/services'),
                    fetch('/api/resources')
                ]);
                if (servicesRes.ok)
                    services = yield servicesRes.json();
                if (resourcesRes.ok)
                    resources = yield resourcesRes.json();
            }
            catch (e) {
                console.error("Failed to fetch data from backend", e);
                alert("Не вдалося завантажити прайс-лист. Перевірте підключення до сервера.");
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
    function updateSummary() {
        const listContainer = document.getElementById('selectedResourcesList');
        const dynamicList = document.getElementById('dynamicList');
        const totalEl = document.getElementById('totalPrice');
        if (dynamicList) {
            dynamicList.innerHTML = '';
            if (selectedItems.length > 0) {
                if (listContainer)
                    listContainer.style.display = 'block';
                selectedItems.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'selected-item';
                    row.innerHTML = `<span>${item.name}</span> <span class="summary-price-val">+${formatCurrency(item.price)}</span>`;
                    dynamicList.appendChild(row);
                });
            }
            else {
                if (listContainer)
                    listContainer.style.display = 'none';
            }
        }
        if (totalEl)
            totalEl.innerText = formatCurrency(currentTotal);
    }
    function toggleResource(element, resId) {
        const resource = resources.find(r => r.id === resId);
        if (!resource)
            return;
        element.classList.toggle('selected');
        const isSelected = element.classList.contains('selected');
        const price = Number(resource.cost);
        if (isSelected) {
            currentTotal += price;
            selectedItems.push({ id: resource.id, name: resource.name, price: price });
        }
        else {
            currentTotal -= price;
            selectedItems = selectedItems.filter(item => item.id !== resource.id);
        }
        updateSummary();
    }
    function initPage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fetchData();
            const serviceId = getServiceIdFromUrl();
            // Знаходимо послугу по ID (важливо: в БД ID може бути number, але з JSON прийти як string, тому ==)
            currentService = services.find(s => s.id == serviceId);
            // Якщо послугу не знайдено, беремо першу або показуємо помилку
            if (!currentService && services.length > 0)
                currentService = services[0];
            if (currentService) {
                const basePrice = Number(currentService.base_price);
                currentTotal = basePrice;
                const nameEl = document.getElementById('serviceNameDisplay');
                const priceEl = document.getElementById('basePriceDisplay');
                const summaryBaseEl = document.getElementById('summaryBasePrice');
                if (nameEl)
                    nameEl.innerText = currentService.name;
                if (priceEl)
                    priceEl.innerText = formatCurrency(basePrice);
                if (summaryBaseEl)
                    summaryBaseEl.innerText = formatCurrency(basePrice);
                updateSummary();
            }
            // Рендеримо ресурси
            const resourceContainer = document.getElementById('resourceContainer');
            if (resourceContainer) {
                resourceContainer.innerHTML = '';
                resources.forEach(res => {
                    const price = Number(res.cost);
                    const card = document.createElement('div');
                    card.className = 'resource-item';
                    card.innerHTML = `
                <div class="res-name">${res.name}</div>
                <div class="res-price">+${formatCurrency(price)}</div>
            `;
                    card.addEventListener('click', () => toggleResource(card, res.id));
                    resourceContainer.appendChild(card);
                });
            }
        });
    }
    function submitOrder() {
        return __awaiter(this, void 0, void 0, function* () {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                alert('Будь ласка, увійдіть в систему');
                window.location.href = 'index.html';
                return;
            }
            const user = JSON.parse(userStr);
            if (!currentService)
                return;
            const startDateInput = document.getElementById('startDate');
            const dateStr = startDateInput.value; // "dd.mm.yyyy"
            if (!dateStr) {
                alert('Оберіть дату початку кампанії');
                return;
            }
            const endDateInput = document.getElementById('endDate');
            const endDateStr = endDateInput.value; // "dd.mm.yyyy"
            let end_date = null;
            if (endDateStr) {
                const endParts = endDateStr.split('.');
                end_date = `${endParts[2]}-${endParts[1]}-${endParts[0]}`;
            }
            // Convert dd.mm.yyyy to yyyy-mm-dd for Postgres
            const parts = dateStr.split('.');
            const event_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
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
                    alert(`Замовлення #${data.orderId} успішно створено!`);
                    window.location.href = 'my-orders.html';
                }
                else {
                    alert('Помилка при створенні замовлення');
                }
            }
            catch (e) {
                console.error(e);
                alert('Помилка з\'єднання');
            }
        });
    }
    document.addEventListener('DOMContentLoaded', () => {
        initPage();
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        let startPicker;
        let endPicker;
        // Flatpickr init
        if (startDateInput && typeof flatpickr !== 'undefined') {
            startPicker = flatpickr(startDateInput, {
                locale: "uk",
                dateFormat: "d.m.Y",
                minDate: "today",
                onChange: function (selectedDates, dateStr, instance) {
                    if (endPicker && selectedDates.length > 0) {
                        // Встановлюємо мінімальну дату для кінцевої дати таку ж, як початкова
                        endPicker.set('minDate', selectedDates[0]);
                        // Якщо обрана кінцева дата менша за нову початкову, очищаємо її
                        const currentEndDate = endPicker.selectedDates[0];
                        if (currentEndDate && currentEndDate < selectedDates[0]) {
                            endPicker.clear();
                        }
                    }
                }
            });
        }
        if (endDateInput && typeof flatpickr !== 'undefined') {
            endPicker = flatpickr(endDateInput, {
                locale: "uk",
                dateFormat: "d.m.Y",
                minDate: "today"
            });
        }
        const payBtn = document.getElementById('submitOrderBtn');
        payBtn === null || payBtn === void 0 ? void 0 : payBtn.addEventListener('click', submitOrder);
    });
})();
