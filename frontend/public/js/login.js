"use strict";
lucide.createIcons();
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
    e.preventDefault();
    const emailInput = document.getElementById("email-input");
    const emailValue = emailInput ? emailInput.value : "";
    const isManager = emailValue.includes("manager@");
    window.location.href = isManager
        ? "manager-dashboard.html"
        : "catalog.html";
}
function handleRegister(e) {
    e.preventDefault();
    window.location.href = "catalog.html";
}
document.addEventListener('DOMContentLoaded', () => {
    const loginTabBtn = document.getElementById("tab-login");
    const registerTabBtn = document.getElementById("tab-register");
    loginTabBtn === null || loginTabBtn === void 0 ? void 0 : loginTabBtn.addEventListener('click', () => switchTab('login'));
    registerTabBtn === null || registerTabBtn === void 0 ? void 0 : registerTabBtn.addEventListener('click', () => switchTab('register'));
    const loginFormTag = document.getElementById("form-login");
    const registerFormTag = document.getElementById("form-register");
    loginFormTag === null || loginFormTag === void 0 ? void 0 : loginFormTag.addEventListener('submit', handleLogin);
    registerFormTag === null || registerFormTag === void 0 ? void 0 : registerFormTag.addEventListener('submit', handleRegister);
});
