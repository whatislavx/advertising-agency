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
// Допоміжна функція для відкриття/закриття модалок
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal)
        return;
    if (modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }
    else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    }
}
// Експортуємо функцію в window
window.toggleModal = toggleModal;
(function () {
    const lucide = window.lucide;
    let services = [];
    let resources = [];
    let editingServiceId = null;
    let editingResourceId = null;
    function formatCurrency(amount) {
        return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }
    const typeTranslations = {
        'equipment': 'Обладнання',
        'personnel': 'Персонал',
        'internet': 'Інтернет',
        'outdoor': 'Зовнішня реклама',
        'tv': 'Телебачення',
        'radio': 'Радіо',
        'print': 'Друкована реклама',
        'other': 'Інше'
    };
    function translateType(type) {
        return typeTranslations[type] || type;
    }
    // --- Custom Select Logic ---
    function setupCustomSelect(containerId) {
        const container = document.getElementById(containerId);
        if (!container)
            return;
        const trigger = container.querySelector('.custom-select-trigger');
        const menu = container.querySelector('.custom-select-menu');
        const arrow = container.querySelector('[data-lucide="chevron-down"]');
        const hiddenInput = container.querySelector('input[type="hidden"]');
        const selectedText = container.querySelector('.selected-text');
        const options = container.querySelectorAll('.custom-option');
        if (!trigger || !menu || !hiddenInput || !selectedText)
            return;
        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menu.classList.contains('hidden');
            // Close all other open dropdowns
            document.querySelectorAll('.custom-select-menu').forEach(m => {
                if (m !== menu)
                    m.classList.add('hidden');
            });
            document.querySelectorAll('[data-lucide="chevron-down"]').forEach(a => {
                if (a !== arrow)
                    a.style.transform = 'rotate(0deg)';
            });
            if (isHidden) {
                menu.classList.remove('hidden');
                if (arrow)
                    arrow.style.transform = 'rotate(180deg)';
            }
            else {
                menu.classList.add('hidden');
                if (arrow)
                    arrow.style.transform = 'rotate(0deg)';
            }
        });
        // Select option
        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.getAttribute('data-value');
                const text = option.textContent;
                if (value && text) {
                    hiddenInput.value = value;
                    selectedText.textContent = text;
                    menu.classList.add('hidden');
                    if (arrow)
                        arrow.style.transform = 'rotate(0deg)';
                }
            });
        });
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                menu.classList.add('hidden');
                if (arrow)
                    arrow.style.transform = 'rotate(0deg)';
            }
        });
    }
    // --- API запити ---
    function fetchServices() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/services');
                if (!response.ok)
                    throw new Error('Failed to fetch services');
                services = yield response.json();
                renderServices(services);
            }
            catch (error) {
                console.error('Error fetching services:', error);
            }
        });
    }
    function fetchResources() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/resources');
                if (!response.ok)
                    throw new Error('Failed to fetch resources');
                resources = yield response.json();
                renderResources(resources);
            }
            catch (error) {
                console.error('Error fetching resources:', error);
            }
        });
    }
    // --- Рендеринг ---
    function renderServices(servicesData) {
        const tbody = document.getElementById('services-table-body');
        if (!tbody)
            return;
        if (servicesData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Послуг не знайдено</td></tr>`;
            return;
        }
        tbody.innerHTML = servicesData.map(service => `
            <tr>
                <td class="text-gray-600 text-sm text-left">SRV-${service.id.toString().padStart(3, '0')}</td>
                <td class="text-primary font-medium text-left">${service.name}</td>
                <td class="text-left"><span class="badge badge-blue">${translateType(service.type || 'other')}</span></td>
                <td class="text-left text-primary font-bold">${formatCurrency(service.base_price)}</td>
                <td class="text-center">
                    <div class="flex justify-center gap-2">
                        <button class="btn-icon text-blue-600 hover:bg-blue-50" onclick="editService(${service.id})">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button class="btn-icon text-red-600 hover:bg-red-50" onclick="deleteService(${service.id})">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined')
            lucide.createIcons();
    }
    function renderResources(resourcesData) {
        const tbody = document.getElementById('resources-table-body');
        if (!tbody)
            return;
        if (resourcesData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Ресурсів не знайдено</td></tr>`;
            return;
        }
        tbody.innerHTML = resourcesData.map(resource => `
            <tr>
                <td class="text-gray-600 text-sm text-left">RES-${resource.id.toString().padStart(3, '0')}</td>
                <td class="text-primary font-medium text-left">${resource.name}</td>
                <td class="text-left"><span class="badge badge-gray">${translateType(resource.type)}</span></td>
                <td class="text-left text-primary font-bold">${formatCurrency(resource.cost)}</td>
                <td class="text-center">
                    <span class="badge ${resource.is_available ? 'badge-green' : 'badge-red'}">
                        ${resource.is_available ? 'Доступний' : 'Не доступний'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="flex justify-center gap-2">
                        <button class="btn-icon text-blue-600 hover:bg-blue-50" onclick="editResource(${resource.id})">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button class="btn-icon text-red-600 hover:bg-red-50" onclick="deleteResource(${resource.id})">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined')
            lucide.createIcons();
    }
    // --- Логіка Послуг (Service) ---
    function openAddServiceModal() {
        editingServiceId = null;
        const nameInput = document.getElementById('service-name');
        const priceInput = document.getElementById('service-price');
        const typeInput = document.getElementById('service-type');
        const typeText = document.querySelector('#serviceTypeContainer .selected-text');
        if (nameInput)
            nameInput.value = '';
        if (priceInput)
            priceInput.value = '';
        if (typeInput)
            typeInput.value = 'internet';
        if (typeText)
            typeText.textContent = 'Інтернет';
        const header = document.querySelector('#serviceModal h3');
        if (header)
            header.textContent = 'Додати послугу';
        toggleModal('serviceModal');
    }
    window.openAddServiceModal = openAddServiceModal;
    window.editService = function (id) {
        const service = services.find(s => s.id === id);
        if (!service)
            return;
        editingServiceId = id;
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-price').value = service.base_price.toString();
        const typeInput = document.getElementById('service-type');
        const typeText = document.querySelector('#serviceTypeContainer .selected-text');
        if (typeInput)
            typeInput.value = service.type || 'internet';
        if (typeText) {
            // Map type to text
            const typeMap = {
                'internet': 'Інтернет',
                'outdoor': 'Зовнішня',
                'tv': 'ТБ'
            };
            typeText.textContent = typeMap[service.type || 'internet'] || 'Інтернет';
        }
        const header = document.querySelector('#serviceModal h3');
        if (header)
            header.textContent = 'Редагувати послугу';
        toggleModal('serviceModal');
    };
    function handleSaveService() {
        return __awaiter(this, void 0, void 0, function* () {
            const nameInput = document.getElementById('service-name');
            const priceInput = document.getElementById('service-price');
            const typeInput = document.getElementById('service-type');
            const name = nameInput.value.trim();
            const base_price = parseFloat(priceInput.value);
            const type = typeInput.value;
            if (!name || isNaN(base_price)) {
                alert('Будь ласка, заповніть всі поля коректно');
                return;
            }
            const payload = { name, base_price, type };
            try {
                let response;
                if (editingServiceId) {
                    // UPDATE (PATCH)
                    response = yield fetch(`/api/services/${editingServiceId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                else {
                    // CREATE (POST)
                    response = yield fetch('/api/services', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                if (response.ok) {
                    toggleModal('serviceModal');
                    fetchServices();
                }
                else {
                    alert('Помилка при збереженні послуги');
                }
            }
            catch (error) {
                console.error(error);
                alert('Помилка з\'єднання');
            }
        });
    }
    window.deleteService = function (id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (confirm('Ви впевнені, що хочете видалити цю послугу?')) {
                try {
                    const response = yield fetch(`/api/services/${id}`, { method: 'DELETE' });
                    if (response.ok) {
                        fetchServices();
                    }
                    else {
                        alert('Не вдалося видалити послугу');
                    }
                }
                catch (error) {
                    console.error('Error deleting service:', error);
                }
            }
        });
    };
    // --- Логіка Ресурсів (Resource) ---
    function openAddResourceModal() {
        editingResourceId = null;
        const nameInput = document.getElementById('resource-name');
        const costInput = document.getElementById('resource-cost');
        const typeInput = document.getElementById('resource-type');
        const typeText = document.querySelector('#resourceTypeContainer .selected-text');
        const availableInput = document.getElementById('resAvailable');
        if (nameInput)
            nameInput.value = '';
        if (costInput)
            costInput.value = '';
        if (typeInput)
            typeInput.value = 'equipment';
        if (typeText)
            typeText.textContent = 'Обладнання';
        if (availableInput)
            availableInput.checked = true;
        const header = document.querySelector('#resourceModal h3');
        if (header)
            header.textContent = 'Додати ресурс';
        toggleModal('resourceModal');
    }
    window.openAddResourceModal = openAddResourceModal;
    window.editResource = function (id) {
        const resource = resources.find(r => r.id === id);
        if (!resource)
            return;
        editingResourceId = id;
        document.getElementById('resource-name').value = resource.name;
        document.getElementById('resource-cost').value = resource.cost.toString();
        const typeInput = document.getElementById('resource-type');
        const typeText = document.querySelector('#resourceTypeContainer .selected-text');
        if (typeInput)
            typeInput.value = resource.type;
        if (typeText) {
            const typeMap = {
                'equipment': 'Обладнання',
                'personnel': 'Персонал'
            };
            typeText.textContent = typeMap[resource.type] || 'Обладнання';
        }
        document.getElementById('resAvailable').checked = resource.is_available;
        const header = document.querySelector('#resourceModal h3');
        if (header)
            header.textContent = 'Редагувати ресурс';
        toggleModal('resourceModal');
    };
    function handleSaveResource() {
        return __awaiter(this, void 0, void 0, function* () {
            const nameInput = document.getElementById('resource-name');
            const costInput = document.getElementById('resource-cost');
            const typeInput = document.getElementById('resource-type');
            const availableInput = document.getElementById('resAvailable');
            const name = nameInput.value.trim();
            const cost = parseFloat(costInput.value);
            const type = typeInput.value;
            const is_available = availableInput.checked;
            if (!name || isNaN(cost)) {
                alert('Будь ласка, заповніть всі поля коректно');
                return;
            }
            const payload = { name, cost, type, is_available };
            try {
                let response;
                if (editingResourceId) {
                    // UPDATE (PATCH)
                    // Для коректної роботи необхідний роут PATCH /api/resources/:id на бекенді
                    response = yield fetch(`/api/resources/${editingResourceId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                else {
                    // CREATE (POST)
                    response = yield fetch('/api/resources', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                if (response && response.ok) {
                    toggleModal('resourceModal');
                    fetchResources();
                }
                else {
                    const errData = yield (response === null || response === void 0 ? void 0 : response.json());
                    alert(`Помилка при збереженні ресурсу: ${(errData === null || errData === void 0 ? void 0 : errData.message) || 'Невідома помилка'}`);
                }
            }
            catch (error) {
                console.error(error);
                alert('Помилка з\'єднання');
            }
        });
    }
    window.deleteResource = function (id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (confirm('Ви впевнені, що хочете видалити цей ресурс?')) {
                try {
                    const response = yield fetch(`/api/resources/${id}`, { method: 'DELETE' });
                    if (response.ok) {
                        fetchResources();
                    }
                    else {
                        alert('Не вдалося видалити ресурс');
                    }
                }
                catch (error) {
                    console.error('Error deleting resource:', error);
                }
            }
        });
    };
    // --- Ініціалізація ---
    document.addEventListener("DOMContentLoaded", () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        setupCustomSelect('serviceTypeContainer');
        setupCustomSelect('resourceTypeContainer');
        fetchServices();
        fetchResources();
        // 1. Прив'язка статичних кнопок "Додати" за ID
        const addServiceBtn = document.getElementById('btn-add-service');
        if (addServiceBtn) {
            addServiceBtn.addEventListener('click', () => {
                openAddServiceModal();
            });
        }
        const addResourceBtn = document.getElementById('btn-add-resource');
        if (addResourceBtn) {
            addResourceBtn.addEventListener('click', () => {
                openAddResourceModal();
            });
        }
        // 2. Прив'язка кнопок "Зберегти" в модальних вікнах
        const saveServiceBtn = document.getElementById('save-service-btn');
        if (saveServiceBtn) {
            saveServiceBtn.addEventListener('click', handleSaveService);
        }
        const saveResourceBtn = document.getElementById('save-resource-btn');
        if (saveResourceBtn) {
            saveResourceBtn.addEventListener('click', handleSaveResource);
        }
        // 3. Закриття модалок при кліку на Overlay
        window.addEventListener("click", (event) => {
            const target = event.target;
            if (target.classList.contains("modal-overlay")) {
                target.classList.add("hidden");
                document.body.style.overflow = "";
            }
        });
        const saveServiceBtn = document.getElementById('save-service-btn');
        if (saveServiceBtn) {
            saveServiceBtn.addEventListener('click', handleSaveService);
        }
        const saveResourceBtn = document.getElementById('save-resource-btn');
        if (saveResourceBtn) {
            saveResourceBtn.addEventListener('click', handleSaveResource);
        }
    });
})();
