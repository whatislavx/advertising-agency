import { Modal } from './utils/Modal.js';

declare global {
    interface Window {
        editService: (id: number) => void;
        deleteService: (id: number) => Promise<void>;
        toggleModal: (modalId: string) => void;
        openAddServiceModal: () => void;
    }
}

// Допоміжна функція для відкриття/закриття модалок
function toggleModal(modalId: string) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    }
}
window.toggleModal = toggleModal;

const lucide = (window as any).lucide;

// --- Інтерфейси ---
interface Service {
    id: number;
    name: string;
    base_price: string | number;
    type: string;
    description?: string;
    image_path?: string;
    allowed_resources?: number[];
}

interface Resource {
    id: number;
    name: string;
    type: string;
}

let services: Service[] = [];
let resourcesList: Resource[] = [];
let editingServiceId: number | null = null;

function formatCurrency(amount: string | number): string {
    return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
}

const typeTranslations: { [key: string]: string } = {
    'internet': 'Інтернет',
    'outdoor': 'Зовнішня реклама',
    'tv': 'Телебачення',
    'other': 'Інше'
};

function translateType(type: string): string {
    return typeTranslations[type] || type;
}

// --- Custom Select Logic ---
function setupCustomSelect(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const trigger = container.querySelector('.custom-select-trigger') as HTMLElement;
    const menu = container.querySelector('.custom-select-menu') as HTMLElement;
    const arrow = container.querySelector('[data-lucide="chevron-down"]') as HTMLElement;
    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    const selectedText = container.querySelector('.selected-text') as HTMLElement;
    const options = container.querySelectorAll('.custom-option');

    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menu.classList.contains('hidden');
        
        document.querySelectorAll('.custom-select-menu').forEach(m => {
            if (m !== menu) m.classList.add('hidden');
        });
        document.querySelectorAll('[data-lucide="chevron-down"]').forEach(a => {
            if (a !== arrow) (a as HTMLElement).style.transform = 'rotate(0deg)';
        });

        if (isHidden) {
            menu.classList.remove('hidden');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            const text = option.textContent;
            
            if (value && text) {
                if(hiddenInput) hiddenInput.value = value;
                if(selectedText) selectedText.textContent = text;
                
                menu.classList.add('hidden');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        });
    });

    menu.addEventListener('click', (e) => {
        if(containerId === 'resourcesSelectContainer') {
            e.stopPropagation();
        }
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target as Node)) {
            menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    });
}

