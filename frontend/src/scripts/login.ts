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
            alert(data.message || 'Невірний email або пароль');
        }
    } catch (error) {
        console.error('Login error', error);
        alert('Помилка з\'єднання з сервером');
    }
}

async function handleRegister(e: Event) {
    e.preventDefault();
    
    const nameInput = document.getElementById("reg-name") as HTMLInputElement;
    const phoneInput = document.getElementById("reg-phone") as HTMLInputElement;
    const emailInput = document.getElementById("reg-email") as HTMLInputElement;
    const passwordInput = document.getElementById("reg-password") as HTMLInputElement;

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
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, first_name, last_name, phone })
        });

        if (response.ok) {
            alert('Реєстрація успішна! Тепер увійдіть.');
            switchTab('login');
        } else {
            const data = await response.json();
            alert('Помилка реєстрації: ' + (data.message || 'Спробуйте інший email'));
        }
    } catch (error) {
        console.error('Register error', error);
        alert('Помилка сервера при реєстрації');
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

    // Очищення полів від автозаповнення
    setTimeout(() => {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => input.value = '');
    }, 100);
});
})();