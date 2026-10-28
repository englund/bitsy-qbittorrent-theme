# Design principles (mobile, ≤ 640px)

Distilled from Apple's Human Interface Guidelines and Google's Material Design 3 (Oct 2026). Every new or changed mobile screen follows these. A screen that can't (usually because stock markup or behaviour is in the way) is an exception: ask the user before making it (when working unattended, leave that screen as is and report it), then list it under "Exceptions" with the reason.

1. **Touch targets:** 44×44px minimum on everything tappable (Apple 44pt; Material 48dp), at least 8px between neighbouring targets. List rows, menu items and the primary button are 48px, which satisfies both (chosen by the user). A small visual (20px checkbox, 16px icon) is fine when its row or padding is the target.
2. **Spacing:** only 4 / 8 / 12 / 16 / 24.
3. **Gutter:** 16px side margins on every screen (Material and iOS; the login page already used it). Chosen by the user over the earlier 12px.
4. **Lists and drill-down:** one item per row, full width, a trailing chevron when the row opens another page, each level a history entry with a back chevron at the leading edge of the title bar. Never a horizontally scrolling table or tab row for primary content. Result lists are cards.
5. **Forms:** label above a full-width field, never a placeholder as the only label, 16px input text (stops iOS zoom). Radios for 2–5 exclusive choices, a select beyond that. A checkbox sits on its label's row, and the whole row is the target.
6. **One primary action per view:** blue filled, white text, full width in a sticky footer or trailing in the title bar. Other actions are plain (grey) buttons; show priority by style, not size. Destructive actions are red. In a row of buttons the primary is trailing; in a stack it's on top.
7. **Dialogs:** forms and multi-step tasks are full-screen sheets (title bar with close/back, content, sticky footer). Small centred dialogs are only for short confirmations with at most 3 buttons. One modal at a time; nothing opens behind another layer.
8. **Menus:** items 44–48px, most-used first, grouped with dividers, one submenu level at most, "…" when more input follows, icons on every item of a group or none. A menu taller than the screen scrolls inside its own box.
9. **Type:** body 16px (line height 24), secondary 14px, nothing under 11px; sheet titles about 20–22px.
10. **Contrast:** text at least 4.5:1 (3:1 at 18px+ or bold); icons and control outlines at least 3:1.
11. **Dark surfaces:** depth shown by lighter tones, not shadows: background < card < sheet/menu < raised control.
12. **States:** every control has a pressed/active state; disabled controls are dimmed but stay visible.
13. **Same features at every size:** mobile may move a feature (into ☰, a drill-down, a long-press menu) but never removes it.

Sources: Apple HIG, Google's touch-target guidance and the Material 3 component docs and tokens.

**Exceptions** (approved by the user)
- Context menus stay stock, 30px rows (below rule 8). The user compared them with a 44px bottom sheet and preferred stock. Their text stays 13px too (below rule 9): at 16px the torrent menu runs off an 812px screen.
- Data tables (Add torrent's files; Torrent Creator; Rename Files) are 14px, not 16px (rule 9). At 16px their narrow columns (IP, port, tier) cut off almost everything. Chosen by the user from mockups.
