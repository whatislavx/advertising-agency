(function() {
const flatpickr = (window as any).flatpickr;

interface Service {
    id: number;
    name: string;
    base_price: string | number; // API може повернути рядок з Postgres
}

interface Resource {
    id: number;
    name: string;
    cost: string | number;
    type: string;
}

interface SelectedItem {
    id: number;
    name: string;
    price: number;
}

let services: Service[] = [];
let resources: Resource[] = [];
let currentService: Service | undefined;
let selectedItems: SelectedItem[] = [];
let currentTotal = 0;

// Функція завантаження даних з API
async function fetchData() {
    try {
        const [servicesRes, resourcesRes] = await Promise.all([
            fetch('/api/services'),
            fetch('/api/resources?available=true')
        ]);

        if (servicesRes.ok) services = await servicesRes.json();
        if (resourcesRes.ok) resources = await resourcesRes.json();
        
    } catch (e) {
        console.error("Failed to fetch data from backend", e);
        alert("Не вдалося завантажити прайс-лист. Перевірте підключення до сервера.");
    }
}

function getServiceIdFromUrl(): number {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    return id ? parseInt(id) : 1;
}

function formatCurrency(num: number): string {
    return num.toLocaleString('uk-UA') + ' грн';
}

function updateSummary() {
    const summaryResources = document.getElementById('summaryResources');
    const totalEl = document.getElementById('totalPrice');

    if (summaryResources) {
        if (selectedItems.length > 0) {
            summaryResources.innerHTML = selectedItems.map(item => 
                `<span class="badge badge-gray bg-white border border-gray-200 text-xs px-2 py-1 rounded">${item.name}</span>`
            ).join('');
        } else {
            summaryResources.innerHTML = '<span class="text-gray-400 text-sm italic">Немає додаткових ресурсів</span>';
        }
    }

    if (totalEl) totalEl.innerText = formatCurrency(currentTotal);
}

function updateDateSummary() {
    const startDateInput = document.getElementById('startDate') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;
    const summaryDates = document.getElementById('summaryDates');
    
    if (summaryDates) {
        const start = startDateInput.value;
        const end = endDateInput.value;
        
        if (start) {
            summaryDates.innerHTML = `
                <i data-lucide="calendar" class="w-4 h-4 text-gray-400"></i>
                <span>${start} ${end ? '→ ' + end : ''}</span>
            `;
            if ((window as any).lucide) (window as any).lucide.createIcons();
        } else {
            summaryDates.innerHTML = '<span class="text-gray-400 italic">Оберіть дату</span>';
        }
    }
}

function toggleResource(element: HTMLElement, resId: number) {
    const resource = resources.find(r => r.id === resId);
    if (!resource) return;

    element.classList.toggle('selected');
    const isSelected = element.classList.contains('selected');
    const price = Number(resource.cost);

    if (isSelected) {
        currentTotal += price;
        selectedItems.push({ id: resource.id, name: resource.name, price: price });
    } else {
        currentTotal -= price;
        selectedItems = selectedItems.filter(item => item.id !== resource.id);
    }
    updateSummary();
}

async function initPage() {
    await fetchData();

    const serviceId = getServiceIdFromUrl();
    // Знаходимо послугу по ID (важливо: в БД ID може бути number, але з JSON прийти як string, тому ==)
    currentService = services.find(s => s.id == serviceId);

    // Якщо послугу не знайдено, беремо першу або показуємо помилку
    if (!currentService && services.length > 0) currentService = services[0];

    if (currentService) {
        const basePrice = Number(currentService.base_price);
        currentTotal = basePrice;

        const nameEl = document.getElementById('serviceNameDisplay');
        const priceEl = document.getElementById('basePriceDisplay');
        const summaryBaseEl = document.getElementById('summaryBasePrice');

        if (nameEl) nameEl.innerText = currentService.name;
        if (priceEl) priceEl.innerText = formatCurrency(basePrice);
        if (summaryBaseEl) summaryBaseEl.innerText = formatCurrency(basePrice);
        
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
}

async function submitOrder() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        alert('Будь ласка, увійдіть в систему');
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userStr);

    if (!currentService) return;

    const startDateInput = document.getElementById('startDate') as HTMLInputElement;
    const dateStr = startDateInput.value; // "dd.mm.yyyy"
    
    if (!dateStr) {
        alert('Оберіть дату початку кампанії');
        return;
    }

    const endDateInput = document.getElementById('endDate') as HTMLInputElement;
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
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`Замовлення #${data.orderId} успішно створено!`);
            window.location.href = 'my-orders.html';
        } else {
            alert('Помилка при створенні замовлення');
        }
    } catch (e) {
        console.error(e);
        alert('Помилка з\'єднання');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initPage();

    const startDateInput = document.getElementById('startDate') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;
    
    let startPicker: any;
    let endPicker: any;

    // Flatpickr init
    if (startDateInput && typeof flatpickr !== 'undefined') {
        startPicker = flatpickr(startDateInput, {
            locale: "uk",
            dateFormat: "d.m.Y",
            minDate: "today",
            onChange: function(selectedDates: Date[], dateStr: string, instance: any) {
                if (endPicker && selectedDates.length > 0) {
                    // Встановлюємо мінімальну дату для кінцевої дати таку ж, як початкова
                    endPicker.set('minDate', selectedDates[0]);
                    
                    // Якщо обрана кінцева дата менша за нову початкову, очищаємо її
                    const currentEndDate = endPicker.selectedDates[0];
                    if (currentEndDate && currentEndDate < selectedDates[0]) {
                        endPicker.clear();
                    }
                }
                updateDateSummary();
            }
        });
    }
    if (endDateInput && typeof flatpickr !== 'undefined') {
        endPicker = flatpickr(endDateInput, {
            locale: "uk",
            dateFormat: "d.m.Y",
            minDate: "today",
            onChange: function() {
                updateDateSummary();
            }
        });
    }

    const payBtn = document.getElementById('submitOrderBtn');
    payBtn?.addEventListener('click', submitOrder);
});
})();