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
    const flatpickr = window.flatpickr;
    let globalFirstOrderDate = null;
    function formatCurrency(amount) {
        return amount.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' }).replace('UAH', '₴').replace(',', '.');
    }
    function renderChange(elementId, change) {
        const el = document.getElementById(elementId);
        if (!el)
            return;
        if (change === null) {
            el.innerHTML = `<span class="text-gray-400">— за місяць</span>`;
        }
        else {
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
    function fetchDashboardStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/dashboard/stats');
                if (!response.ok)
                    throw new Error('Failed to fetch dashboard stats');
                const stats = yield response.json();
                console.log('Dashboard stats received:', stats);
                if (stats.firstOrderDate) {
                    globalFirstOrderDate = new Date(stats.firstOrderDate);
                }
                const totalOrdersEl = document.getElementById('total-orders');
                const totalRevenueEl = document.getElementById('total-revenue');
                const totalViewsEl = document.getElementById('total-views');
                if (totalOrdersEl)
                    totalOrdersEl.textContent = stats.totalOrders.toString();
                if (totalRevenueEl)
                    totalRevenueEl.textContent = formatCurrency(stats.totalRevenue);
                if (totalViewsEl)
                    totalViewsEl.textContent = stats.totalViews.toLocaleString();
                renderChange('orders-change', stats.changes.orders);
                renderChange('revenue-change', stats.changes.revenue);
                renderChange('views-change', stats.changes.views);
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
            }
            catch (error) {
                console.error('Error fetching dashboard stats:', error);
            }
        });
    }
    document.addEventListener("DOMContentLoaded", () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        fetchDashboardStats();
        // --- Report Modal Logic ---
        const reportModal = document.getElementById('reportModal');
        const openReportBtn = document.getElementById('btn-export-report');
        const closeReportBtn = document.getElementById('closeReportModal');
        const cancelReportBtn = document.getElementById('cancelReportBtn');
        const generateReportBtn = document.getElementById('generateReportBtn');
        const startDateInput = document.getElementById('reportStartDate');
        const endDateInput = document.getElementById('reportEndDate');
        let startPicker;
        let endPicker;
        // Ініціалізація Flatpickr з правильним форматуванням
        if (typeof flatpickr !== 'undefined' && startDateInput && endDateInput) {
            const removeActivePresets = () => {
                document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
            };
            const commonConfig = {
                locale: "uk",
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d.m.Y",
                allowInput: true,
                maxDate: "today"
            };
            startPicker = flatpickr(startDateInput, Object.assign(Object.assign({}, commonConfig), { onChange: function (selectedDates) {
                    removeActivePresets();
                    if (selectedDates.length > 0) {
                        endPicker.set('minDate', selectedDates[0]);
                    }
                } }));
            endPicker = flatpickr(endDateInput, Object.assign(Object.assign({}, commonConfig), { onChange: function (selectedDates) {
                    removeActivePresets();
                    if (selectedDates.length > 0) {
                        startPicker.set('maxDate', selectedDates[0]);
                    }
                } }));
        }
        // Відкриття модалки
        if (openReportBtn && reportModal) {
            openReportBtn.addEventListener('click', () => {
                reportModal.classList.remove('hidden');
                reportModal.classList.add('flex');
                // За замовчуванням - поточний місяць
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                if (startPicker)
                    startPicker.setDate(firstDay);
                if (endPicker)
                    endPicker.setDate(now);
                // Скидаємо активний клас з усіх кнопок
                document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
            });
        }
        const closeReport = () => {
            if (reportModal) {
                reportModal.classList.add('hidden');
                reportModal.classList.remove('flex');
            }
        };
        if (closeReportBtn)
            closeReportBtn.addEventListener('click', closeReport);
        if (cancelReportBtn)
            cancelReportBtn.addEventListener('click', closeReport);
        // Кнопки швидкого вибору (Presets)
        const presetBtns = document.querySelectorAll('[data-preset]');
        presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Preset clicked:', btn.getAttribute('data-preset'));
                // Visual feedback
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const preset = btn.getAttribute('data-preset');
                const now = new Date();
                now.setHours(0, 0, 0, 0); // Скидаємо час, щоб уникнути проблем з maxDate="today"
                let start, end;
                switch (preset) {
                    case 'today':
                        start = now;
                        end = now;
                        break;
                    case 'month':
                        start = new Date(now.getFullYear(), now.getMonth(), 1);
                        end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Останній день місяця
                        if (end > now)
                            end = now; // Обмежуємо поточною датою
                        break;
                    case 'year':
                        start = new Date(now.getFullYear(), 0, 1);
                        end = new Date(now.getFullYear(), 11, 31);
                        if (end > now)
                            end = now; // Обмежуємо поточною датою
                        break;
                    case 'all':
                        start = globalFirstOrderDate || new Date(2020, 0, 1);
                        end = now;
                        break;
                }
                if (start && end && startPicker && endPicker) {
                    startPicker.setDate(start);
                    endPicker.setDate(end);
                }
            });
        });
        // Генерація звіту
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                // Flatpickr зберігає значення в input.value у форматі dateFormat ("Y-m-d")
                const start = startDateInput.value;
                const end = endDateInput.value;
                if (!start || !end) {
                    alert("Будь ласка, оберіть дати");
                    return;
                }
                if (start > end) {
                    alert("Дата початку не може бути пізніше дати кінця");
                    return;
                }
                const btn = generateReportBtn;
                const originalText = btn.innerHTML;
                btn.innerHTML = 'Завантаження...';
                btn.disabled = true;
                // Надсилаємо формат YYYY-MM-DD, який бекенд легко зрозуміє
                const url = `/api/reports/export/pdf?startDate=${start}&endDate=${end}`;
                window.open(url, '_blank');
                setTimeout(() => {
                    closeReport();
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 1000);
            });
        }
    });
})();
