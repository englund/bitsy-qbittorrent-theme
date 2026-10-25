"use strict";

const placeBelow = (popover, button) => {
    const rect = button.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 6}px`;
    // Hang it from whichever edge of the button is nearer the screen edge.
    const fromLeft = rect.left < window.innerWidth / 2;
    popover.style.left = fromLeft ? `${rect.left}px` : "auto";
    popover.style.right = fromLeft ? "auto" : `${window.innerWidth - rect.right}px`;
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

// Mobile hides the menu bar, the main tabs and Options; this menu clicks the hidden stock elements instead.
window.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("mobileMenuButton");
    const menu = document.getElementById("mobileMenu");
    menu.addEventListener("toggle", (event) => {
        if (event.newState === "open")
            placeBelow(menu, button);
    });
    menu.addEventListener("click", (event) => {
        const item = event.target.closest("[data-click]");
        if (!item)
            return;
        menu.hidePopover();
        document.getElementById(item.dataset.click).click();
    });
});

// The ⋮ on each mobile card is a pseudo-element (the rows are virtualized and rebuilt by stock), so a tap in its
// corner opens the stock context menu, the same one a long press opens.
{
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    document.addEventListener("click", (event) => {
        const tr = event.target.closest?.("#torrentsTableDiv tr");
        if (!mobileQuery.matches || !tr)
            return;
        const rect = tr.getBoundingClientRect();
        if ((event.clientX < rect.right - 44) || (event.clientY > rect.top + 40))
            return;
        // Keep the details sheet from opening, and the menu's own click listeners from closing it again.
        event.stopPropagation();
        // Anchor the menu at the ⋮'s centre (theme.css: 20px icon, 8px from the right, 9px from the top), not at the tap.
        tr.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.right - 18, clientY: rect.top + 19 }));
    }, true);
}

// On mobile the stock filters panel itself becomes the popover menu, so its click handlers and live counts keep working.
// It can't be hidden with its column: a popover under a display: none ancestor doesn't render.
{
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    let menu;
    let button;
    // The menu has the counts; the button only has room for the names.
    const nameOf = (item) => item.textContent.replace(/\s*\(\d+\)\s*$/, "").trim();

    const renderButton = () => {
        const status = menu.querySelector("#statusFilterList .selectedFilter") ?? document.getElementById("all_filter");
        if (!status)
            return;
        // The first item of the other lists is their "All".
        const others = [...menu.querySelectorAll(":is(#categoryFilterList, #tagFilterList, #trackerFilterList) .selectedFilter:not(:first-child)")];
        button.firstElementChild.src = status.querySelector("img").src;
        // The icon already shows the status, and there's only room for one name at 375px.
        button.lastElementChild.textContent = (others.length ? others : [status]).map(nameOf).join(" · ");
    };
    const setUp = () => {
        menu.toggleAttribute("popover", mobileQuery.matches);
        menu.classList.toggle("popoverMenu", mobileQuery.matches);
    };

    // client.js creates the panel after an async start-up step, then loads filters.html into it by XHR,
    // and the category, tag and tracker lists fill in after that.
    const waitForMenu = new MutationObserver(() => {
        menu = document.getElementById("Filters_pad");
        if (!menu)
            return;
        waitForMenu.disconnect();
        button = document.getElementById("mobileFilterButton");
        setUp();
        mobileQuery.addEventListener("change", setUp);
        new MutationObserver(renderButton).observe(menu, { subtree: true, childList: true, characterData: true, attributeFilter: ["class"] });
        menu.addEventListener("toggle", (event) => {
            if (event.newState === "open")
                placeBelow(menu, button);
        });
        menu.addEventListener("click", (event) => {
            if (event.target.closest(".link") && menu.matches(":popover-open"))
                menu.hidePopover();
        });
    });
    waitForMenu.observe(document.body, { childList: true, subtree: true });
}

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
        backButton.className = "sheetBack";
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

// Mobile Options: a list of the categories that drills into each one, instead of the scrolling tab row.
// Like the details sheet, each level is a history entry, so the back gesture steps back and then closes the window.
{
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    let ownsHistory = false;
    let optionsTitle;

    const render = () => {
        const win = document.getElementById("preferencesPage");
        if (!win || !ownsHistory)
            return;
        const page = history.state?.options;
        if (page === undefined) {
            ownsHistory = false;
            MochaUI.closeWindow(win);
            return;
        }
        const isList = page === "list";
        win.classList.toggle("prefs-list", mobileQuery.matches && isList);
        win.classList.toggle("prefs-subpage", mobileQuery.matches && !isList);
        document.getElementById("preferencesPage_title").textContent = isList ? optionsTitle : document.getElementById(page).textContent.trim();
        if (!isList)
            document.getElementById(page).click();
    };

    const go = (page) => {
        history.pushState({ options: page }, "");
        render();
    };

    const setUp = (win) => {
        optionsTitle = document.getElementById("preferencesPage_title").textContent;

        const backButton = document.createElement("button");
        backButton.type = "button";
        backButton.className = "sheetBack";
        backButton.ariaLabel = "Back";
        // Keep Mocha from starting a window drag from the title bar.
        backButton.addEventListener("mousedown", (event) => event.stopPropagation());
        backButton.addEventListener("click", () => history.back());
        document.getElementById("preferencesPage_titleBar").prepend(backButton);

        const list = document.createElement("nav");
        list.id = "prefCategoryList";
        for (const tab of document.querySelectorAll("#preferencesTabs li")) {
            const row = document.createElement("button");
            row.type = "button";
            row.append(...tab.firstElementChild.cloneNode(true).childNodes);
            row.addEventListener("click", () => go(tab.id));
            list.append(row);
        }
        document.getElementById("preferencesPage_content").prepend(list);

        ownsHistory = true;
        go("list");
    };

    // The window, its toolbar (tabs) and its content all arrive asynchronously.
    const check = () => {
        const win = document.getElementById("preferencesPage");
        if (!win) {
            // Closed with × or Save: drop the history entries it left behind.
            if (ownsHistory && history.state?.options) {
                ownsHistory = false;
                history.go(history.state.options === "list" ? -1 : -2);
            }
            return;
        }
        if (mobileQuery.matches && !ownsHistory && !document.getElementById("prefCategoryList")
            && document.getElementById("preferencesTabs") && document.getElementById("BehaviorTab"))
            setUp(win);
    };

    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", render);
    mobileQuery.addEventListener("change", () => {
        check();
        render();
    });
    // history.state survives a reload; a window left open then shouldn't count as open now.
    if (history.state?.options)
        history.replaceState(null, "");
}
