"use strict";
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
        input.disabled = false;
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
}
function saveProfile() {
    alert("Профіль успішно оновлено!");
    cancelEditing();
}
document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    const editBtn = document.getElementById("btn-edit");
    const saveBtn = document.getElementById("btn-save");
    const cancelBtn = document.getElementById("btn-cancel");
    editBtn === null || editBtn === void 0 ? void 0 : editBtn.addEventListener("click", enableEditing);
    saveBtn === null || saveBtn === void 0 ? void 0 : saveBtn.addEventListener("click", saveProfile);
    cancelBtn === null || cancelBtn === void 0 ? void 0 : cancelBtn.addEventListener("click", cancelEditing);
});
