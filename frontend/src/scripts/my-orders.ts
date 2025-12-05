(function() {
const lucide = (window as any).lucide;
const flatpickr = (window as any).flatpickr;

function formatCurrency(num: number): string {
    return num.toLocaleString('uk-UA') + ' ₴';
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA');
}

function getDisplayStatus(order: any): string {
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
        case 'paid': return `<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Оплачено</span>`;
        case 'new': return `<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Нове</span>`;
        case 'completed': return `<span class="badge badge-blue"><i data-lucide="check" class="w-3 h-3"></i> Виконано</span>`;
        case 'cancelled': return `<span class="badge badge-red"><i data-lucide="x-circle" class="w-3 h-3"></i> Скасовано</span>`;
        default: return `<span class="badge badge-gray">${status}</span>`;
    }
}

async function loadOrders() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userStr);

    try {
        const response = await fetch(`/api/orders/user/${user.id}`);
        if (response.ok) {
            const orders = await response.json();
            
            // Оновлюємо статистику
            document.getElementById('totalOrders')!.innerText = orders.length.toString();
            document.getElementById('activeCampaigns')!.innerText = orders.filter((o: any) => o.status === 'new' || o.status === 'paid').length.toString();
            const totalSum = orders.reduce((sum: number, o: any) => sum + Number(o.total_cost), 0);
            document.getElementById('totalSpent')!.innerText = formatCurrency(totalSum);

            const tbody = document.getElementById('ordersTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                
                if (orders.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">
                                <div class="flex flex-col items-center justify-center gap-2">
                                    <i data-lucide="inbox" class="w-8 h-8 text-gray-400"></i>
                                    <p>У вас ще немає замовлень</p>
                                    <a href="catalog.html" class="text-blue-600 hover:underline text-sm">Перейти до каталогу</a>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    orders.forEach((order: any) => {
                        const displayStatus = getDisplayStatus(order);
                        // Main Row
                        const tr = document.createElement('tr');
                        tr.className = "hover:bg-gray-50 transition-colors cursor-pointer";
                        tr.onclick = (e) => {
                            // Prevent toggling if clicking on a button
                            if ((e.target as HTMLElement).closest('button')) return;
                            (window as any).toggleDetails(order.id);
                        };
                        
                        tr.innerHTML = `
                            <td class="text-[#1a3a5c] font-medium">ORD-${order.id}</td>
                            <td class="text-gray-900">${order.service_name}</td>
                            <td class="text-gray-600 text-sm">${formatDate(order.event_date)}</td>
                            <td class="text-right text-[#1a3a5c] font-bold">${formatCurrency(Number(order.total_cost))}</td>
                            <td class="text-center">${getStatusBadge(displayStatus)}</td>
                            <td class="text-center flex items-center justify-center gap-2">
                                ${displayStatus === 'new' ? `<button class="btn btn-primary text-xs py-1 px-3" onclick="payOrder(${order.id}, ${order.total_cost})">Сплатити</button>` : ''}
                                ${(displayStatus === 'new' || displayStatus === 'paid') ? `
                                    <button class="btn-icon text-blue-600 hover:bg-blue-50" title="Перенести" onclick="openRescheduleModal(${order.id})">
                                        <i data-lucide="calendar-clock" class="w-5 h-5"></i>
                                    </button>
                                    <button class="btn-icon text-red-600 hover:bg-red-50" title="Скасувати" onclick="cancelOrder(${order.id})">
                                        <i data-lucide="x-circle" class="w-5 h-5"></i>
                                    </button>
                                ` : ''}
                                <button class="btn-icon text-gray-400 hover:text-gray-600" onclick="toggleDetails(${order.id})">
                                    <i data-lucide="chevron-down" class="w-5 h-5 transition-transform" id="icon-${order.id}"></i>
                                </button>
                            </td>
                        `;
                        tbody.appendChild(tr);

                        // Details Row
                        const detailsTr = document.createElement('tr');
                        detailsTr.id = `details-${order.id}`;
                        detailsTr.className = "hidden bg-gray-50 border-t border-gray-100";
                        
                        const resourcesHtml = order.resources && order.resources.length > 0 
                            ? order.resources.map((r: string) => `<span class="badge badge-gray bg-white border border-gray-200">${r}</span>`).join('')
                            : '<span class="text-gray-400 text-sm">Немає додаткових ресурсів</span>';

                        detailsTr.innerHTML = `
                            <td colspan="6" class="p-4">
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
                }
                lucide.createIcons();
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// Toggle details function
(window as any).toggleDetails = (id: number) => {
    const detailsRow = document.getElementById(`details-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    
    if (detailsRow) {
        detailsRow.classList.toggle('hidden');
        if (icon) {
            if (detailsRow.classList.contains('hidden')) {
                icon.style.transform = 'rotate(0deg)';
            } else {
                icon.style.transform = 'rotate(180deg)';
            }
        }
    }
};

// Функція для глобального доступу (викликається з HTML onclick)
(window as any).payOrder = async (orderId: number, amount: number) => {
    if(!confirm(`Підтвердити оплату замовлення ORD-${orderId}?`)) return;
    
    try {
        const res = await fetch('/api/payments', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ order_id: orderId, amount: amount })
        });
        
        if (res.ok) {
            // Одразу підтверджуємо (для демо)
            await fetch(`/api/payments/${orderId}/confirm`, { method: 'PATCH' });
            alert('Оплата пройшла успішно!');
            loadOrders(); // Перезавантажити таблицю
        }
    } catch (e) {
        alert('Помилка оплати');
    }
};

(window as any).cancelOrder = async (id: number) => {
    if(!confirm('Ви впевнені, що хочете скасувати це замовлення?')) return;
    try {
        const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: 'cancelled' })
        });
        if(res.ok) {
            loadOrders();
        } else {
            alert('Помилка при скасуванні');
        }
    } catch(e) {
        console.error(e);
        alert('Помилка з\'єднання');
    }
};

