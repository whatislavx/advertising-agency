function toggleDetails(targetId: string) {
    const row = document.getElementById(targetId);
    
    if (!row) return;

    if (row.classList.contains("hidden")) {
        row.classList.remove("hidden");
    } else {
        row.classList.add("hidden");
    }
}

function handlePayment(e: Event) {
    e.stopPropagation();
    alert('Симуляція оплати...');
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const toggleRows = document.querySelectorAll("[data-toggle-details]");

    toggleRows.forEach(row => {
        row.addEventListener("click", () => {
            const targetId = row.getAttribute("data-toggle-details");
            if (targetId) {
                toggleDetails(targetId);
            }
        });
    });

    const payButtons = document.querySelectorAll(".btn-pay");
    payButtons.forEach(btn => {
        btn.addEventListener("click", handlePayment);
    });
});