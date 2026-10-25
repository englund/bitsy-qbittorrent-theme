"use strict";

const placeBelow = (popover, button) => {
    const rect = button.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 6}px`;
    popover.style.right = `${window.innerWidth - rect.right}px`;
};

// Dialogs load in iframes, where media queries see the frame's width, not the screen's.
// Tag each dialog document so theme.css can style it as a full-screen phone sheet.
{
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const tagFrame = (iframe) => iframe.contentDocument?.documentElement.classList.toggle("mobile-sheet", mobileQuery.matches);

    // load doesn't bubble, but a capturing listener still sees it for every iframe
    document.addEventListener("load", (event) => {
        if (event.target.matches?.(".mochaIframe"))
            tagFrame(event.target);
    }, true);
    mobileQuery.addEventListener("change", () => {
        for (const iframe of document.querySelectorAll(".mochaIframe"))
            tagFrame(iframe);
    });
}

// Mobile hides the table header, so this menu stands in for clicking a column to sort.
window.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("mobileSortButton");
    const menu = document.getElementById("mobileSortMenu");
    const items = [...menu.querySelectorAll("[data-column]")];

    const render = (column, reverse) => {
        const active = items.find(item => item.dataset.column === column) ?? items[0];
        for (const item of items)
            item.setAttribute("aria-checked", String(item === active));
        button.firstElementChild.textContent = active.textContent;
        button.classList.toggle("reversed", reverse === "1");
        menu.classList.toggle("reversed", reverse === "1");
    };
    // torrentsTable is set up later from an XHR-loaded view, so the initial state comes from the same keys it persists to.
    render(localStorage.getItem("sorted_column_torrentsTableDiv"), localStorage.getItem("reverse_sort_torrentsTableDiv"));

    menu.addEventListener("toggle", (event) => {
        if (event.newState === "open")
            placeBelow(menu, button);
    });

    // Picking the current column again flips the direction, same as clicking its header.
    menu.addEventListener("click", (event) => {
        const item = event.target.closest("[data-column]");
        if (!item)
            return;
        torrentsTable.setSortedColumn(item.dataset.column);
        render(torrentsTable.sortedColumn, torrentsTable.reverseSort);
        menu.hidePopover();
    });
});

// Mobile hides the properties panel; tapping a card opens it as a full-screen details sheet instead.
{
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    let title;

    const close = () => document.documentElement.classList.remove("details-open");

    const open = (rowId) => {
        const wrapper = document.getElementById("propertiesPanel_wrapper");
        if (!title) {
            const bar = document.createElement("div");
            bar.id = "detailsSheetBar";
            title = document.createElement("h3");
            const closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.className = "mochaCloseButton";
            closeButton.ariaLabel = "Close";
            closeButton.addEventListener("click", close);
            bar.append(title, closeButton);
            wrapper.prepend(bar);
        }
        title.textContent = torrentsTable.getRow(rowId).full_data.name;
        document.documentElement.classList.add("details-open");
    };

    document.addEventListener("click", (event) => {
        if (!mobileQuery.matches || event.ctrlKey || event.metaKey || event.shiftKey)
            return;
        const tr = event.target.closest("#torrentsTableDiv tr");
        if (tr?.rowId !== undefined)
            open(tr.rowId);
    });
    mobileQuery.addEventListener("change", close);
}
