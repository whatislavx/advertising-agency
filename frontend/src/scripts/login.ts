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
            localStorage.setItem('user', JSON.stringify(data.user));
            
            if (data.user.role === 'manager') {
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

    const fields = [
        { input: nameInput, label: "Ім'я" },
        { input: phoneInput, label: "Телефон" },
        { input: emailInput, label: "Email" },
        { input: passwordInput, label: "Пароль" }
    ];

    const emptyFields = fields.filter(field => !field.input || !field.input.value.trim());

    if (emptyFields.length > 0) {
        const emptyLabels = emptyFields.map(f => f.label).join(', ');

        await Modal.alert(`Будь ласка, заповніть наступні поля: ${emptyLabels}`);

        emptyFields.forEach(field => {
            if (field.input) {
                field.input.style.borderColor = 'red';

                const removeErrorStyle = () => {
                    field.input.style.borderColor = ''; 
                    field.input.removeEventListener('input', removeErrorStyle);
                };

                field.input.addEventListener('input', removeErrorStyle);
            }
        });
        return;
    }
    
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
    registerForm?.removeAttribute('onsubmit');
    registerForm?.addEventListener('submit', handleRegister);

    const regPhone = document.getElementById('reg-phone') as HTMLInputElement | null;
    function formatUaPhone(value: string): string {
        const digits = value.replace(/\D/g, '');
        let normalized = digits;
        if (!normalized.startsWith('380')) {
            if (normalized.length > 0) normalized = '380' + normalized;
        }
        normalized = normalized.slice(0, 12);
        const cc = normalized.slice(0, 3); 
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

    setTimeout(() => {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => input.value = '');
    }, 100);
});
})();