(window as any).openRescheduleModal = (id: number) => {
    const modal = document.getElementById('rescheduleModal');
    const inputId = document.getElementById('rescheduleOrderId') as HTMLInputElement;
    const inputStartDate = document.getElementById('rescheduleStartDate') as HTMLInputElement;
    const inputEndDate = document.getElementById('rescheduleEndDate') as HTMLInputElement;
    
    if(modal && inputId && inputStartDate && inputEndDate) {
        inputId.value = id.toString();
        
        if (typeof flatpickr !== 'undefined') {
            flatpickr(inputStartDate, {
                locale: 'uk',
                dateFormat: "d.m.Y",
                minDate: "today",
                defaultDate: "",
                onChange: function(selectedDates: Date[], dateStr: string) {
                    if (selectedDates[0]) {
                        // Set min date for end picker
                        const endPicker = (inputEndDate as any)._flatpickr;
                        if (endPicker) {
                            endPicker.set('minDate', selectedDates[0]);
                        }
                    }
                }
            });
            
            flatpickr(inputEndDate, {
                locale: 'uk',
                dateFormat: "d.m.Y",
                minDate: "today",
                defaultDate: ""
            });
        }
        
        inputStartDate.value = '';
        inputEndDate.value = '';
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

(window as any).closeRescheduleModal = () => {
    const modal = document.getElementById('rescheduleModal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

(window as any).submitReschedule = async () => {
    const id = (document.getElementById('rescheduleOrderId') as HTMLInputElement).value;
    const startDate = (document.getElementById('rescheduleStartDate') as HTMLInputElement).value;
    const endDate = (document.getElementById('rescheduleEndDate') as HTMLInputElement).value;
    
    if(!startDate || !endDate) {
        alert('Оберіть дати початку та завершення');
        return;
    }

    // Convert dd.mm.yyyy to yyyy-mm-dd
    const startParts = startDate.split('.');
    const formattedStartDate = `${startParts[2]}-${startParts[1]}-${startParts[0]}`;

    const endParts = endDate.split('.');
    const formattedEndDate = `${endParts[2]}-${endParts[1]}-${endParts[0]}`;
    
    try {
        const res = await fetch(`/api/orders/${id}/reschedule`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ newDate: formattedStartDate, newEndDate: formattedEndDate })
        });
        
        if(res.ok) {
            (window as any).closeRescheduleModal();
            loadOrders();
        } else {
            alert('Помилка при перенесенні');
        }
    } catch(e) {
        console.error(e);
        alert('Помилка з\'єднання');
    }
};

document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
});
})();