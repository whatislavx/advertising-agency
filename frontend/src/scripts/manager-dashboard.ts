(function() {
    const lucide = (window as any).lucide;
    interface DashboardStats {
        totalOrders: number;
        totalRevenue: number;
        totalViews: number;
    }

    function formatCurrency(amount: number): string {
        return amount.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }

    async function fetchDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats');
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            const stats: DashboardStats = await response.json();
            
            const totalOrdersEl = document.getElementById('total-orders');
            const totalRevenueEl = document.getElementById('total-revenue');
            const totalViewsEl = document.getElementById('total-views');

            if (totalOrdersEl) totalOrdersEl.textContent = stats.totalOrders.toString();
            if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(stats.totalRevenue);
            if (totalViewsEl) totalViewsEl.textContent = stats.totalViews.toLocaleString();

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
