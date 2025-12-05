import { Modal } from './utils/Modal.js';

(function() {
    const lucide = (window as any).lucide;

    interface Order {
        id: number;
        user_id: number;
        user_email: string;
        service_id: number;
        service_name: string;
        status: string;
        event_date: string;
        end_date: string | null;
        created_at: string;
        total_cost: string;
        resources: string[] | null;
    }

    function formatCurrency(amount: string | number): string {
        return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }

    function formatDate(dateString: string): string {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    function getDisplayStatus(order: Order): string {
        // Logic: if paid and end_date is passed, show as completed
        if (order.status === 'paid' && order.end_date) {
            const endDate = new Date(order.end_date);
            const now = new Date();
            if (now > endDate) {
                return 'completed';
            }
        }
        return order.status;
    }

    function getStatusBadge(status: string): string {
        switch (status) {
            case 'new': return '<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Новий</span>';
            case 'paid': return '<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Оплачено</span>';
            case 'completed': return '<span class="badge badge-blue"><i data-lucide="check" class="w-3 h-3"></i> Виконано</span>';
            case 'cancelled': return '<span class="badge badge-red"><i data-lucide="x-circle" class="w-3 h-3"></i> Скасовано</span>';
            default: return `<span class="badge badge-gray">${status}</span>`;
        }
    }

    async function fetchOrders() {
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error('Failed to fetch orders');
            const orders: Order[] = await response.json();
            renderOrders(orders);
            updateStats(orders);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    function updateStats(orders: Order[]) {
        const totalOrdersEl = document.getElementById('statsTotalOrders');
        const pendingOrdersEl = document.getElementById('statsPendingOrders');
        const totalRevenueEl = document.getElementById('statsTotalRevenue');

        if (totalOrdersEl) totalOrdersEl.textContent = orders.length.toString();
        
        if (pendingOrdersEl) {
            const pendingCount = orders.filter(o => o.status === 'new').length;
            pendingOrdersEl.textContent = pendingCount.toString();
        }

        if (totalRevenueEl) {
            const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_cost), 0);
            totalRevenueEl.textContent = formatCurrency(totalRevenue);
        }
    }

    function renderOrders(orders: Order[]) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        orders.forEach(order => {
            const displayStatus = getDisplayStatus(order);
            
            // Main Row
            const tr = document.createElement('tr');
            tr.className = "order-row hover:bg-gray-50 transition-colors border-b border-gray-100";
            tr.setAttribute('data-status', displayStatus);
            
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">ORD-${order.id.toString().padStart(3, '0')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${order.user_email || 'User #' + order.user_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.service_name || 'Service #' + order.service_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-left font-medium text-gray-900">${formatCurrency(order.total_cost)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDate(order.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center status-cell">
                    ${getStatusBadge(displayStatus)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-2">
                        ${(displayStatus === 'new' || displayStatus === 'paid') ? `
                            <button class="btn-icon text-red-400 hover:text-red-600 transition-colors" title="Скасувати" onclick="cancelOrder(${order.id})">
                                <i data-lucide="x-circle" class="w-5 h-5"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon text-gray-400 hover:text-blue-600 transition-colors" onclick="toggleDetails(${order.id})">
                            <i data-lucide="eye" class="w-5 h-5" id="icon-${order.id}"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

            // Details Row
            const detailsTr = document.createElement('tr');
            detailsTr.id = `details-${order.id}`;
            detailsTr.className = "hidden bg-gray-50 border-t border-gray-100";
            
            const resourcesHtml = order.resources && order.resources.length > 0 
                ? order.resources.map(r => `<span class="badge badge-gray bg-white border border-gray-200">${r}</span>`).join('')
                : '<span class="text-gray-400 text-sm">Немає додаткових ресурсів</span>';

            detailsTr.innerHTML = `
                <td colspan="7" class="p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">Період кампанії:</p>
                            <p class="text-gray-900">
                                ${formatDate(order.event_date)} ${order.end_date ? '— ' + formatDate(order.end_date) : ''}
                            </p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-1">Додаткові ресурси:</p>
                            <div class="flex flex-wrap gap-2">
                                ${resourcesHtml}
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(detailsTr);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Make toggleDetails global
    (window as any).toggleDetails = (id: number) => {
        const detailsRow = document.getElementById(`details-${id}`);
        const icon = document.getElementById(`icon-${id}`);
        
        if (detailsRow) {
            detailsRow.classList.toggle('hidden');
            if (icon) {
                if (detailsRow.classList.contains('hidden')) {
                    icon.classList.remove('text-blue-600');
                } else {
                    icon.classList.add('text-blue-600');
                }
            }
        }
    };

    (window as any).filterOrders = () => {
        const searchInput = document.getElementById("searchOrders") as HTMLInputElement;
        const statusFilter = document.getElementById("statusFilter") as HTMLSelectElement;
        
        if (!searchInput || !statusFilter) return;

        const searchValue = searchInput.value.toLowerCase();
        const filterValue = statusFilter.value;
        
        const rows = document.querySelectorAll(".order-row");

        rows.forEach((row) => {
            const htmlRow = row as HTMLElement;
            const text = htmlRow.textContent?.toLowerCase() || "";
            const status = htmlRow.getAttribute('data-status') || "";
            
            const matchesSearch = text.includes(searchValue);
            const matchesStatus = filterValue === "all" || status === filterValue;

            const nextRow = htmlRow.nextElementSibling as HTMLElement;
            const isDetailsRow = nextRow && nextRow.id.startsWith('details-');

            if (matchesSearch && matchesStatus) {
                htmlRow.style.display = "";
                if (isDetailsRow) {
                    nextRow.style.display = ""; // Reset inline display to allow class-based toggling
                }
            } else {
                htmlRow.style.display = "none";
                if (isDetailsRow) {
                    nextRow.style.display = "none";
                    nextRow.classList.add('hidden'); // Reset to collapsed state
                }
            }
        });
        
        if (filterValue === 'all' && searchValue === '') {
             document.querySelectorAll('[id^="details-"]').forEach(el => {
                 el.classList.add('hidden');
                 (el as HTMLElement).style.display = '';
             });
             document.querySelectorAll('.order-row').forEach(el => {
                 (el as HTMLElement).style.display = '';
             });
        }
    };

    (window as any).cancelOrder = async (id: number) => {
        if(!(await Modal.confirm('Ви впевнені, що хочете скасувати це замовлення?'))) return;
        try {
            const res = await fetch(`/api/orders/${id}/status`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status: 'cancelled' })
            });
            if(res.ok) {
                fetchOrders();
            } else {
                await Modal.alert('Помилка при скасуванні');
            }
        } catch(e) {
            console.error(e);
            await Modal.alert('Помилка з\'єднання');
        }
    };

    document.addEventListener("DOMContentLoaded", () => {
        fetchOrders();

        const searchInput = document.getElementById("searchOrders");
        
        // Custom Select Logic
        const selectContainer = document.getElementById('customSelectContainer');
        const selectTrigger = document.getElementById('customSelectTrigger');
        const selectMenu = document.getElementById('customSelectMenu');
        const selectArrow = document.getElementById('customSelectArrow');
        const hiddenInput = document.getElementById('statusFilter') as HTMLInputElement;
        const selectedText = document.getElementById('selectedStatusText');
        const options = document.querySelectorAll('.custom-option');

        if (selectTrigger && selectMenu && selectArrow && hiddenInput && selectedText) {
            // Toggle dropdown
            selectTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = selectMenu.classList.contains('hidden');
                if (isHidden) {
                    selectMenu.classList.remove('hidden');
                    selectArrow.style.transform = 'rotate(180deg)';
                } else {
                    selectMenu.classList.add('hidden');
                    selectArrow.style.transform = 'rotate(0deg)';
                }
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (selectContainer && !selectContainer.contains(e.target as Node)) {
                    selectMenu.classList.add('hidden');
                    selectArrow.style.transform = 'rotate(0deg)';
                }
            });

            // Select option
            options.forEach(option => {
                option.addEventListener('click', () => {
                    const value = option.getAttribute('data-value');
                    const text = option.querySelector('span:last-child')?.textContent;
                    
                    if (value && text) {
                        hiddenInput.value = value;
                        selectedText.textContent = text;
                        
                        // Update UI
                        selectMenu.classList.add('hidden');
                        selectArrow.style.transform = 'rotate(0deg)';
                        
                        // Trigger filter
                        (window as any).filterOrders();
                    }
                });
            });
        }

        searchInput?.addEventListener("input", (window as any).filterOrders);
    });
})();
