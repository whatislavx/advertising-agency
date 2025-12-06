import { Modal } from './utils/Modal.js';

(function() {
const lucide = (window as any).lucide;
lucide?.createIcons();

function switchTab(tab: 'login' | 'register') {
    const loginForm = document.getElementById("form-login") as HTMLElement;
    const registerForm = document.getElementById("form-register") as HTMLElement;
    const loginBtn = document.getElementById("tab-login") as HTMLElement;
    const registerBtn = document.getElementById("tab-register") as HTMLElement;

    if (!loginForm || !registerForm || !loginBtn || !registerBtn) return;

    if (tab === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");

        loginBtn.className = "flex-1 py-3 rounded-md transition-all bg-white text-[#1a3a5c] shadow-sm font-medium";
        registerBtn.className = "flex-1 py-3 rounded-md transition-all text-gray-600 hover:text-gray-800 font-medium";
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");

        registerBtn.className = "flex-1 py-3 rounded-md transition-all bg-white text-[#1a3a5c] shadow-sm font-medium";
        loginBtn.className = "flex-1 py-3 rounded-md transition-all text-gray-600 hover:text-gray-800 font-medium";
    }
}

async function handleLogin(e: Event) {
    e.preventDefault();
    
    const emailInput = document.getElementById("email-input") as HTMLInputElement;
    const passwordInput = document.getElementById("password-input") as HTMLInputElement;
    
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Зберігаємо дані користувача для сесії
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Перенаправлення залежно від ролі
            if (data.user.role === 'manager' || data.user.role === 'director') {
                window.location.href = "manager-dashboard.html";
            } else {
                window.location.href = "catalog.html";
            }
        } else {
            await Modal.alert(data.message || 'Невірний email або пароль');
        }
    } catch (error) {
        console.error('Login error', error);
        await Modal.alert('Помилка з\'єднання з сервером');
    }
}

async function handleRegister(e: Event) {
    e.preventDefault();
    
    const nameInput = document.getElementById("reg-name") as HTMLInputElement;
    const phoneInput = document.getElementById("reg-phone") as HTMLInputElement;
    const emailInput = document.getElementById("reg-email") as HTMLInputElement;
    const passwordInput = document.getElementById("reg-password") as HTMLInputElement;

    // Визначаємо поля та їх назви для перевірки
    const fields = [
        { input: nameInput, label: "Ім'я" },
        { input: phoneInput, label: "Телефон" },
        { input: emailInput, label: "Email" },
        { input: passwordInput, label: "Пароль" }
    ];

    // Знаходимо незаповнені поля
    const emptyFields = fields.filter(field => !field.input || !field.input.value.trim());

    if (emptyFields.length > 0) {
        // Формуємо текст повідомлення
        const emptyLabels = emptyFields.map(f => f.label).join(', ');
        
        // Показуємо модальне вікно (чекаємо, поки користувач натисне "Зрозуміло")
        await Modal.alert(`Будь ласка, заповніть наступні поля: ${emptyLabels}`);

        // Після закриття модалки підсвічуємо поля
        emptyFields.forEach(field => {
            if (field.input) {
                // Встановлюємо червоний бордер
                field.input.style.borderColor = 'red';

                // Функція для очищення стилю при вводі
                const removeErrorStyle = () => {
                    field.input.style.borderColor = ''; // Повертаємо стандартний стиль
                    field.input.removeEventListener('input', removeErrorStyle);
                };

                // Додаємо слухач події
                field.input.addEventListener('input', removeErrorStyle);
            }
        });
        return;
    }

    // --- Далі йде стандартна логіка валідації (email regex, довжина пароля тощо) ---
    
    const nameVal = nameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value;
    const phoneVal = phoneInput.value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
        await Modal.alert("Некоректний email");
        return;
    }

    if (passwordVal.length < 6) {
        await Modal.alert("Пароль має містити щонайменше 6 символів");
        return;
    }

    // Валідація телефону
    const digitsOnly = phoneVal.replace(/\D/g, '');
    if (!(digitsOnly.startsWith('380') && digitsOnly.length === 12)) {
        await Modal.alert("Телефон має бути у форматі +380XXXXXXXXX");
        return;
    }

    const nameParts = nameVal.split(' ');
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || '';

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailVal, password: passwordVal, first_name, last_name, phone: phoneVal })
        });

        if (response.ok) {
            await Modal.alert('Реєстрація успішна! Тепер увійдіть.');
            // Тут потрібно викликати вашу функцію switchTab('login'), 
            // але оскільки вона не експортована, можливо доведеться клікнути по кнопці:
            document.getElementById("tab-login")?.click(); 
        } else {
            const data = await response.json();
            await Modal.alert('Помилка реєстрації: ' + (data.message || 'Спробуйте інший email'));
        }
    } catch (error) {
        console.error('Register error', error);
        await Modal.alert('Помилка сервера при реєстрації');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginTabBtn = document.getElementById("tab-login");
    const registerTabBtn = document.getElementById("tab-register");
    const loginForm = document.getElementById("form-login");
    const registerForm = document.getElementById("form-register");

    loginTabBtn?.addEventListener('click', () => switchTab('login'));
    registerTabBtn?.addEventListener('click', () => switchTab('register'));
    
    loginForm?.addEventListener('submit', handleLogin);
    // Видаляємо старі обробники, якщо вони були в HTML
    registerForm?.removeAttribute('onsubmit');
    registerForm?.addEventListener('submit', handleRegister);

    // Маска та обмеження для телефону: тільки цифри, автоформат у +380 XX XXX XX XX
    const regPhone = document.getElementById('reg-phone') as HTMLInputElement | null;
    function formatUaPhone(value: string): string {
        const digits = value.replace(/\D/g, '');
        let normalized = digits;
        if (!normalized.startsWith('380')) {
            // якщо користувач вводить без 380, додамо 380 на початок при наявності цифр
            if (normalized.length > 0) normalized = '380' + normalized;
        }
        normalized = normalized.slice(0, 12);
        // форматувати у +380 XX XXX XX XX
        const cc = normalized.slice(0, 3); // 380
        const p1 = normalized.slice(3, 5);
        const p2 = normalized.slice(5, 8);
        const p3 = normalized.slice(8, 10);
        const p4 = normalized.slice(10, 12);
        let out = '+380';
        if (p1) out += ` ${p1}`;
        if (p2) out += ` ${p2}`;
        if (p3) out += ` ${p3}`;
        if (p4) out += ` ${p4}`;
        return out;
    }
    function enforceDigitsOnly(e: KeyboardEvent) {
        const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
        if (allowed.includes(e.key)) return;
        if (!/\d/.test(e.key)) {
            e.preventDefault();
        }
    }
    if (regPhone) {
        regPhone.addEventListener('keydown', enforceDigitsOnly);
        regPhone.addEventListener('input', () => {
            regPhone.value = formatUaPhone(regPhone.value);
        });
        regPhone.setAttribute('placeholder', '+380 XX XXX XX XX');
    }

    // Очищення полів від автозаповнення
    setTimeout(() => {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => input.value = '');
    }, 100);
});
})();