export {};

declare const flatpickr: any;

interface Service {
    id: number;
    name: string;
    basePrice: number;
}

interface Resource {
    id: number;
    name: string;
    price: number;
}

interface MockDB {
    services: Service[];
    resources: Resource[];
}

const mockDB: MockDB = {
    services: [
        { id: 1, name: "Зовнішня реклама (Білборди)", basePrice: 15000 },
        { id: 2, name: "Реклама в Instagram", basePrice: 8000 },
        { id: 3, name: "Реклама на ТБ", basePrice: 50000 }
    ],
    resources: [
        { id: 1, name: "Оренда камери", price: 3000 },
        { id: 2, name: "Оператор", price: 2500 },
        { id: 3, name: "Монтажер", price: 4000 },
        { id: 4, name: "Копірайтер", price: 2000 },
        { id: 5, name: "Дизайнер", price: 3500 },
        { id: 6, name: "Фотограф", price: 2800 }
    ]
};

let currentTotal = 0;
let selectedItems: { name: string; price: number }[] = [];
let currentService: Service | undefined;

function getServiceIdFromUrl(): number {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    return id ? parseInt(id) : 1; // Default to 1 if no ID provided
}

function renderPage(): void {
    const serviceId = getServiceIdFromUrl();
    currentService = mockDB.services.find(s => s.id === serviceId);

    if (!currentService) {
        // Fallback if ID is invalid
        currentService = mockDB.services[0];
    }

    const serviceNameDisplay = document.getElementById('serviceNameDisplay');
    const basePriceDisplay = document.getElementById('basePriceDisplay');
    const summaryBasePrice = document.getElementById('summaryBasePrice');

    if (serviceNameDisplay) serviceNameDisplay.innerText = currentService.name;
    if (basePriceDisplay) basePriceDisplay.innerText = formatCurrency(currentService.basePrice);
    if (summaryBasePrice) summaryBasePrice.innerText = formatCurrency(currentService.basePrice);
    
    currentTotal = currentService.basePrice;
    updateSummaryDisplay();

    const resourceContainer = document.getElementById('resourceContainer');
    if (resourceContainer) {
        resourceContainer.innerHTML = ''; 

        mockDB.resources.forEach(res => {
            const card = document.createElement('div');
            card.className = 'resource-item'; 
            card.setAttribute('data-price', res.price.toString());
            card.setAttribute('data-name', res.name);
            card.setAttribute('data-id', res.id.toString());
            
            card.addEventListener('click', function() { toggleResource(this as HTMLElement); });

            card.innerHTML = `
                <div class="res-name">${res.name}</div>
                <div class="res-price">+${formatCurrency(res.price)}</div>
            `;

            resourceContainer.appendChild(card);
        });
    }
}

function toggleResource(element: HTMLElement): void {
    element.classList.toggle('selected');
    const priceAttr = element.getAttribute('data-price');
    const name = element.getAttribute('data-name');
    
    if (!priceAttr || !name) return;

    const price = parseInt(priceAttr);
    const isSelected = element.classList.contains('selected');

    if (isSelected) {
        currentTotal += price;
        selectedItems.push({ name, price });
    } else {
        currentTotal -= price;
        selectedItems = selectedItems.filter(item => item.name !== name);
    }
    updateSummaryDisplay();
}

function updateSummaryDisplay(): void {
    const listContainer = document.getElementById('selectedResourcesList');
    const dynamicList = document.getElementById('dynamicList');
    const totalEl = document.getElementById('totalPrice');

    if (dynamicList) dynamicList.innerHTML = '';

    if (selectedItems.length > 0) {
        if (listContainer) listContainer.style.display = 'block';
        selectedItems.forEach(item => {
            const row = document.createElement('div');
            row.className = 'selected-item';
            row.innerHTML = `<span>${item.name}</span><span class="summary-price-val">${formatCurrency(item.price)}</span>`;
            if (dynamicList) dynamicList.appendChild(row);
        });
    } else {
        if (listContainer) listContainer.style.display = 'none';
    }
    if (totalEl) totalEl.innerText = formatCurrency(currentTotal);
}

function formatCurrency(num: number): string {
    return num.toLocaleString() + ' грн';
}

document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    let endPicker: any;

    if (startDateInput && endDateInput) {
        const startPicker = flatpickr(startDateInput, {
            locale: "uk",
            dateFormat: "d.m.Y",
            allowInput: false,
            disableMobile: "true",
            minDate: "today",
            onChange: function(selectedDates: any[]) {
                if (selectedDates.length > 0 && endPicker) {
                    const startDate = selectedDates[0];
                    endPicker.set('minDate', startDate);
                    
                    const endDate = endPicker.selectedDates[0];
                    if (endDate && endDate < startDate) {
                        endPicker.clear();
                    }
                }
            }
        });

        endPicker = flatpickr(endDateInput, {
            locale: "uk",
            dateFormat: "d.m.Y",
            allowInput: false,
            disableMobile: "true",
            minDate: "today"
        });
    }

    renderPage();
});
