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
                    alert(data.message || 'Невірний email або пароль');
                }
            }
            catch (error) {
                console.error('Login error', error);
                alert('Помилка з\'єднання з сервером');
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
                alert("Заповніть обов'язкові поля");
                return;
            }
            // Розбиваємо ім'я на First Name та Last Name
            const nameParts = nameInput.value.trim().split(' ');
            const first_name = nameParts[0];
            const last_name = nameParts.slice(1).join(' ') || '';
            const email = emailInput.value;
            const password = passwordInput.value;
            const phone = phoneInput ? phoneInput.value : '';
            try {
                const response = yield fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, first_name, last_name, phone })
                });
                if (response.ok) {
                    alert('Реєстрація успішна! Тепер увійдіть.');
                    switchTab('login');
                }
                else {
                    const data = yield response.json();
                    alert('Помилка реєстрації: ' + (data.message || 'Спробуйте інший email'));
                }
            }
            catch (error) {
                console.error('Register error', error);
                alert('Помилка сервера при реєстрації');
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
        // Очищення полів від автозаповнення
        setTimeout(() => {
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => input.value = '');
        }, 100);
    });
})();
