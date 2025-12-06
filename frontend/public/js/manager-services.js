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
window.toggleModal = toggleModal;
const lucide = window.lucide;
let services = [];
let resourcesList = [];
let editingServiceId = null;
function formatCurrency(amount) {
    return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
}
const typeTranslations = {
    'internet': 'Інтернет',
    'outdoor': 'Зовнішня реклама',
    'tv': 'Телебачення',
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
    if (!trigger || !menu)
        return;
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menu.classList.contains('hidden');
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
    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            const text = option.textContent;
            if (value && text) {
                if (hiddenInput)
                    hiddenInput.value = value;
                if (selectedText)
                    selectedText.textContent = text;
                menu.classList.add('hidden');
                if (arrow)
                    arrow.style.transform = 'rotate(0deg)';
            }
        });
    });
    menu.addEventListener('click', (e) => {
        if (containerId === 'resourcesSelectContainer') {
            e.stopPropagation();
        }
    });
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            menu.classList.add('hidden');
            if (arrow)
                arrow.style.transform = 'rotate(0deg)';
        }
    });
}
// --- Логіка попереднього перегляду зображення ---
function setupImagePreview() {
    const input = document.getElementById('service-image-input');
    const preview = document.getElementById('service-image-preview');
    const placeholder = document.getElementById('service-image-placeholder');
    if (input) {
        input.addEventListener('change', () => {
            var _a;
            const file = (_a = input.files) === null || _a === void 0 ? void 0 : _a[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    var _a;
                    if (preview) {
                        preview.src = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
                        preview.classList.remove('hidden');
                    }
                    placeholder === null || placeholder === void 0 ? void 0 : placeholder.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }
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
function fetchAllResources() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('/api/resources');
            if (!response.ok)
                throw new Error('Failed to fetch resources');
            resourcesList = yield response.json();
            renderResourcesDropdown();
        }
        catch (error) {
            console.error('Error fetching resources list:', error);
        }
    });
}
function renderResourcesDropdown() {
    const list = document.getElementById('resources-options-list');
    if (!list)
        return;
    // Тут ми прибрали (type) як ви просили в попередньому запиті
    list.innerHTML = resourcesList.map(res => `
        <label class="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
            <input type="checkbox" value="${res.id}" class="resource-checkbox w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
            <span class="text-gray-700 text-sm">${res.name}</span>
        </label>
    `).join('');
}
function renderServices(servicesData) {
    const tbody = document.getElementById('services-table-body');
    if (!tbody)
        return;
    if (servicesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Послуг не знайдено</td></tr>`;
        return;
    }
    tbody.innerHTML = servicesData.map(service => `
        <tr>
            <td class="text-gray-600 text-sm text-left">SRV-${service.id.toString().padStart(3, '0')}</td>
            <td class="text-primary font-medium text-left flex items-center gap-2">
               ${service.image_path ? `<img src="${service.image_path}" class="w-8 h-8 rounded object-cover border border-gray-200" alt="">` : ''}
               ${service.name}
            </td>
            <td class="text-left"><span class="badge badge-blue">${translateType(service.type || 'other')}</span></td>
            <td class="text-left text-primary font-bold">${formatCurrency(service.base_price)}</td>

            <td class="text-center">
                <span class="badge ${service.is_available ? 'badge-green' : 'badge-red'}">
                    ${service.is_available ? 'Активна' : 'Недоступна'}
                </span>
            </td>

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
function openAddServiceModal() {
    editingServiceId = null;
    const nameInput = document.getElementById('service-name');
    const priceInput = document.getElementById('service-price');
    const typeInput = document.getElementById('service-type');
    const typeText = document.querySelector('#serviceTypeContainer .selected-text');
    const fileInput = document.getElementById('service-image-input');
    const preview = document.getElementById('service-image-preview');
    const placeholder = document.getElementById('service-image-placeholder');
    const descriptionInput = document.getElementById('service-description');
    const availableInput = document.getElementById('serviceAvailable');
    // Reset inputs
    if (nameInput)
        nameInput.value = '';
    if (priceInput)
        priceInput.value = '';
    if (typeInput)
        typeInput.value = 'internet';
    if (typeText)
        typeText.textContent = 'Інтернет';
    if (descriptionInput)
        descriptionInput.value = '';
    if (availableInput)
        availableInput.checked = true;
    // Reset image inputs
    if (fileInput)
        fileInput.value = '';
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    placeholder === null || placeholder === void 0 ? void 0 : placeholder.classList.remove('hidden');
    // Uncheck resources
    document.querySelectorAll('.resource-checkbox').forEach((cb) => cb.checked = false);
    const resTriggerText = document.querySelector('#resourcesSelectContainer .selected-text');
    if (resTriggerText)
        resTriggerText.textContent = 'Обрати ресурси...';
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
    const availableInput = document.getElementById('serviceAvailable');
    const descriptionInput = document.getElementById('service-description');
    if (descriptionInput)
        descriptionInput.value = service.description || '';
    if (availableInput)
        availableInput.checked = service.is_available;
    if (typeInput)
        typeInput.value = service.type || 'internet';
    if (typeText) {
        const typeMap = {
            'internet': 'Інтернет',
            'outdoor': 'Зовнішня',
            'tv': 'ТБ'
        };
        typeText.textContent = typeMap[service.type || 'internet'] || 'Інтернет';
    }
    // --- Логіка відображення поточного зображення ---
    const preview = document.getElementById('service-image-preview');
    const placeholder = document.getElementById('service-image-placeholder');
    const fileInput = document.getElementById('service-image-input');
    if (fileInput)
        fileInput.value = ''; // Скидаємо файл
    if (service.image_path) {
        if (preview) {
            preview.src = service.image_path; // Показуємо існуюче фото з сервера
            preview.classList.remove('hidden');
        }
        placeholder === null || placeholder === void 0 ? void 0 : placeholder.classList.add('hidden');
    }
    else {
        if (preview)
            preview.classList.add('hidden');
        placeholder === null || placeholder === void 0 ? void 0 : placeholder.classList.remove('hidden');
    }
    // ----------------------------------------------
    // Pre-select resources
    const checkBoxes = document.querySelectorAll('.resource-checkbox');
    let selectedCount = 0;
    checkBoxes.forEach((cb) => {
        const val = parseInt(cb.value);
        if (service.allowed_resources && service.allowed_resources.includes(val)) {
            cb.checked = true;
            selectedCount++;
        }
        else {
            cb.checked = false;
        }
    });
    const resTriggerText = document.querySelector('#resourcesSelectContainer .selected-text');
    if (resTriggerText)
        resTriggerText.textContent = selectedCount > 0 ? `Обрано: ${selectedCount}` : 'Обрати ресурси...';
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
        const fileInput = document.getElementById('service-image-input'); // Отримуємо input файлу
        const descriptionInput = document.getElementById('service-description');
        const availableInput = document.getElementById('serviceAvailable');
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        const is_available = availableInput ? availableInput.checked : true;
        const name = nameInput.value.trim();
        const base_price = priceInput.value; // Беремо як рядок
        const type = typeInput.value;
        const selectedResources = [];
        document.querySelectorAll('.resource-checkbox:checked').forEach((cb) => {
            selectedResources.push(parseInt(cb.value));
        });
        if (!name || !base_price) {
            yield Modal.alert('Будь ласка, заповніть всі поля коректно');
            return;
        }
        // --- Використовуємо FormData для відправки файлу ---
        const formData = new FormData();
        formData.append('name', name);
        formData.append('base_price', base_price);
        formData.append('type', type);
        formData.append('description', description);
        formData.append('resourceIds', JSON.stringify(selectedResources));
        formData.append('is_available', is_available.toString());
        // Якщо файл обрано, додаємо його
        if (fileInput.files && fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        }
        // --------------------------------------------------
        try {
            let response;
            if (editingServiceId) {
                response = yield fetch(`/api/services/${editingServiceId}`, {
                    method: 'PATCH',
                    body: formData // ВІДПРАВЛЯЄМО FORMDATA (без header Content-Type!)
                });
            }
            else {
                response = yield fetch('/api/services', {
                    method: 'POST',
                    body: formData // ВІДПРАВЛЯЄМО FORMDATA
                });
            }
            if (response.ok) {
                toggleModal('serviceModal');
                fetchServices();
            }
            else {
                const data = yield response.json();
                yield Modal.alert(`Помилка при збереженні послуги: ${data.message || 'Невідома помилка'}`);
            }
        }
        catch (error) {
            console.error(error);
            yield Modal.alert('Помилка з\'єднання');
        }
    });
}
window.deleteService = function (id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield Modal.confirm('Ви впевнені, що хочете видалити цю послугу?')) {
            try {
                const response = yield fetch(`/api/services/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    fetchServices();
                }
                else {
                    const data = yield response.json();
                    yield Modal.alert(`Не вдалося видалити послугу: ${data.message || 'Невідома помилка'}`);
                }
            }
            catch (error) {
                console.error('Error deleting service:', error);
                yield Modal.alert('Помилка з\'єднання');
            }
        }
    });
};
function init() {
    console.log('Manager Services Init started');
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        setupCustomSelect('serviceTypeContainer');
        setupCustomSelect('resourcesSelectContainer');
        fetchServices();
        fetchAllResources();
        // Ініціалізація прев'ю картинки
        setupImagePreview();
        const btnAddService = document.getElementById('btn-add-service');
        if (btnAddService) {
            btnAddService.addEventListener('click', (e) => {
                e.preventDefault();
                openAddServiceModal();
            });
        }
        const saveServiceBtn = document.getElementById('save-service-btn');
        if (saveServiceBtn) {
            saveServiceBtn.addEventListener('click', handleSaveService);
        }
        const modalTriggers = document.querySelectorAll("[data-modal-target]");
        modalTriggers.forEach(trigger => {
            trigger.addEventListener("click", () => {
                const targetId = trigger.getAttribute("data-modal-target");
                if (targetId) {
                    toggleModal(targetId);
                }
            });
        });
        window.addEventListener("click", (event) => {
            const target = event.target;
            if (target.classList.contains("modal-overlay")) {
                target.classList.add("hidden");
                document.body.style.overflow = "";
            }
        });
    }
    catch (error) {
        console.error('Error during initialization:', error);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}
