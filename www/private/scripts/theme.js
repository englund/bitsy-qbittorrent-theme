"use strict";

const mobileQuery = window.matchMedia("(max-width: 640px)");

const placeBelow = (popover, button) => {
    const rect = button.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 6}px`;
    // Hang it from whichever edge of the button is nearer the screen edge.
    const fromLeft = rect.left < window.innerWidth / 2;
    popover.style.left = fromLeft ? `${rect.left}px` : "auto";
    popover.style.right = fromLeft ? "auto" : `${window.innerWidth - rect.right}px`;
};

// Mocha sizes each window as content + headerHeight, so the taller title bar in theme.css must be set here too.
// Phones override it with their own 52px bar. Stock caps content height to fit the viewport with its 25px bar,
// so the cap shrinks by the difference.
{
    const stockHeaderHeight = MUI.Window.prototype.options.headerHeight;
    MUI.Window.prototype.options.headerHeight = 56;
    // Options' and About's tab rows, the only window toolbars; stock's 29px would clip the window's bottom.
    MUI.Window.prototype.options.toolbarHeight = 63;
    // The footer is an empty strip below the content; keep only enough to clear the rounded corners.
    MUI.Window.prototype.options.footerHeight = 12;
    const extra = 56 - stockHeaderHeight;
    // Dialog is frozen, so it's replaced; loadWindowHeight looks it up on every call.
    const dialog = window.qBittorrent.Dialog;
    window.qBittorrent.Dialog = Object.freeze({
        ...dialog,
        limitHeightToViewport: (height) => dialog.limitHeightToViewport(height + extra) - extra
    });
}

// Dialogs load in iframes, where media queries see the frame's width, not the screen's.
// Tag each dialog document so theme.css can style it as a full-screen phone sheet, and point theme.css's
// breakpoint queries at the screen: a 500px desktop dialog would otherwise get the phone rules.
{
    const originalMedia = new WeakMap();
    const tagFrame = (iframe) => {
        const doc = iframe.contentDocument;
        if (!doc)
            return;
        doc.documentElement.classList.toggle("mobile-sheet", mobileQuery.matches);
        for (const sheet of doc.styleSheets) {
            if (!sheet.href?.includes("theme.css"))
                continue;
            for (const rule of sheet.cssRules) {
                // Not instanceof CSSMediaRule: the frame has its own copy of that class.
                if (!rule.media)
                    continue;
                if (!originalMedia.has(rule))
                    originalMedia.set(rule, rule.media.mediaText);
                const media = originalMedia.get(rule);
                const isPhone = media.includes("max-width: 640px");
                if (isPhone || media.includes("min-width: 641px"))
                    rule.media.mediaText = (isPhone === mobileQuery.matches) ? "all" : "not all";
            }
        }
    };

    // How much more room the window's scrolling parts (its own, and its iframe's) need to show everything.
    const overflowOf = (win) => {
        const iframeRoot = win.querySelector(".mochaIframe")?.contentDocument?.documentElement;
        let width = 0;
        let height = 0;
        for (const root of [win, iframeRoot]) {
            if (!root)
                continue;
            for (const el of [root, ...root.querySelectorAll("*")]) {
                if (!el.clientHeight)
                    continue;
                const style = getComputedStyle(el);
                // A document scrolls without overflow set on its root.
                if ((el === iframeRoot) || /auto|scroll/.test(style.overflowX))
                    width = Math.max(width, el.scrollWidth - el.clientWidth);
                if ((el === iframeRoot) || /auto|scroll/.test(style.overflowY))
                    height = Math.max(height, el.scrollHeight - el.clientHeight);
            }
        }
        return { width, height };
    };

    // Desktop dialogs grow to show their content, up to 1000px wide and the viewport's height. A size the user
    // saved by resizing is kept, only shrunk to fit the screen (RSS Downloader skips stock's viewport cap).
    const fitDialog = (win) => {
        const instance = win?.retrieve("instance");
        if (mobileQuery.matches || !instance || instance.isMaximized)
            return;
        const { Dialog } = window.qBittorrent;
        // Add torrent windows are "uploadPage-<source>" but save their size as "uploadPage".
        const saved = localStorage.getItem(`window_${win.id.split("-")[0]}_height`) !== null;
        const resize = (width, height) => MochaUI.resizeWindow(win, { width, height, centered: true });

        const size = instance.contentWrapperEl.getSize();
        const grownWidth = saved ? size.x : Math.max(size.x, Math.min(size.x + overflowOf(win).width, 1000));
        const width = Dialog.limitWidthToViewport(grownWidth);
        if (width !== size.x)
            resize(width, size.y);
        // Measured after widening, which can reflow content shorter. Stock's height cap counts only the title bar,
        // not toolbars like Options' tabs, so the cap comes from the window's real chrome.
        const chrome = win.getBoundingClientRect().height - size.y;
        const maxHeight = window.innerHeight - 40 - chrome;
        const height = Math.min(saved ? size.y : size.y + overflowOf(win).height, maxHeight);
        if (height !== size.y)
            resize(width, height);
        if ((width !== size.x) || (height !== size.y))
            MochaUI.centerWindow(win);
    };
    // Runs after the window's own contentLoaded handlers, which fill in some dialogs (Statistics).
    const fireEvent = MUI.Window.prototype.fireEvent;
    MUI.Window.prototype.fireEvent = function(type, ...args) {
        const result = fireEvent.call(this, type, ...args);
        if ((type === "contentLoaded") && (this.options.loadMethod !== "iframe"))
            fitDialog(this.windowEl);
        return result;
    };

    // load doesn't bubble, but a capturing listener still sees it for every iframe
    document.addEventListener("load", (event) => {
        if (event.target.matches?.(".mochaIframe")) {
            tagFrame(event.target);
            fitDialog(event.target.closest(".mocha"));
        }
        // An RSS article's description is a srcdoc frame that links only the stock style.css.
        if (event.target.id === "rssDescription") {
            const link = event.target.contentDocument.createElement("link");
            link.rel = "stylesheet";
            link.href = "css/theme.css";
            event.target.contentDocument.head.append(link);
            event.target.contentDocument.documentElement.classList.add("rss-description");
        }
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
    document.addEventListener("click", (event) => {
        const tr = event.target.closest?.(":is(#torrentsTableDiv, #searchResultsTableDiv) tr");
        if (!mobileQuery.matches || !tr)
            return;
        const rect = tr.getBoundingClientRect();
        if ((event.clientX < rect.right - 44) || (event.clientY > rect.top + 44))
            return;
        // Keep the details sheet from opening, and the menu's own click listeners from closing it again.
        event.stopPropagation();
        // Anchor the menu at the ⋮'s centre (theme.css: 20px icon, 8px from the right, 9px from the top), not at the tap.
        tr.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.right - 18, clientY: rect.top + 19 }));
    }, true);

    // A search plugin row has no other tap action, so a tap anywhere on it opens its menu (Enabled, Uninstall) at the ⋮.
    document.addEventListener("click", (event) => {
        const tr = event.target.closest?.("#searchPluginsTableDiv tr");
        if (!mobileQuery.matches || !tr)
            return;
        event.stopPropagation();
        const rect = tr.getBoundingClientRect();
        tr.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.right - 22, clientY: rect.top + 32 }));
    }, true);

    // The details sheet's tracker, peer and file cards have no other tap action either; their own controls
    // (a file's checkbox, priority and expand icon) keep theirs.
    document.addEventListener("click", (event) => {
        const tr = event.target.closest?.(":is(#torrentTrackersTableDiv, #torrentPeersTableDiv, #torrentFilesTableDiv) tbody tr");
        if (!mobileQuery.matches || !tr || event.target.closest("input, select, .filesTableCollapseIcon"))
            return;
        event.stopPropagation();
        // The checkbox stays 20px; with the card's edge on its left, a tap up to 11px right of it or 12px above or
        // below it counts, which makes it a 44px target (the expand icon's starts 8px further right).
        const checkbox = tr.querySelector("input[type=checkbox]")?.getBoundingClientRect();
        if (checkbox && (event.clientX <= checkbox.right + 11) && (Math.abs(event.clientY - (checkbox.y + 10)) <= 22)) {
            tr.querySelector("input[type=checkbox]").click();
            return;
        }
        const rect = tr.getBoundingClientRect();
        tr.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.right - 18, clientY: rect.top + 19 }));
    }, true);

    // Tapping a search result opens the download window, which is what a double-click does on desktop.
    document.addEventListener("click", (event) => {
        const tr = event.target.closest("#searchResultsTableDiv tr");
        if (mobileQuery.matches && tr && !event.ctrlKey && !event.metaKey && !event.shiftKey)
            tr.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });
}

// On mobile the stock filters panel itself becomes the popover menu, so its click handlers and live counts keep working.
// It can't be hidden with its column: a popover under a display: none ancestor doesn't render.
{
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
    mobileQuery.addEventListener("change", (event) => {
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
        sortTable = document.getElementById(cardTables[page])?.dynamicTable;
        sortButton.hidden = !sortTable;
        if (sortTable)
            renderSortButton();
    };

    // The tables of these pages are cards on phones, so their headers are hidden.
    const cardTables = {
        propTrackersLink: "torrentTrackersTableDiv",
        propPeersLink: "torrentPeersTableDiv",
        propFilesLink: "torrentFilesTableDiv"
    };
    let sortTable;
    let sortButton;
    let sortMenu;

    const renderSortButton = () => {
        sortButton.firstElementChild.textContent = sortTable.columns[sortTable.sortedColumn]?.caption ?? "";
        sortButton.classList.toggle("reversed", sortTable.reverseSort === "1");
    };

    // Stands in for clicking a column header, like the torrent list's sort menu.
    const buildSortMenu = () => {
        sortButton = document.createElement("button");
        sortButton.type = "button";
        sortButton.id = "detailsSortButton";
        sortMenu = document.createElement("div");
        sortButton.popoverTargetElement = sortMenu;
        sortButton.append(document.createElement("span"));
        sortMenu.id = "detailsSortMenu";
        sortMenu.className = "popoverMenu";
        sortMenu.popover = "auto";
        sortMenu.role = "menu";
        sortMenu.addEventListener("toggle", (event) => {
            if (event.newState !== "open")
                return;
            sortMenu.replaceChildren(...sortTable.columns.filter(column => column.caption && (column.visible !== "0")).map((column) => {
                const item = document.createElement("button");
                item.type = "button";
                item.role = "menuitemradio";
                item.dataset.column = column.name;
                item.textContent = column.caption;
                item.ariaChecked = String(column === sortTable.columns[sortTable.sortedColumn]);
                return item;
            }));
            sortMenu.classList.toggle("reversed", sortTable.reverseSort === "1");
            placeBelow(sortMenu, sortButton);
        });
        // Picking the current column again flips the direction, same as clicking its header.
        sortMenu.addEventListener("click", (event) => {
            const item = event.target.closest("[data-column]");
            if (!item)
                return;
            sortTable.setSortedColumn(item.dataset.column);
            renderSortButton();
            sortMenu.hidePopover();
        });
        document.getElementById("propertiesPanel_header").append(sortButton, sortMenu);

        // The cards label some values with their column's caption, which is translated.
        for (const id of Object.values(cardTables)) {
            const div = document.getElementById(id);
            for (const column of div.dynamicTable.columns)
                div.style.setProperty(`--label-${column.name}`, JSON.stringify(column.caption));
        }
    };

    const go = (page) => {
        history.pushState({ detailsSheet: page }, "");
        render();
    };

    // The torrent list has no file or web seed counts, so each section's list is fetched once when the sheet opens.
    const countSources = {
        propTrackersLink: ["torrents/trackers", (list) => list.length],
        propPeersLink: ["sync/torrentPeers", (data) => Object.keys(data.peers ?? {}).length],
        propWebSeedsLink: ["torrents/webseeds", (list) => list.length],
        propFilesLink: ["torrents/files", (list) => list.length]
    };
    let countedHash;

    const loadCounts = (hash) => {
        countedHash = hash;
        for (const row of document.querySelectorAll("#detailsSheetSections button")) {
            delete row.dataset.count;
            const [endpoint, count] = countSources[row.dataset.tab];
            fetch(`api/v2/${endpoint}?${new URLSearchParams({ hash })}`)
                .then((response) => (response.ok ? response.json() : Promise.reject()))
                .then((data) => {
                    if (countedHash === hash)
                        row.dataset.count = count(data);
                })
                .catch(() => {});
        }
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
            row.dataset.tab = tab.id;
            row.append(...tab.firstElementChild.cloneNode(true).childNodes);
            row.addEventListener("click", () => go(tab.id));
            sections.append(row);
        }
        document.getElementById("propBarsWrapper").after(sections);
        buildSortMenu();
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
        loadCounts(tr.rowId);
        go("propGeneralLink");
    });
    window.addEventListener("popstate", render);
    mobileQuery.addEventListener("change", render);
    // history.state survives a reload; a sheet left open then shouldn't count as open now.
    if (history.state?.detailsSheet)
        history.replaceState(null, "");
}

// Mobile Options and About: a list of the tabs that drills into each one, instead of the scrolling tab row.
// Like the details sheet, each level is a history entry, so the back gesture steps back and then closes the window.
// About's first tab is the list page itself (its content above the list), so it gets no row.
const drillDownTabs = ({ winId, tabsId, readyId, key, listId, listClass, subpageClass, homeTabId }) => {
    let ownsHistory = false;
    let windowTitle;

    const render = () => {
        const win = document.getElementById(winId);
        if (!win || !ownsHistory)
            return;
        const page = history.state?.[key];
        if (page === undefined) {
            ownsHistory = false;
            MochaUI.closeWindow(win);
            return;
        }
        const isList = page === "list";
        win.classList.toggle(listClass, mobileQuery.matches && isList);
        win.classList.toggle(subpageClass, mobileQuery.matches && !isList);
        document.getElementById(`${winId}_title`).textContent = isList ? windowTitle : document.getElementById(page).textContent.trim();
        const tabId = isList ? homeTabId : page;
        if (tabId)
            document.getElementById(tabId).click();
    };

    const go = (page) => {
        history.pushState({ [key]: page }, "");
        render();
    };

    const setUp = (win) => {
        windowTitle = document.getElementById(`${winId}_title`).textContent;

        const backButton = document.createElement("button");
        backButton.type = "button";
        backButton.className = "sheetBack";
        backButton.ariaLabel = "Back";
        // Keep Mocha from starting a window drag from the title bar.
        backButton.addEventListener("mousedown", (event) => event.stopPropagation());
        backButton.addEventListener("click", () => history.back());
        document.getElementById(`${winId}_titleBar`).prepend(backButton);

        const list = document.createElement("nav");
        list.id = listId;
        for (const tab of document.querySelectorAll(`#${tabsId} li`)) {
            if (tab.id === homeTabId)
                continue;
            const row = document.createElement("button");
            row.type = "button";
            row.append(...tab.firstElementChild.cloneNode(true).childNodes);
            row.addEventListener("click", () => go(tab.id));
            list.append(row);
        }
        const content = document.getElementById(`${winId}_content`);
        if (homeTabId)
            content.append(list);
        else
            content.prepend(list);

        ownsHistory = true;
        go("list");
    };

    // The window, its toolbar (tabs) and its content all arrive asynchronously.
    const check = () => {
        const win = document.getElementById(winId);
        if (!win) {
            // Closed with × (or Options' Save): drop the history entries it left behind.
            if (ownsHistory && history.state?.[key]) {
                ownsHistory = false;
                history.go(history.state[key] === "list" ? -1 : -2);
            }
            return;
        }
        if (mobileQuery.matches && !ownsHistory && !document.getElementById(listId)
            && document.getElementById(tabsId) && document.getElementById(readyId))
            setUp(win);
    };

    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", render);
    mobileQuery.addEventListener("change", () => {
        check();
        render();
    });
    // history.state survives a reload; a window left open then shouldn't count as open now.
    if (history.state?.[key])
        history.replaceState(null, "");
};

