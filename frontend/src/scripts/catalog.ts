(function() {
    const lucide = (window as any).lucide;

    interface Service {
        id: number;
        name: string;
        type: string;
        base_price: string | number;
    }

    let allServices: Service[] = [];

    async function fetchServices() {
        try {
            const response = await fetch('/api/services');
            if (response.ok) {
                allServices = await response.json();
                filterAndRender();
            }
        } catch (e) {
            console.error("Failed to fetch services", e);
        }
    }

    function formatCurrency(num: number): string {
        return num.toLocaleString('uk-UA') + ' грн';
    }

    function getServiceImage(type: string): string {
        switch (type) {
            case 'tv': return 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop';
            case 'internet': return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop';
            case 'outdoor': return 'https://images.unsplash.com/photo-1541698444083-023c97d3f4b6?w=400&h=300&fit=crop';
            default: return 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop';
        }
    }

    function getServiceDescription(type: string): string {
        switch (type) {
            case 'tv': return 'Рекламні ролики на провідних каналах';
            case 'internet': return 'Таргетована реклама в соціальних мережах';
            case 'outdoor': return 'Реклама на білбордах у центрі міста';
            default: return 'Ефективна реклама для вашого бізнесу';
        }
    }

    function filterAndRender() {
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        const typeInputs = document.querySelectorAll('input[name="type"]');
        
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        let selectedType = 'all';
        typeInputs.forEach((input: any) => {
            if (input.checked) selectedType = input.value;
        });

        console.log('Filtering:', { searchText, selectedType, totalServices: allServices.length });

        const filtered = allServices.filter(service => {
            const matchesSearch = service.name.toLowerCase().includes(searchText);
            const matchesType = selectedType === 'all' || service.type === selectedType;
            return matchesSearch && matchesType;
        });

        console.log('Filtered results:', filtered.length);
        renderServices(filtered);
    }

    function renderServices(services: Service[]) {
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
                          <a
                            href="order-form.html?id=${service.id}"
                            class="btn btn-primary px-6 py-2"
                          >
                            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Замовити
                          </a>
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

        if (searchInput) {
            searchInput.addEventListener('input', filterAndRender);
        }

        typeInputs.forEach(input => {
            input.addEventListener('change', filterAndRender);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
