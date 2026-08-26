/* Table insert control for the toolbar. Filename kept to avoid an
   extra rename diff — this no longer types "/"; it's a toggle
   button, same pattern as the colour picker. Table schema itself
   lives in extensions.js since the View modal needs it too. */

export function buildTableContextBar(editor) {
    const el = document.createElement('div');
    el.className = 'table-context-bar';

    const actions = [
        { icon: 'bi-arrow-bar-down',     title: 'Add row below',      run: e => e.chain().focus().addRowAfter().run() },
        { icon: 'bi-dash-square',        title: 'Delete row',         run: e => e.chain().focus().deleteRow().run() },
        { icon: 'bi-arrow-bar-right',    title: 'Add column after',   run: e => e.chain().focus().addColumnAfter().run() },
        { icon: 'bi-dash-square-dotted', title: 'Delete column',      run: e => e.chain().focus().deleteColumn().run() },
        { icon: 'bi-trash',              title: 'Delete table', danger: true, run: e => e.chain().focus().deleteTable().run() },
    ];

    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'table-context-btn' + (a.danger ? ' danger' : '');
        btn.title = a.title;
        btn.innerHTML = `<i class="bi ${a.icon}"></i>`;
        btn.addEventListener('click', () => a.run(editor));
        el.appendChild(btn);
    });

    return { el, sync() { el.classList.toggle('visible', editor.isActive('table')); } };
}

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