drillDownTabs({
    winId: "preferencesPage", tabsId: "preferencesTabs", readyId: "BehaviorTab", key: "options",
    listId: "prefCategoryList", listClass: "prefs-list", subpageClass: "prefs-subpage"
});
drillDownTabs({
    winId: "aboutpage", tabsId: "aboutTabs", readyId: "aboutAboutContent", key: "about",
    listId: "aboutSectionList", listClass: "about-list", subpageClass: "about-subpage", homeTabId: "aboutAboutLink"
});

// Mobile RSS: the three panes (feeds, articles, article) become drill-down pages. Like the details sheet,
// each level is a history entry, so the back gesture steps out of it.
{
    const depth = { articles: 1, article: 2 };
    let view;
    let title;

    const render = () => {
        const page = (mobileQuery.matches && history.state?.rss) || "feeds";
        view.dataset.rssPage = page;
        if (page === "articles")
            title.textContent = document.querySelector("#rssFeedTableDiv tr.selected span")?.textContent.replace(/\s*\(\d+\)$/, "") ?? "";
    };

    const go = (page) => {
        history.pushState({ rss: page }, "");
        render();
    };

    const build = () => {
        const bar = document.createElement("div");
        bar.id = "rssSheetBar";
        const backButton = document.createElement("button");
        backButton.type = "button";
        backButton.className = "sheetBack";
        backButton.ariaLabel = "Back";
        backButton.addEventListener("click", () => history.back());
        title = document.createElement("h3");
        // Desktop downloads an article with a double-click.
        const downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.id = "rssDownloadButton";
        downloadButton.append(...document.querySelector("#rssArticleMenu a[href='#Download']").cloneNode(true).childNodes);
        downloadButton.addEventListener("click", () => {
            document.querySelector("#rssArticleTableDiv tr.selected")?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        });
        bar.append(backButton, title, downloadButton);
        view.prepend(bar);
        render();
    };

    document.addEventListener("click", (event) => {
        if (!mobileQuery.matches || !view || event.ctrlKey || event.metaKey || event.shiftKey)
            return;
        if (event.target.closest("#rssFeedTableDiv tr"))
            go("articles");
        else if (event.target.closest("#rssArticleTableDiv tr"))
            go("article");
        // Leaving RSS from the ☰ menu: drop the pages it left in the history.
        else if (event.target.closest("#mobileMenu [data-click]") && history.state?.rss)
            history.go(-depth[history.state.rss]);
    });
    window.addEventListener("popstate", () => view && render());
    mobileQuery.addEventListener("change", () => view && render());
    // history.state survives a reload; pages left open then shouldn't count as open now.
    if (history.state?.rss)
        history.replaceState(null, "");

    // The RSS view is loaded by XHR the first time its tab is opened.
    const waitForView = new MutationObserver(() => {
        view = document.getElementById("rssView");
        if (!view || !document.querySelector("#rssArticleMenu"))
            return;
        waitForView.disconnect();
        build();
    });
    waitForView.observe(document.body, { childList: true, subtree: true });
}

