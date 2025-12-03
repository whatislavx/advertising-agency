"use strict";
function filterOrders() {
    const searchInput = document.getElementById("searchOrders");
    const statusFilter = document.getElementById("statusFilter");
    if (!searchInput || !statusFilter)
        return;
    const searchValue = searchInput.value.toLowerCase();
    const filterValue = statusFilter.value;
    const rows = document.querySelectorAll(".order-row");
    rows.forEach((row) => {
        var _a, _b, _c;
        const htmlRow = row;
        const text = ((_a = htmlRow.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        const statusCell = ((_c = (_b = htmlRow.querySelector(".status-cell")) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.trim()) || "";
        const matchesSearch = text.includes(searchValue);
        const matchesStatus = filterValue === "all" || statusCell.includes(filterValue);
        if (matchesSearch && matchesStatus) {
            htmlRow.style.display = "";
        }
        else {
            htmlRow.style.display = "none";
        }
    });
}
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    const searchInput = document.getElementById("searchOrders");
    const statusFilter = document.getElementById("statusFilter");
    searchInput === null || searchInput === void 0 ? void 0 : searchInput.addEventListener("input", filterOrders);
    statusFilter === null || statusFilter === void 0 ? void 0 : statusFilter.addEventListener("change", filterOrders);
});
