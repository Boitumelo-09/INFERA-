/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/popover-guard.js
   Keeps the toolbar's dropdowns (colour / table / drawing) inside the
   screen on narrow viewports, where their button can be near the edge.
═══════════════════════════════════════════════════════════════════ */

const mount = document.getElementById('editorToolbarMount');
const PICKERS = '.tiptap-color-picker, .tiptap-table-picker, .tiptap-drawing-picker';
const POPOVERS = '.tiptap-color-popover, .tiptap-table-popover, .tiptap-drawing-popover';
const MARGIN = 8;

function keepOnScreen(picker) {
    const pop = picker.querySelector(POPOVERS);
    if (!pop) return;
    pop.style.left = ''; // back to the stylesheet's position
    if (!picker.classList.contains('open')) return;

    const vw = document.documentElement.clientWidth;
    let shift = 0;
    const r = pop.getBoundingClientRect();
    if (r.right > vw - MARGIN) shift -= r.right - (vw - MARGIN);
    if (r.left + shift < MARGIN) shift += MARGIN - (r.left + shift);
    if (shift) pop.style.left = `${shift}px`;
}

if (mount) {
    new MutationObserver(records => {
        records.forEach(r => { if (r.target.matches?.(PICKERS)) keepOnScreen(r.target); });
    }).observe(mount, { attributes: true, attributeFilter: ['class'], subtree: true });

    window.addEventListener('resize', () => {
        mount.querySelectorAll(`${PICKERS}.open`).forEach(keepOnScreen);
    });
}