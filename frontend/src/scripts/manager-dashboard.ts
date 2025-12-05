(function() {
    const lucide = (window as any).lucide;
    interface DashboardStats {
        totalOrders: number;
        totalRevenue: number;
        totalViews: number;
        changes: {
            orders: string | null;
            revenue: string | null;
            views: string | null;
        };
        services: {
            id: number;
            name: string;
            views: number;
            orders: number;
            conversion: string;
        }[];
    }

    function formatCurrency(amount: number): string {
        return amount.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }

    function renderChange(elementId: string, change: string | null) {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (change === null) {
            el.innerHTML = `<span class="text-gray-400">— за місяць</span>`;
        } else {
            const val = parseFloat(change);
            const isPositive = val >= 0;
            const icon = isPositive ? 'arrow-up' : 'arrow-down';
            const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
            
            el.className = `flex items-center gap-1 ${colorClass} text-sm`;
            el.innerHTML = `
                <i data-lucide="${icon}" class="w-4 h-4"></i> ${Math.abs(val)}% за місяць
            `;
        }
    }

    async function fetchDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats');
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            const stats: DashboardStats = await response.json();
            console.log('Dashboard stats received:', stats);
            
            // 1. Update Cards
            const totalOrdersEl = document.getElementById('total-orders');
            const totalRevenueEl = document.getElementById('total-revenue');
            const totalViewsEl = document.getElementById('total-views');

            if (totalOrdersEl) totalOrdersEl.textContent = stats.totalOrders.toString();
            if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(stats.totalRevenue);
            if (totalViewsEl) totalViewsEl.textContent = stats.totalViews.toLocaleString();

            // 2. Update Changes (Percentages)
            renderChange('orders-change', stats.changes.orders);
            renderChange('revenue-change', stats.changes.revenue);
            renderChange('views-change', stats.changes.views);

            // 3. Render Efficiency Table
            const tbody = document.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = stats.services.map(service => `
                    <tr>
                        <td class="text-primary font-medium">${service.name}</td>
                        <td class="text-right text-gray-700">${service.views.toLocaleString()}</td>
                        <td class="text-right text-gray-700">${service.orders}</td>
                        <td class="text-right">
                            <span class="badge ${parseFloat(service.conversion) > 20 ? 'badge-green' : 'badge-yellow'}">
                                ${service.conversion}%
                            </span>
                        </td>
                    </tr>
                `).join('');
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        fetchDashboardStats();
    });
})();
