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
    lucide === null || lucide === void 0 ? void 0 : lucide.createIcons();
    function switchTab(tab) {
        const loginForm = document.getElementById("form-login");
        const registerForm = document.getElementById("form-register");
        const loginBtn = document.getElementById("tab-login");
        const registerBtn = document.getElementById("tab-register");
        if (!loginForm || !registerForm || !loginBtn || !registerBtn)
            return;
        if (tab === "login") {
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");
            loginBtn.className = "flex-1 py-3 rounded-md transition-all bg-white text-[#1a3a5c] shadow-sm font-medium";
            registerBtn.className = "flex-1 py-3 rounded-md transition-all text-gray-600 hover:text-gray-800 font-medium";
        }
        else {
            loginForm.classList.add("hidden");
            registerForm.classList.remove("hidden");
            registerBtn.className = "flex-1 py-3 rounded-md transition-all bg-white text-[#1a3a5c] shadow-sm font-medium";
            loginBtn.className = "flex-1 py-3 rounded-md transition-all text-gray-600 hover:text-gray-800 font-medium";
        }
    }
    function handleLogin(e) {
        return __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            const emailInput = document.getElementById("email-input");
            const passwordInput = document.getElementById("password-input");
            if (!emailInput || !passwordInput)
                return;
            const email = emailInput.value;
            const password = passwordInput.value;
            try {
                const response = yield fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = yield response.json();
                if (response.ok) {
                    // Зберігаємо дані користувача для сесії
                    localStorage.setItem('user', JSON.stringify(data.user));
                    // Перенаправлення залежно від ролі
                    if (data.user.role === 'manager' || data.user.role === 'director') {
                        window.location.href = "manager-dashboard.html";
                    }
                    else {
                        window.location.href = "catalog.html";
                    }
                }
                else {
                    yield Modal.alert(data.message || 'Невірний email або пароль');
                }
            }
            catch (error) {
                console.error('Login error', error);
                yield Modal.alert('Помилка з\'єднання з сервером');
            }
        });
    }
    function handleRegister(e) {
        return __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            const nameInput = document.getElementById("reg-name");
            const phoneInput = document.getElementById("reg-phone");
            const emailInput = document.getElementById("reg-email");
            const passwordInput = document.getElementById("reg-password");
            if (!nameInput || !emailInput || !passwordInput) {
                yield Modal.alert("Заповніть обов'язкові поля");
                return;
            }
            const nameVal = nameInput.value.trim();
            const emailVal = emailInput.value.trim();
            const passwordVal = passwordInput.value;
            const phoneVal = phoneInput ? phoneInput.value.trim() : '';
            if (!nameVal || !emailVal || !passwordVal) {
                yield Modal.alert("Будь ласка, заповніть всі поля: ім'я, email, пароль");
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                yield Modal.alert("Некоректний email");
                return;
            }
            if (passwordVal.length < 6) {
                yield Modal.alert("Пароль має містити щонайменше 6 символів");
                return;
            }
            // Валідація телефону у форматі +380 XX XXX XX XX (лише цифри, контроль довжини)
            if (phoneInput && phoneVal) {
                const digitsOnly = phoneVal.replace(/\D/g, '');
                // очікуємо 12 цифр включно з кодом країни 380 + 9 цифр
                if (!(digitsOnly.startsWith('380') && digitsOnly.length === 12)) {
                    yield Modal.alert("Телефон має бути у форматі +380XXXXXXXXX");
                    return;
                }
            }
            // Розбиваємо ім'я на First Name та Last Name
            const nameParts = nameInput.value.trim().split(' ');
            const first_name = nameParts[0];
            const last_name = nameParts.slice(1).join(' ') || '';
            const email = emailVal;
            const password = passwordVal;
            const phone = phoneVal;
            try {
                const response = yield fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, first_name, last_name, phone })
                });
                if (response.ok) {
                    yield Modal.alert('Реєстрація успішна! Тепер увійдіть.');
                    switchTab('login');
                }
                else {
                    const data = yield response.json();
                    yield Modal.alert('Помилка реєстрації: ' + (data.message || 'Спробуйте інший email'));
                }
            }
            catch (error) {
                console.error('Register error', error);
                yield Modal.alert('Помилка сервера при реєстрації');
            }
        });
    }
    document.addEventListener('DOMContentLoaded', () => {
        const loginTabBtn = document.getElementById("tab-login");
        const registerTabBtn = document.getElementById("tab-register");
        const loginForm = document.getElementById("form-login");
        const registerForm = document.getElementById("form-register");
        loginTabBtn === null || loginTabBtn === void 0 ? void 0 : loginTabBtn.addEventListener('click', () => switchTab('login'));
        registerTabBtn === null || registerTabBtn === void 0 ? void 0 : registerTabBtn.addEventListener('click', () => switchTab('register'));
        loginForm === null || loginForm === void 0 ? void 0 : loginForm.addEventListener('submit', handleLogin);
        // Видаляємо старі обробники, якщо вони були в HTML
        registerForm === null || registerForm === void 0 ? void 0 : registerForm.removeAttribute('onsubmit');
        registerForm === null || registerForm === void 0 ? void 0 : registerForm.addEventListener('submit', handleRegister);
        // Маска та обмеження для телефону: тільки цифри, автоформат у +380 XX XXX XX XX
        const regPhone = document.getElementById('reg-phone');
        function formatUaPhone(value) {
            const digits = value.replace(/\D/g, '');
            let normalized = digits;
            if (!normalized.startsWith('380')) {
                // якщо користувач вводить без 380, додамо 380 на початок при наявності цифр
                if (normalized.length > 0)
                    normalized = '380' + normalized;
            }
            normalized = normalized.slice(0, 12);
            // форматувати у +380 XX XXX XX XX
            const cc = normalized.slice(0, 3); // 380
            const p1 = normalized.slice(3, 5);
            const p2 = normalized.slice(5, 8);
            const p3 = normalized.slice(8, 10);
            const p4 = normalized.slice(10, 12);
            let out = '+380';
            if (p1)
                out += ` ${p1}`;
            if (p2)
                out += ` ${p2}`;
            if (p3)
                out += ` ${p3}`;
            if (p4)
                out += ` ${p4}`;
            return out;
        }
        function enforceDigitsOnly(e) {
            const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
            if (allowed.includes(e.key))
                return;
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
