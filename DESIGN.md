# Design rules

Every new or changed screen follows these. A screen that can't (usually because stock markup or behaviour is in the way) is an exception: ask the user before making it (when working unattended, leave that screen as is and report it), then list it under "Exceptions" with the reason.

## All sizes

1. **Contrast:** text at least 4.5:1 (3:1 at 18px+ or bold); icons and control outlines at least 3:1.
2. **Dark surfaces:** depth shown by lighter tones, not shadows: background < card < sheet/menu < raised control.
3. **States:** every control has a pressed/active state; disabled controls are dimmed but stay visible.
4. **Same features at every size:** phones may move a feature (into ☰, a drill-down, a long-press menu) but never remove it.
5. **Destructive actions:** red text on a plain button, never a red fill (white text can't reach 4.5:1 on red).

## Phones (≤ 640px)

Distilled from Apple's Human Interface Guidelines and Google's Material Design 3.

6. **Touch targets:** 44×44px minimum on everything tappable (Apple 44pt; Material 48dp), at least 8px between neighbouring targets. List rows, menu items and the primary button are 48px, which satisfies both. A small visual (20px checkbox, 16px icon) is fine when its row or padding is the target.
7. **Spacing:** gaps between elements are 4 / 8 / 12 / 16 / 24 only. Exempt: padding that grows a small icon to the touch target (10px around a 24px icon, 14px around a 16px one), and offsets that line up with stock's own geometry (its 20px file-tree indents).
8. **Gutter:** 16px side margins on every screen.
9. **Lists and drill-down:** one item per row, full width, a trailing chevron when the row opens another page, each level a history entry with a back chevron at the leading edge of the title bar. Never a horizontally scrolling table or tab row for primary content. Result lists are cards.
10. **Forms:** label above a full-width field, never a placeholder as the only label, 16px input text (stops iOS zoom). Radios for 2–5 exclusive choices, a select beyond that. A checkbox sits on its label's row, and the whole row is the target.
11. **One primary action per view:** accent filled, white text, full width in a sticky footer or trailing in the title bar. Other actions are plain (grey) buttons; show priority by style, not size. In a row of buttons the primary is trailing; in a stack it's on top.
12. **Dialogs:** forms and multi-step tasks are full-screen sheets (title bar with close/back, content, sticky footer). Small centred dialogs are only for short confirmations with at most 3 buttons. One modal at a time; nothing opens behind another layer.
13. **Menus:** items 44–48px, most-used first, grouped with dividers, one submenu level at most, "…" when more input follows, icons on every item of a group or none. A menu taller than the screen scrolls inside its own box.
14. **Type:** body 16px (line height 24), secondary 14px, nothing under 11px; sheet titles about 20–22px.

**Exceptions**
- Context menus stay stock, with 30px rows (below rule 13) and 13px text (below rule 14): at 16px the torrent menu runs off an 812px screen.
- Data tables (Add torrent's files; Torrent Creator; Rename Files) are 14px (below rule 14): at 16px their narrow columns (IP, port, tier) cut off almost everything.

## Desktop (> 640px)

15. **Stock's layout, restyled:** panels, toolbar, tables and windows stay where stock puts them, and body text stays at stock's 13px. Change how things look, not where they are.
16. **Window title bar:** 56px, 16px title, 36px close button. theme.js sets Mocha's `headerHeight` to match, so windows grow instead of clipping.
17. **Tabs:** a segmented control, the selected tab filled with the accent.
18. **Primary button:** accent filled, white text, trailing. In a dialog whose content scrolls (Options' Save, Add torrent's Download) it sits in a footer that stays in view.
19. **Simple dialogs:** a heading, some text, one button.
20. **Menus:** context menus and the menu bar's drop-downs share one panel style: `--surface-3`, a `--menu-border` border, `--radius` corners, 4px padding.
