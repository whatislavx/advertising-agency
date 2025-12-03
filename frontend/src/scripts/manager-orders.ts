function filterOrders() {
    const searchInput = document.getElementById("searchOrders") as HTMLInputElement;
    const statusFilter = document.getElementById("statusFilter") as HTMLSelectElement;
    
    if (!searchInput || !statusFilter) return;

    const searchValue = searchInput.value.toLowerCase();
    const filterValue = statusFilter.value;
    
    const rows = document.querySelectorAll(".order-row");

    rows.forEach((row) => {
        const htmlRow = row as HTMLElement;
        const text = htmlRow.textContent?.toLowerCase() || "";
        const statusCell = htmlRow.querySelector(".status-cell")?.textContent?.trim() || "";
        const matchesSearch = text.includes(searchValue);
        const matchesStatus = filterValue === "all" || statusCell.includes(filterValue);

        if (matchesSearch && matchesStatus) {
            htmlRow.style.display = "";
        } else {
            htmlRow.style.display = "none";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    const searchInput = document.getElementById("searchOrders");
    const statusFilter = document.getElementById("statusFilter");

    searchInput?.addEventListener("input", filterOrders);

    statusFilter?.addEventListener("change", filterOrders);
});