"use strict";

// Applies the theme last saved by color-scheme.js, using the same root classes as the WebUI.
(() => {
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem("qbt_theme")) ?? {};
    }
    catch {}
    const { colorScheme, accent } = saved;
    const root = document.documentElement;
    const isDark = (colorScheme === "dark") || (colorScheme === "oled")
        || ((colorScheme !== "light") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    root.classList.toggle("oled", (colorScheme === "oled"));
    root.dataset.accent = accent ?? "blue";
})();
