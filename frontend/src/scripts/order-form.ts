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

interface SelectedItem {
    name: string;
    price: number;
}

const mockDB = {
    services: [
        { id: 1, name: "Зовнішня реклама (Білборди)", basePrice: 15000 },
        { id: 2, name: "Реклама в Instagram", basePrice: 8000 },
        { id: 3, name: "Реклама на ТБ", basePrice: 50000 }
    ] as Service[],
    resources: [
        { id: 1, name: "Оренда камери", price: 3000 },
        { id: 2, name: "Оператор", price: 2500 },
        { id: 3, name: "Монтажер", price: 4000 },
        { id: 4, name: "Копірайтер", price: 2000 },
        { id: 5, name: "Дизайнер", price: 3500 },
        { id: 6, name: "Фотограф", price: 2800 }
    ] as Resource[]
};

let currentTotal = 0;
let selectedItems: SelectedItem[] = [];
let currentService: Service | undefined;

function getServiceIdFromUrl(): number {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    return id ? parseInt(id) : 1;
}

function formatCurrency(num: number): string {
    return num.toLocaleString() + ' грн';
}

function updateSummaryDisplay() {
    const listContainer = document.getElementById('selectedResourcesList');
    const dynamicList = document.getElementById('dynamicList');
    const totalEl = document.getElementById('totalPrice');

    if (dynamicList) {
        dynamicList.innerHTML = '';
        
        if (selectedItems.length > 0) {
            if (listContainer) listContainer.style.display = 'block';
            
            selectedItems.forEach(item => {
                const row = document.createElement('div');
                row.className = 'selected-item';
                
                row.innerHTML = `
                    <span>${item.name}</span>
                    <span class="summary-price-val">+${formatCurrency(item.price)}</span>
                `;
                dynamicList.appendChild(row);
            });
        } else {
            if (listContainer) listContainer.style.display = 'none';
        }
    }

    if (totalEl) {
        totalEl.innerText = formatCurrency(currentTotal);
    }
}

function toggleResource(element: HTMLElement) {
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

function renderPage() {
    const serviceId = getServiceIdFromUrl();
    currentService = mockDB.services.find(s => s.id === serviceId);

    if (!currentService) {
        currentService = mockDB.services[0];
    }

    const serviceNameDisplay = document.getElementById('serviceNameDisplay');
    const basePriceDisplay = document.getElementById('basePriceDisplay');
    const summaryBasePrice = document.getElementById('summaryBasePrice');

    if (serviceNameDisplay) serviceNameDisplay.innerText = currentService.name;
    
    const formattedBasePrice = formatCurrency(currentService.basePrice);
    if (basePriceDisplay) basePriceDisplay.innerText = formattedBasePrice;
    if (summaryBasePrice) summaryBasePrice.innerText = formattedBasePrice;

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

            card.innerHTML = `
                <div class="res-name">${res.name}</div>
                <div class="res-price">+${formatCurrency(res.price)}</div>
            `;

            card.addEventListener('click', () => toggleResource(card));
            
            resourceContainer.appendChild(card);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderPage();

    const startDateInput = document.getElementById('startDate') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;
    
    let endPicker: any;

    if (startDateInput && endDateInput && typeof flatpickr !== 'undefined') {
        const startPicker = flatpickr(startDateInput, {
            locale: "uk",
            dateFormat: "d.m.Y",
            allowInput: false,
            disableMobile: true,
            minDate: "today",
            onChange: function (selectedDates: Date[]) {
                if (selectedDates.length > 0 && endPicker) {
                    const startDate = selectedDates[0];
                    // Оновлюємо мінімальну дату для кінцевого пікера
                    endPicker.set('minDate', startDate);
                    
                    // Якщо вибрана кінцева дата менша за початкову - очищаємо
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
            disableMobile: true,
            minDate: "today"
        });
    }
});
