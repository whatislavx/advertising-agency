(function() {
    const lucide = (window as any).lucide;
    interface Order {
        id: number;
        user_id: number;
        service_id: number;
        status: string;
        event_date: string;
        total_cost: string;
        // Assuming backend returns these or we need to join.
        // For now, let's assume simple structure and we might need to fetch user/service details if not provided.
        // But let's stick to what we have.
    }

    function formatCurrency(amount: string | number): string {
        return Number(amount).toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('uk-UA');
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
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    function renderOrders(orders: Order[]) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        tbody.innerHTML = orders.map(order => `
            <tr class="order-row">
                <td class="text-primary font-medium">ORD-${order.id.toString().padStart(3, '0')}</td>
                <td class="text-gray-900">User #${order.user_id}</td>
                <td class="text-gray-700">Service #${order.service_id}</td>
                <td class="text-right text-primary">${formatCurrency(order.total_cost)}</td>
                <td class="text-sm text-gray-600">${formatDate(order.event_date)}</td>
                <td class="text-center status-cell">
                    ${getStatusBadge(order.status)}
                </td>
                <td class="text-center">
                    <button class="btn-icon">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function filterOrders() {
        const searchInput = document.getElementById("searchOrders") as HTMLInputElement;
        const statusFilter = document.getElementById("statusFilter") as HTMLSelectElement;
        
        if (!searchInput || !statusFilter) return;

        const searchValue = searchInput.value.toLowerCase();
        const filterValue = statusFilter.value;
        
        const rows = document.querySelectorAll(".order-row");

        rows.forEach((row) => {
            const htmlRow = row as HTMLElement;
            const text = htmlRow.textContent?.toLowerCase() || "";
            const statusCell = htmlRow.querySelector(".status-cell")?.textContent?.trim() || "";
            
            // Map UI status text to filter value if needed, or just check includes
            // Filter value is "Новий", "Оплачено" etc.
            // Status cell text contains "Новий", "Оплачено" etc.
            
            const matchesSearch = text.includes(searchValue);
            const matchesStatus = filterValue === "all" || statusCell.includes(filterValue);

            if (matchesSearch && matchesStatus) {
                htmlRow.style.display = "";
            } else {
                htmlRow.style.display = "none";
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        fetchOrders();

        const searchInput = document.getElementById("searchOrders");
        const statusFilter = document.getElementById("statusFilter");

        searchInput?.addEventListener("input", filterOrders);
        statusFilter?.addEventListener("change", filterOrders);
    });
})();