// --- Логіка попереднього перегляду зображення ---
function setupImagePreview() {
    const input = document.getElementById('service-image-input') as HTMLInputElement;
    const preview = document.getElementById('service-image-preview') as HTMLImageElement;
    const placeholder = document.getElementById('service-image-placeholder');

    if (input) {
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (preview) {
                        preview.src = e.target?.result as string;
                        preview.classList.remove('hidden');
                    }
                    placeholder?.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// --- API запити ---
async function fetchServices() {
    try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('Failed to fetch services');
        services = await response.json();
        renderServices(services);
    } catch (error) {
        console.error('Error fetching services:', error);
    }
}

async function fetchAllResources() {
    try {
        const response = await fetch('/api/resources');
        if (!response.ok) throw new Error('Failed to fetch resources');
        resourcesList = await response.json();
        renderResourcesDropdown();
    } catch (error) {
        console.error('Error fetching resources list:', error);
    }
}

function renderResourcesDropdown() {
    const list = document.getElementById('resources-options-list');
    if (!list) return;

    // Тут ми прибрали (type) як ви просили в попередньому запиті
    list.innerHTML = resourcesList.map(res => `
        <label class="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
            <input type="checkbox" value="${res.id}" class="resource-checkbox w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
            <span class="text-gray-700 text-sm">${res.name}</span>
        </label>
    `).join('');
}

function renderServices(servicesData: Service[]) {
    const tbody = document.getElementById('services-table-body');
    if (!tbody) return;

    if (servicesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Послуг не знайдено</td></tr>`;
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
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openAddServiceModal() {
    editingServiceId = null;
    
    const nameInput = document.getElementById('service-name') as HTMLInputElement;
    const priceInput = document.getElementById('service-price') as HTMLInputElement;
    const typeInput = document.getElementById('service-type') as HTMLInputElement;
    const typeText = document.querySelector('#serviceTypeContainer .selected-text');
    
    const fileInput = document.getElementById('service-image-input') as HTMLInputElement;
    const preview = document.getElementById('service-image-preview') as HTMLImageElement;
    const placeholder = document.getElementById('service-image-placeholder');
    const descriptionInput = document.getElementById('service-description') as HTMLTextAreaElement;
    
    // Reset inputs
    if(nameInput) nameInput.value = '';
    if(priceInput) priceInput.value = '';
    if(typeInput) typeInput.value = 'internet';
    if(typeText) typeText.textContent = 'Інтернет';
    if (descriptionInput) descriptionInput.value = '';

    // Reset image inputs
    if (fileInput) fileInput.value = '';
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    placeholder?.classList.remove('hidden');

    // Uncheck resources
    document.querySelectorAll('.resource-checkbox').forEach((cb: any) => cb.checked = false);
    const resTriggerText = document.querySelector('#resourcesSelectContainer .selected-text');
    if(resTriggerText) resTriggerText.textContent = 'Обрати ресурси...';

    const header = document.querySelector('#serviceModal h3');
    if (header) header.textContent = 'Додати послугу';

    toggleModal('serviceModal');
}
(window as any).openAddServiceModal = openAddServiceModal;

(window as any).editService = function(id: number) {
    const service = services.find(s => s.id === id);
    if (!service) return;

    editingServiceId = id;

    (document.getElementById('service-name') as HTMLInputElement).value = service.name;
    (document.getElementById('service-price') as HTMLInputElement).value = service.base_price.toString();
    
    const typeInput = document.getElementById('service-type') as HTMLInputElement;
    const typeText = document.querySelector('#serviceTypeContainer .selected-text');
    
    const descriptionInput = document.getElementById('service-description') as HTMLTextAreaElement;
    if (descriptionInput) descriptionInput.value = service.description || '';
    
    if (typeInput) typeInput.value = service.type || 'internet';
    if (typeText) {
        const typeMap: {[key: string]: string} = {
            'internet': 'Інтернет',
            'outdoor': 'Зовнішня',
            'tv': 'ТБ'
        };
        typeText.textContent = typeMap[service.type || 'internet'] || 'Інтернет';
    }

    // --- Логіка відображення поточного зображення ---
    const preview = document.getElementById('service-image-preview') as HTMLImageElement;
    const placeholder = document.getElementById('service-image-placeholder');
    const fileInput = document.getElementById('service-image-input') as HTMLInputElement;
    
    if (fileInput) fileInput.value = ''; // Скидаємо файл

    if (service.image_path) {
        if (preview) {
            preview.src = service.image_path; // Показуємо існуюче фото з сервера
            preview.classList.remove('hidden');
        }
        placeholder?.classList.add('hidden');
    } else {
        if (preview) preview.classList.add('hidden');
        placeholder?.classList.remove('hidden');
    }
    // ----------------------------------------------

    // Pre-select resources
    const checkBoxes = document.querySelectorAll('.resource-checkbox');
    let selectedCount = 0;
    checkBoxes.forEach((cb: any) => {
        const val = parseInt(cb.value);
        if (service.allowed_resources && service.allowed_resources.includes(val)) {
            cb.checked = true;
            selectedCount++;
        } else {
            cb.checked = false;
        }
    });

    const resTriggerText = document.querySelector('#resourcesSelectContainer .selected-text');
    if(resTriggerText) resTriggerText.textContent = selectedCount > 0 ? `Обрано: ${selectedCount}` : 'Обрати ресурси...';

    const header = document.querySelector('#serviceModal h3');
    if (header) header.textContent = 'Редагувати послугу';

    toggleModal('serviceModal');
};

async function handleSaveService() {
    const nameInput = document.getElementById('service-name') as HTMLInputElement;
    const priceInput = document.getElementById('service-price') as HTMLInputElement;
    const typeInput = document.getElementById('service-type') as HTMLInputElement;
    const fileInput = document.getElementById('service-image-input') as HTMLInputElement; // Отримуємо input файлу
    const descriptionInput = document.getElementById('service-description') as HTMLTextAreaElement;
    const description = descriptionInput ? descriptionInput.value.trim() : '';

    const name = nameInput.value.trim();
    const base_price = priceInput.value; // Беремо як рядок
    const type = typeInput.value;

    const selectedResources: number[] = [];
    document.querySelectorAll('.resource-checkbox:checked').forEach((cb: any) => {
        selectedResources.push(parseInt(cb.value));
    });

    if (!name || !base_price) {
        await Modal.alert('Будь ласка, заповніть всі поля коректно');
        return;
    }

    // --- Використовуємо FormData для відправки файлу ---
    const formData = new FormData();
    formData.append('name', name);
    formData.append('base_price', base_price);
    formData.append('type', type);
    formData.append('description', description);
    formData.append('resourceIds', JSON.stringify(selectedResources));

    // Якщо файл обрано, додаємо його
    if (fileInput.files && fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
    }
    // --------------------------------------------------
    
    try {
        let response;
        if (editingServiceId) {
            response = await fetch(`/api/services/${editingServiceId}`, {
                method: 'PATCH',
                body: formData // ВІДПРАВЛЯЄМО FORMDATA (без header Content-Type!)
            });
        } else {
            response = await fetch('/api/services', {
                method: 'POST',
                body: formData // ВІДПРАВЛЯЄМО FORMDATA
            });
        }

        if (response.ok) {
            toggleModal('serviceModal');
            fetchServices();
        } else {
            const data = await response.json();
            await Modal.alert(`Помилка при збереженні послуги: ${data.message || 'Невідома помилка'}`);
        }
    } catch (error) {
        console.error(error);
        await Modal.alert('Помилка з\'єднання');
    }
}

(window as any).deleteService = async function(id: number) {
    if(await Modal.confirm('Ви впевнені, що хочете видалити цю послугу?')) {
        try {
            const response = await fetch(`/api/services/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchServices();
            } else {
                const data = await response.json();
                await Modal.alert(`Не вдалося видалити послугу: ${data.message || 'Невідома помилка'}`);
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            await Modal.alert('Помилка з\'єднання');
        }
    }
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
            const target = event.target as HTMLElement;
            if (target.classList.contains("modal-overlay")) {
                target.classList.add("hidden");
                document.body.style.overflow = "";
            }
        });
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}