// Mobile RSS Downloader: rules → rule editor → matching articles, instead of three squeezed columns.
// Like Options, each level is a history entry, so the back gesture steps back and then closes the window.
{
    const depth = { rules: 1, rule: 2, articles: 3 };
    let ownsHistory = false;
    let windowTitle;

    const render = () => {
        const win = document.getElementById("rssdownloaderpage");
        if (!win || !ownsHistory)
            return;
        const page = history.state?.rssDownloader;
        if (page === undefined) {
            ownsHistory = false;
            MochaUI.closeWindow(win);
            return;
        }
        win.dataset.rssdlPage = page;
        const rules = window.qBittorrent.RssDownloader.rssDownloaderRulesTable;
        document.getElementById("rssdownloaderpage_title").textContent = {
            rules: windowTitle,
            rule: rules.getRow(rules.selectedRows.at(-1))?.full_data.name,
            articles: document.getElementById("articleTableDesc").textContent
        }[page];
    };

    const go = (page) => {
        history.pushState({ rssDownloader: page }, "");
        render();
    };

    const setUp = () => {
        windowTitle = document.getElementById("rssdownloaderpage_title").textContent;

        const backButton = document.createElement("button");
        backButton.type = "button";
        backButton.className = "sheetBack";
        backButton.ariaLabel = "Back";
        // Keep Mocha from starting a window drag from the title bar.
        backButton.addEventListener("mousedown", (event) => event.stopPropagation());
        backButton.addEventListener("click", () => history.back());
        document.getElementById("rssdownloaderpage_titleBar").prepend(backButton);

        const articlesRow = document.createElement("button");
        articlesRow.type = "button";
        articlesRow.id = "rssdlArticlesRow";
        articlesRow.textContent = document.getElementById("articleTableDesc").textContent;
        articlesRow.addEventListener("click", () => go("articles"));
        document.querySelector("#rssdownloaderpage #saveButton").before(articlesRow);

        ownsHistory = true;
        go("rules");
    };

    document.addEventListener("click", (event) => {
        if (ownsHistory && history.state?.rssDownloader === "rules" && !event.ctrlKey && !event.metaKey && !event.shiftKey
            && event.target.closest("#rssDownloaderRuleTableDiv tr"))
            go("rule");
    });

    // The window and its content arrive asynchronously.
    const check = () => {
        if (!document.getElementById("rssdownloaderpage")) {
            // Closed with ×: drop the history entries it left behind.
            if (ownsHistory && history.state?.rssDownloader) {
                ownsHistory = false;
                history.go(-depth[history.state.rssDownloader]);
            }
            return;
        }
        if (mobileQuery.matches && !ownsHistory && !document.getElementById("rssdlArticlesRow") && document.querySelector("#rssdownloaderpage #saveButton"))
            setUp();
    };

    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", render);
    mobileQuery.addEventListener("change", check);
    // history.state survives a reload; a window left open then shouldn't count as open now.
    if (history.state?.rssDownloader)
        history.replaceState(null, "");
}

