"use strict";
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal)
        return;
    if (modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }
    else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    }
}
document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    const modalTriggers = document.querySelectorAll("[data-modal-target]");
    modalTriggers.forEach(trigger => {
        trigger.addEventListener("click", () => {
            const targetId = trigger.getAttribute("data-modal-target");
            if (targetId) {
                toggleModal(targetId);
            }
        });
    });
    window.addEventListener("click", (event) => {
        const target = event.target;
        if (target.classList.contains("modal-overlay")) {
            target.classList.add("hidden");
            document.body.style.overflow = "";
        }
    });
});
