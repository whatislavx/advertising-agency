(function() {
const lucide = (window as any).lucide;

// Отримання поточного юзера з localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('uk-UA');
}

// Завантаження актуальних даних з сервера
async function loadProfileData() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`/api/users/${user.id}`);
        if (response.ok) {
            const userData = await response.json();
            console.log('User Data from API:', userData);
            
            // Оновлюємо поля вводу
            const nameInput = document.getElementById("inputName") as HTMLInputElement;
            const emailInput = document.getElementById("inputEmail") as HTMLInputElement;
            const phoneInput = document.getElementById("inputPhone") as HTMLInputElement;
            
            // Оновлюємо відображення імені в картці
            const displayHeaderName = document.querySelector('.card h3');
            const displayHeaderEmail = document.querySelector('.card p');
            const displayRegDate = document.getElementById('profile-registration-date');
            const displayOrderCount = document.getElementById('profile-order-count');

            if (nameInput) nameInput.value = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
            if (emailInput) emailInput.value = userData.email;
            if (phoneInput) phoneInput.value = userData.phone || '';
            
            if (displayHeaderName) displayHeaderName.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
            if (displayHeaderEmail) displayHeaderEmail.textContent = userData.email;
            if (displayRegDate) displayRegDate.textContent = formatDate(userData.registration_date);
            if (displayOrderCount) displayOrderCount.textContent = (userData.order_count || 0).toString();

            // Оновлюємо localStorage свіжими даними
            localStorage.setItem('user', JSON.stringify(userData));
        }
    } catch (e) {
        console.error("Failed to load profile", e);
    }
}

function enableEditing() {
    const actionButtons = document.getElementById("actionButtons");
    const editButtons = document.getElementById("editButtons");

    if (actionButtons && editButtons) {
        actionButtons.classList.add("hidden");
        editButtons.classList.remove("hidden");
        editButtons.classList.add("flex");
    }

    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
        // Email зазвичай не дають змінювати просто так, але якщо треба - розблокуйте
        if (input.id !== "inputEmail") { 
            input.disabled = false;
        }
    });
}

function cancelEditing() {
    const actionButtons = document.getElementById("actionButtons");
    const editButtons = document.getElementById("editButtons");

    if (actionButtons && editButtons) {
        editButtons.classList.add("hidden");
        editButtons.classList.remove("flex");
        actionButtons.classList.remove("hidden");
    }

    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
        input.disabled = true;
    });
    
    // Повертаємо старі значення
    loadProfileData();
}

async function saveProfile() {
    const user = getCurrentUser();
    if (!user) return;

    const nameInput = document.getElementById("inputName") as HTMLInputElement;
    const phoneInput = document.getElementById("inputPhone") as HTMLInputElement;
    const emailInput = document.getElementById("inputEmail") as HTMLInputElement;

    const nameParts = nameInput.value.trim().split(' ');
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || '';
    const phone = phoneInput.value;

    const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
    const originalText = btnSave.innerHTML;
    btnSave.innerText = "Збереження...";
    btnSave.disabled = true;

    try {
        const response = await fetch(`/api/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name,
                last_name,
                phone,
                email: emailInput.value
            })
        });

        if (response.ok) {
            alert("Профіль успішно оновлено!");
            await loadProfileData(); // Перезавантажити дані і оновити UI
            
            // Приховуємо кнопки редагування
            const actionButtons = document.getElementById("actionButtons");
            const editButtons = document.getElementById("editButtons");
            if (actionButtons && editButtons) {
                editButtons.classList.add("hidden");
                editButtons.classList.remove("flex");
                actionButtons.classList.remove("hidden");
            }
            
            const inputs = document.querySelectorAll("input");
            inputs.forEach((input) => input.disabled = true);

        } else {
            alert("Помилка при збереженні даних");
        }
    } catch (e) {
        console.error(e);
        alert("Помилка з'єднання");
    } finally {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    loadProfileData();

    const editBtn = document.getElementById("btn-edit");
    const saveBtn = document.getElementById("btn-save");
    const cancelBtn = document.getElementById("btn-cancel");

    editBtn?.addEventListener("click", enableEditing);
    saveBtn?.addEventListener("click", saveProfile);
    cancelBtn?.addEventListener("click", cancelEditing);

    // Password Change Logic
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModal = document.getElementById('passwordModal');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const passwordForm = document.getElementById('passwordForm') as HTMLFormElement;
    const passwordError = document.getElementById('passwordError');

    function toggleModal(show: boolean) {
        if (passwordModal) {
            if (show) {
                passwordModal.classList.remove('hidden');
                passwordModal.classList.add('flex');
            } else {
                passwordModal.classList.add('hidden');
                passwordModal.classList.remove('flex');
                passwordForm?.reset();
                if (passwordError) passwordError.classList.add('hidden');
            }
        }
    }

    changePasswordBtn?.addEventListener('click', () => toggleModal(true));
    cancelPasswordBtn?.addEventListener('click', () => toggleModal(false));

    passwordModal?.addEventListener('click', (e) => {
        if (e.target === passwordModal) toggleModal(false);
    });

    passwordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (passwordError) passwordError.classList.add('hidden');

        const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement).value;
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

        if (newPassword !== confirmPassword) {
            if (passwordError) {
                passwordError.textContent = 'Нові паролі не співпадають';
                passwordError.classList.remove('hidden');
            }
            return;
        }

        const user = getCurrentUser();
        if (!user) return;

        try {
            const response = await fetch(`/api/users/${user.id}/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    oldPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Пароль успішно змінено');
                toggleModal(false);
            } else {
                if (passwordError) {
                    passwordError.textContent = data.message || 'Помилка при зміні пароля';
                    passwordError.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error(error);
            if (passwordError) {
                passwordError.textContent = 'Помилка з\'єднання';
                passwordError.classList.remove('hidden');
            }
        }
    });
});
})();