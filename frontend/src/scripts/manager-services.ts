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

(function() {
    const lucide = (window as any).lucide;
    interface Service {
        id: number;
        name: string;
        base_price: string;
    }

    interface Resource {
        id: number;
        name: string;
        type: string;
        cost: string;
    }

    function formatCurrency(amount: string | number): string {
        return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }

    async function fetchServices() {
        try {
            const response = await fetch('/api/services');
            if (!response.ok) throw new Error('Failed to fetch services');
            const services: Service[] = await response.json();
            renderServices(services);
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    }

    async function fetchResources() {
        try {
            const response = await fetch('/api/resources');
            if (!response.ok) throw new Error('Failed to fetch resources');
            const resources: Resource[] = await response.json();
            renderResources(resources);
        } catch (error) {
            console.error('Error fetching resources:', error);
        }
    }

    function renderServices(services: Service[]) {
        const tbody = document.getElementById('services-table-body');
        if (!tbody) return;

        tbody.innerHTML = services.map(service => `
            <tr>
                <td class="text-gray-600 text-sm">SRV-${service.id.toString().padStart(3, '0')}</td>
                <td class="text-primary font-medium">${service.name}</td>
                <td><span class="badge badge-blue">General</span></td>
                <td class="text-right text-primary font-bold">${formatCurrency(service.base_price)}</td>
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
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function renderResources(resources: Resource[]) {
        const tbody = document.getElementById('resources-table-body');
        if (!tbody) return;

        tbody.innerHTML = resources.map(resource => `
            <tr>
                <td class="text-gray-600 text-sm">RES-${resource.id.toString().padStart(3, '0')}</td>
                <td class="text-primary font-medium">${resource.name}</td>
                <td><span class="badge badge-gray">${resource.type}</span></td>
                <td class="text-right text-primary font-bold">${formatCurrency(resource.cost)}</td>
                <td class="text-center">
                    <span class="badge badge-green">Доступний</span>
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

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Expose functions to window
    (window as any).editService = function(id: number) {
        console.log('Edit service', id);
    };

    (window as any).deleteService = async function(id: number) {
        if(confirm('Are you sure you want to delete this service?')) {
            try {
                const response = await fetch(`/api/services/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    fetchServices();
                } else {
                    alert('Failed to delete service');
                }
            } catch (error) {
                console.error('Error deleting service:', error);
            }
        }
    };

    (window as any).editResource = function(id: number) {
        console.log('Edit resource', id);
    };

    (window as any).deleteResource = async function(id: number) {
        if(confirm('Are you sure you want to delete this resource?')) {
            try {
                const response = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    fetchResources();
                } else {
                    alert('Failed to delete resource');
                }
            } catch (error) {
                console.error('Error deleting resource:', error);
            }
        }
    };

    document.addEventListener("DOMContentLoaded", () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        fetchServices();
        fetchResources();

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

        // Add event listeners for save buttons (if they exist in HTML)
        // ... (omitted for brevity, assuming HTML is updated)
    });
})();
