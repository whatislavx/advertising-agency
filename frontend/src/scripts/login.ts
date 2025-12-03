declare const lucide: any;
lucide.createIcons();

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

function handleLogin(e: Event) {
    e.preventDefault();
    
    const emailInput = document.getElementById("email-input") as HTMLInputElement;
    
    const emailValue = emailInput ? emailInput.value : "";
    const isManager = emailValue.includes("manager@");

    window.location.href = isManager
        ? "manager-dashboard.html"
        : "catalog.html";
}

function handleRegister(e: Event) {
    e.preventDefault();
    window.location.href = "catalog.html";
}

document.addEventListener('DOMContentLoaded', () => {
    const loginTabBtn = document.getElementById("tab-login");
    const registerTabBtn = document.getElementById("tab-register");

    loginTabBtn?.addEventListener('click', () => switchTab('login'));
    registerTabBtn?.addEventListener('click', () => switchTab('register'));

    const loginFormTag = document.getElementById("form-login") as HTMLFormElement;
    const registerFormTag = document.getElementById("form-register") as HTMLFormElement;

    loginFormTag?.addEventListener('submit', handleLogin);
    registerFormTag?.addEventListener('submit', handleRegister);
});