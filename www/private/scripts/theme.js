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

// Mobile hides the properties panel, so Mocha lays it out at 0px, and Mocha splits space in proportion to current heights.
// Back on desktop (e.g. a phone rotated to landscape), restore the saved split before Mocha lays the column out again.
{
    window.matchMedia("(max-width: 640px)").addEventListener("change", (event) => {
        if (event.matches)
            return;
        const panel = document.getElementById("propertiesPanel");
        const transferList = document.getElementById("transferList");
        // The saved split is relative to the window, but Mocha only shares out what the two panels have together.
        const shared = panel.offsetHeight + transferList.offsetHeight;
        const panelHeight = Number(localStorage.getItem("properties_height_rel") ?? 0.5) * window.innerHeight;
        panel.style.height = `${panelHeight}px`;
        transferList.style.height = `${shared - panelHeight}px`;
        window.dispatchEvent(new CustomEvent("resize"));
    });
}

// Mobile hides the properties panel; tapping a card opens it as a full-screen details sheet instead.
// The sheet opens on General, which links to the other tabs as drill-down pages. Each level is a history
// entry, so the phone's back gesture steps out of it.
{
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    let bar;
    let title;
    let torrentName = "";

    const selectTab = (tabId) => {
        const tab = document.getElementById(tabId);
        // Stock collapses the panel when the selected tab is clicked again, and remembers that for desktop.
        if (!tab.classList.contains("selected"))
            tab.click();
    };

    const render = () => {
        const page = mobileQuery.matches && bar ? history.state?.detailsSheet : undefined;
        document.documentElement.classList.toggle("details-open", page !== undefined);
        if (page === undefined)
            return;
        const isSubpage = page !== "propGeneralLink";
        bar.classList.toggle("subpage", isSubpage);
        title.textContent = isSubpage ? document.getElementById(page).textContent.trim() : torrentName;
        selectTab(page);
    };

    const go = (page) => {
        history.pushState({ detailsSheet: page }, "");
        render();
    };

    const build = () => {
        bar = document.createElement("div");
        bar.id = "detailsSheetBar";
        const backButton = document.createElement("button");
        backButton.type = "button";
        backButton.id = "detailsSheetBack";
        backButton.ariaLabel = "Back";
        title = document.createElement("h3");
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "mochaCloseButton";
        closeButton.ariaLabel = "Close";
        for (const button of [backButton, closeButton])
            button.addEventListener("click", () => history.back());
        bar.append(backButton, title, closeButton);
        document.getElementById("propertiesPanel_wrapper").prepend(bar);

        const sections = document.createElement("nav");
        sections.id = "detailsSheetSections";
        for (const tab of document.querySelectorAll("#propertiesTabs li:not(#propGeneralLink)")) {
            const row = document.createElement("button");
            row.type = "button";
            row.append(...tab.firstElementChild.cloneNode(true).childNodes);
            row.addEventListener("click", () => go(tab.id));
            sections.append(row);
        }
        document.getElementById("propBarsWrapper").after(sections);
    };

    document.addEventListener("click", (event) => {
        if (!mobileQuery.matches || event.ctrlKey || event.metaKey || event.shiftKey)
            return;
        const tr = event.target.closest("#torrentsTableDiv tr");
        if (tr?.rowId === undefined)
            return;
        torrentName = torrentsTable.getRow(tr.rowId).full_data.name;
        if (!bar)
            build();
        go("propGeneralLink");
    });
    window.addEventListener("popstate", render);
    mobileQuery.addEventListener("change", render);
    // history.state survives a reload; a sheet left open then shouldn't count as open now.
    if (history.state?.detailsSheet)
        history.replaceState(null, "");
}
