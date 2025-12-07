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
(function () {
    const lucide = window.lucide;
    let currentUserId = null;
    function fetchUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/users');
                if (!response.ok)
                    throw new Error('Failed to fetch users');
                const users = yield response.json();
                renderUsers(users);
            }
            catch (error) {
                console.error('Error fetching users:', error);
            }
        });
    }
    function renderUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody)
            return;
        tbody.innerHTML = users.map(user => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-4 px-6 text-gray-900 font-medium">
                    ${user.first_name} ${user.last_name}
                </td>
                <td class="py-4 px-6 text-gray-600">${user.email}</td>
                <td class="py-4 px-6 text-gray-600">${user.phone || '-'}</td>
                <td class="py-4 px-6">
                    <span class="badge ${getRoleBadgeClass(user.role)}">
                        ${getRoleLabel(user.role)}
                    </span>
                </td>
                <td class="py-4 px-6 text-gray-900 font-medium">
                    ${user.personal_discount}%
                </td>
                <td class="py-4 px-6 text-right">
                    <button 
                        onclick="openDiscountModal(${user.id}, ${user.personal_discount})"
                        class="text-[#ff6b35] hover:text-[#e55a2b] font-medium text-sm transition-colors"
                    >
                        Змінити знижку
                    </button>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    function getRoleBadgeClass(role) {
        switch (role) {
            case 'manager': return 'badge-blue'; // Assuming blue for manager
            case 'client': return 'badge-green';
            default: return 'badge-gray';
        }
    }
    function getRoleLabel(role) {
        switch (role) {
            case 'manager': return 'Менеджер';
            case 'client': return 'Клієнт';
            default: return role;
        }
    }
    // Modal Logic
    const modal = document.getElementById('discountModal');
    const closeBtn = document.getElementById('closeDiscountBtn');
    const closeIcon = document.getElementById('closeDiscountIcon');
    const saveBtn = document.getElementById('saveDiscountBtn');
    const discountInput = document.getElementById('discountInput');
    window.openDiscountModal = (userId, currentDiscount) => {
        currentUserId = userId;
        if (discountInput)
            discountInput.value = currentDiscount.toString();
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };
    function closeModal() {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        currentUserId = null;
    }
    if (closeBtn)
        closeBtn.addEventListener('click', closeModal);
    if (closeIcon)
        closeIcon.addEventListener('click', closeModal);
    if (saveBtn) {
        saveBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            if (currentUserId === null || !discountInput)
                return;
            const discount = parseInt(discountInput.value);
            if (isNaN(discount) || discount < 0 || discount > 100) {
                yield Modal.alert('Будь ласка, введіть коректну знижку (0-100)', 'Помилка', 'error');
                return;
            }
            try {
                const response = yield fetch(`/api/users/${currentUserId}/discount`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        discount: discount,
                        initiatorRole: 'manager'
                    })
                });
                if (!response.ok) {
                    const data = yield response.json();
                    throw new Error(data.message || 'Failed to update discount');
                }
                closeModal();
                fetchUsers(); // Refresh list
                yield Modal.alert('Знижку успішно оновлено', 'Успіх', 'success');
            }
            catch (error) {
                console.error('Error updating discount:', error);
                yield Modal.alert('Помилка: ' + error.message, 'Помилка', 'error');
            }
        }));
    }
    document.addEventListener('DOMContentLoaded', () => {
        fetchUsers();
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
})();
