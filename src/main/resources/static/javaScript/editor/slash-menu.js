/* Table insert control for the toolbar. Filename kept to avoid an
   extra rename diff — this no longer types "/"; it's a toggle
   button, same pattern as the colour picker. Table schema itself
   lives in extensions.js since the View modal needs it too. */

export function buildTableInsertControl(editor) {
    const wrap = document.createElement('span');
    wrap.className = 'tiptap-table-picker';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tiptap-toolbar-btn';
    btn.title = 'Insert table';
    btn.setAttribute('aria-label', 'Insert table');
    btn.innerHTML = `<i class="bi bi-table"></i>`;

    const popover = document.createElement('div');
    popover.className = 'tiptap-table-popover';
    popover.innerHTML = `
        <label>Rows<input type="number" min="1" max="20" value="3" id="tableRowsInput" /></label>
        <label>Columns<input type="number" min="1" max="10" value="3" id="tableColsInput" /></label>
        <button type="button" class="tiptap-table-insert-btn">Insert</button>
    `;
    const rowsInput = popover.querySelector('#tableRowsInput');
    const colsInput = popover.querySelector('#tableColsInput');

    popover.querySelector('.tiptap-table-insert-btn').addEventListener('click', () => {
        const rows = Math.min(20, Math.max(1, parseInt(rowsInput.value, 10) || 1));
        const cols = Math.min(10, Math.max(1, parseInt(colsInput.value, 10) || 1));
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        wrap.classList.remove('open');
    });

    btn.addEventListener('click', e => { e.stopPropagation(); wrap.classList.toggle('open'); });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });

    wrap.appendChild(btn);
    wrap.appendChild(popover);

    return { el: wrap, sync() { btn.classList.toggle('is-active', editor.isActive('table')); } };
}