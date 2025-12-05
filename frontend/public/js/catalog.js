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
    let allServices = [];
    function fetchServices() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/services');
                if (response.ok) {
                    allServices = yield response.json();
                    filterAndRender();
                }
            }
            catch (e) {
                console.error("Failed to fetch services", e);
            }
        });
    }
    function formatCurrency(num) {
        return num.toLocaleString('uk-UA') + ' грн';
    }
    function getServiceImage(type) {
        switch (type) {
            case 'tv': return 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop';
            case 'internet': return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop';
            case 'outdoor': return 'https://images.unsplash.com/photo-1541698444083-023c97d3f4b6?w=400&h=300&fit=crop';
            case 'radio': return 'https://images.unsplash.com/photo-1529154167-6a23e6e7a9c1?w=400&h=300&fit=crop';
            default: return 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop';
        }
    }
    function getServiceDescription(type) {
        switch (type) {
            case 'tv': return 'Рекламні ролики на провідних каналах';
            case 'internet': return 'Таргетована реклама в соціальних мережах';
            case 'outdoor': return 'Реклама на білбордах у центрі міста';
            case 'radio': return 'Аудіореклама на популярних радіостанціях';
            default: return 'Ефективна реклама для вашого бізнесу';
        }
    }
    function filterAndRender() {
        const searchInput = document.getElementById('searchInput');
        const typeInputs = document.querySelectorAll('input[name="type"]');
        const priceInputs = document.querySelectorAll('input[name="price"]');
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        let selectedType = 'all';
        typeInputs.forEach((input) => {
            if (input.checked)
                selectedType = input.value;
        });
        let selectedPrice = 'all';
        priceInputs.forEach((input) => {
            if (input.checked)
                selectedPrice = input.value;
        });
        console.log('Filtering:', { searchText, selectedType, selectedPrice, totalServices: allServices.length });
        const filtered = allServices.filter(service => {
            const matchesSearch = service.name.toLowerCase().includes(searchText);
            const matchesType = selectedType === 'all' || service.type === selectedType;
            const price = Number(service.base_price) || 0;
            let matchesPrice = true;
            if (selectedPrice !== 'all') {
                if (selectedPrice.endsWith('+')) {
                    const min = Number(selectedPrice.replace('+', ''));
                    matchesPrice = price >= min;
                }
                else {
                    const [minStr, maxStr] = selectedPrice.split('-');
                    const min = Number(minStr);
                    const max = Number(maxStr);
                    matchesPrice = price >= min && price <= max;
                }
            }
            return matchesSearch && matchesType && matchesPrice;
        });
        console.log('Filtered results:', filtered.length);
        renderServices(filtered);
    }
    window.handleOrderClick = (serviceId) => __awaiter(this, void 0, void 0, function* () {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                // Send tracking request without awaiting to not delay navigation too much
                fetch('/api/analytics/view', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serviceId, userId: user.id })
                }).catch(e => console.error("Tracking error", e));
            }
            catch (e) {
                console.error("Tracking error", e);
            }
        }
        // Navigate immediately
        window.location.href = `order-form.html?id=${serviceId}`;
    });
    function renderServices(services) {
        const grid = document.getElementById('servicesGrid');
        const countEl = document.getElementById('servicesCount');
        if (countEl) {
            countEl.innerText = `Знайдено послуг: ${services.length}`;
        }
        if (grid) {
            grid.innerHTML = '';
            services.forEach(service => {
                const card = document.createElement('div');
                card.className = 'card flex flex-col';
                card.innerHTML = `
                    <div class="relative h-48 overflow-hidden bg-gray-200">
                        <img
                          src="${getServiceImage(service.type)}"
                          alt="${service.name}"
                          class="w-full h-full object-cover"
                        />
                    </div>
                    <div class="p-5 flex flex-col flex-1">
                        <h3 class="text-lg font-medium text-[#1a3a5c] mb-2">
                          ${service.name}
                        </h3>
                        <p class="text-sm text-gray-600 mb-4 flex-1">
                          ${getServiceDescription(service.type)}
                        </p>
                        <div class="flex items-end justify-between mt-auto">
                          <div>
                            <span class="text-sm text-gray-500 block mb-1">Від</span>
                            <p class="text-xl font-medium text-[#1a3a5c] leading-none">${formatCurrency(Number(service.base_price))}</p>
                          </div>
                          <button
                            onclick="handleOrderClick(${service.id})"
                            class="btn btn-primary px-6 py-2"
                          >
                            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Замовити
                          </button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
            lucide.createIcons();
        }
    }
    function init() {
        fetchServices();
        const searchInput = document.getElementById('searchInput');
        const typeInputs = document.querySelectorAll('input[name="type"]');
        const priceInputs = document.querySelectorAll('input[name="price"]');
        if (searchInput) {
            searchInput.addEventListener('input', filterAndRender);
        }
        typeInputs.forEach(input => {
            input.addEventListener('change', filterAndRender);
        });
        priceInputs.forEach(input => {
            input.addEventListener('change', filterAndRender);
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
})();
