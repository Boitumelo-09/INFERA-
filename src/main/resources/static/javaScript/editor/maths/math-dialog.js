/* The formula dialog: LaTeX input, live preview, symbol palette.
   Used by the toolbar Σ button (insert) and by clicking a formula in the editor (edit). */
import { renderMath, validateMath } from './math-katex.js';
import { MATH_PALETTE } from './math-symbols.js';

let openOverlay = null;

/* Insert a palette item at the cursor; "§...§" becomes the selected part. */
function insertAtCursor(ta, tex) {
    const first = tex.indexOf('§');
    const second = first === -1 ? -1 : tex.indexOf('§', first + 1);
    let clean = tex;
    let selFrom = null, selTo = null;
    if (first !== -1 && second !== -1) {
        clean = tex.slice(0, first) + tex.slice(first + 1, second) + tex.slice(second + 1);
        selFrom = first;
        selTo = second - 1;
    } else {
        clean = tex.replace(/§/g, '');
    }
    if (/\\[A-Za-z]+$/.test(clean)) clean += ' '; // keep "\alpha" from fusing with the next letter
    const start = ta.selectionStart, end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + clean + ta.value.slice(end);
    if (selFrom !== null) ta.setSelectionRange(start + selFrom, start + selTo);
    else ta.setSelectionRange(start + clean.length, start + clean.length);
    ta.focus();
    ta.dispatchEvent(new Event('input'));
}

export function openMathDialog({ latex = '', display = false, canChooseType = false, onApply, onRemove = null, onClose = null }) {
    if (openOverlay) return;
    const editing = typeof onRemove === 'function';
    let isBlock = display;
    const title = editing ? 'Edit formula' : 'Insert formula';

    const overlay = document.createElement('div');
    overlay.className = 'math-dialog-overlay';
    overlay.innerHTML = `
        <div class="math-dialog" role="dialog" aria-modal="true" aria-label="${title}">
            <div class="math-dialog-head">
                <h3>${title}</h3>
                <button type="button" class="math-dialog-x" aria-label="Close"><i class="bi bi-x-lg"></i></button>
            </div>
            ${canChooseType ? `
            <div class="math-dialog-type">
                <button type="button" data-block="false">Inline <small>inside a sentence</small></button>
                <button type="button" data-block="true">Block <small>on its own line</small></button>
            </div>` : ''}
            <div class="math-dialog-preview"></div>
            <div class="math-dialog-error" hidden></div>
            <label class="math-dialog-label" for="mathLatexInput">LaTeX</label>
            <textarea id="mathLatexInput" class="math-dialog-input" rows="3" spellcheck="false"
                autocomplete="off" autocapitalize="off"
                placeholder="e.g. x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"></textarea>
            <div class="math-dialog-tabs"></div>
            <div class="math-dialog-grid"></div>
            <div class="math-dialog-foot">
                ${editing ? '<button type="button" class="math-btn math-btn-danger" data-act="remove">Remove</button>' : ''}
                <span class="math-dialog-spacer"></span>
                <button type="button" class="math-btn" data-act="cancel">Cancel</button>
                <button type="button" class="math-btn math-btn-primary" data-act="apply">${editing ? 'Apply' : 'Insert'}</button>
            </div>
        </div>`;

    const q = sel => overlay.querySelector(sel);
    const input = q('.math-dialog-input');
    const preview = q('.math-dialog-preview');
    const errorEl = q('.math-dialog-error');
    const applyBtn = q('[data-act="apply"]');
    const tabsEl = q('.math-dialog-tabs');
    const grid = q('.math-dialog-grid');

    function close() {
        overlay.remove();
        openOverlay = null;
        onClose?.();
    }

    function refresh() {
        const value = input.value.trim();
        const err = value ? validateMath(value, isBlock) : null;
        errorEl.hidden = !err;
        errorEl.textContent = err || '';
        applyBtn.disabled = !value || !!err;
        if (!value) {
            preview.innerHTML = '<span class="math-preview-empty">Your formula appears here</span>';
        } else if (!err) {
            renderMath(preview, value, isBlock);
        }
        preview.classList.toggle('is-block', isBlock);
    }

    function apply() {
        const value = input.value.trim();
        if (!value || validateMath(value, isBlock)) return;
        close();
        onApply({ latex: value, display: isBlock });
    }

    function showTab(id) {
        tabsEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.id === id));
        const tab = MATH_PALETTE.find(t => t.id === id);
        grid.innerHTML = '';
        tab.items.forEach(item => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'math-sym';
            b.title = item.tip || item.tex.replace(/§/g, '');
            const face = document.createElement('span');
            renderMath(face, item.tex.replace(/§/g, ''), false);
            b.appendChild(face);
            b.addEventListener('click', () => { insertAtCursor(input, item.tex); });
            grid.appendChild(b);
        });
    }

    MATH_PALETTE.forEach(t => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.id = t.id;
        b.textContent = t.label;
        b.addEventListener('click', () => showTab(t.id));
        tabsEl.appendChild(b);
    });
    // Keep focus and the caret in the textarea while the palette is used.
    grid.addEventListener('mousedown', e => e.preventDefault());

    overlay.querySelectorAll('.math-dialog-type button').forEach(b => {
        b.addEventListener('click', () => {
            isBlock = b.dataset.block === 'true';
            overlay.querySelectorAll('.math-dialog-type button').forEach(x => x.classList.toggle('active', x === b));
            refresh();
        });
        b.classList.toggle('active', (b.dataset.block === 'true') === isBlock);
    });

    q('.math-dialog-x').addEventListener('click', close);
    q('[data-act="cancel"]').addEventListener('click', close);
    applyBtn.addEventListener('click', apply);
    q('[data-act="remove"]')?.addEventListener('click', () => { close(); onRemove(); });
    input.addEventListener('input', refresh);
    overlay.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); apply(); }
    });

    document.body.appendChild(overlay);
    openOverlay = overlay;
    input.value = latex;
    showTab(MATH_PALETTE[0].id);
    refresh();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}