// Manage Cookies is a table of icon-only images and unlabelled fields. On phones each cookie is a card, so each field
// gets a visible label (its aria-label) and the add and remove images get text buttons that click them. theme.css
// hides the additions on desktop.
new MutationObserver(() => {
    const table = document.getElementById("manageCookiesTable");
    if (!table)
        return;
    for (const row of table.querySelectorAll("tbody tr:not(.invisible, .cookieCard)")) {
        row.classList.add("cookieCard");
        for (const input of row.querySelectorAll("input")) {
            const label = document.createElement("label");
            const text = document.createElement("span");
            text.className = "cookieFieldLabel";
            text.textContent = input.ariaLabel;
            input.before(label);
            label.append(text, input);
        }
        const removeImage = row.querySelector(".removeCookie");
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "cookieRemoveButton";
        removeButton.textContent = removeImage.alt;
        removeButton.addEventListener("click", () => removeImage.click());
        removeImage.after(removeButton);
    }
    const addImage = table.querySelector("tfoot .addCookie");
    if (addImage && !table.querySelector(".cookieAddButton")) {
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "cookieAddButton";
        const icon = addImage.cloneNode();
        icon.className = "";
        icon.alt = "";
        addButton.append(icon, addImage.alt);
        addButton.addEventListener("click", () => addImage.click());
        addImage.after(addButton);
    }
}).observe(document.body, { childList: true, subtree: true });

// Bulk rename names these fields only by placeholder or aria-label; theme.css shows these labels on phones.
new MutationObserver(() => {
    for (const field of document.querySelectorAll(":is(#multiRenameSearch, #multiRenameReplace, #applies_to_option):not(.sheetFieldLabel + *)")) {
        const label = document.createElement("label");
        label.className = "sheetFieldLabel";
        label.htmlFor = field.id;
        label.textContent = field.ariaLabel;
        field.before(label);
    }
}).observe(document.body, { childList: true, subtree: true });

// Stock context menus are plain absolutely positioned lists, so one opened from inside the filter popover (which is in
// the top layer) would sit behind it. While a popover is open, a menu that opens is lifted into the top layer too.
new MutationObserver((records) => {
    for (const { target } of records) {
        if (!target.classList.contains("contextMenu"))
            continue;
        const visible = target.classList.contains("visible");
        if (visible && !target.popover && document.querySelector(":popover-open")) {
            target.popover = "manual";
            target.showPopover();
        }
        else if (!visible && target.popover) {
            if (target.matches(":popover-open"))
                target.hidePopover();
            target.removeAttribute("popover");
        }
    }
}).observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
