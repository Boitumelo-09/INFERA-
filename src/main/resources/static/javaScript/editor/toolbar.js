/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/toolbar.js
   Builds the formatting toolbar and wires it to a live Tiptap editor
   instance. Kept separate from tiptap-editor.js so the button
   registry can grow (e.g. a future Drawing button in Phase 2)
   without touching editor mount/init logic.
═══════════════════════════════════════════════════════════════════ */

import { buildTableInsertControl, buildTableContextBar } from './slash-menu.js';
import { createDrawing, drawingStore, revealDrawing } from './drawing-node.js';
import { drawingSession } from './drawing-canvas.js';
import { confirmDialog } from './confirm-dialog.js';
const GROUPS = [
    [
        { action: 'bold',      icon: 'bi-type-bold',          title: 'Bold (Ctrl+B)' },
        { action: 'italic',    icon: 'bi-type-italic',        title: 'Italic (Ctrl+I)' },
        { action: 'underline', icon: 'bi-type-underline',     title: 'Underline (Ctrl+U)' },
        { action: 'strike',    icon: 'bi-type-strikethrough', title: 'Strikethrough' },
        { action: 'highlight', icon: 'bi-highlighter',        title: 'Highlight' },
        ],
    [
        { action: 'heading1', icon: 'bi-type-h1', title: 'Heading 1' },
        { action: 'heading2', icon: 'bi-type-h2', title: 'Heading 2' },
        { action: 'heading3', icon: 'bi-type-h3', title: 'Heading 3' },
    ],
    [
        { action: 'bulletList',  icon: 'bi-list-ul',        title: 'Bullet list' },
        { action: 'orderedList', icon: 'bi-list-ol',        title: 'Numbered list' },
        { action: 'taskList',    icon: 'bi-check2-square',  title: 'Checklist' },
    ],
    [
        { action: 'blockquote', icon: 'bi-quote',       title: 'Quote' },
        { action: 'codeBlock',  icon: 'bi-code-square',  title: 'Code block' },
    ],
    [
        { action: 'link', icon: 'bi-link-45deg', title: 'Link' },
    ],
    [
        { action: 'alignLeft',   icon: 'bi-text-left',   title: 'Align left' },
        { action: 'alignCenter', icon: 'bi-text-center', title: 'Align center' },
        { action: 'alignRight',  icon: 'bi-text-right',  title: 'Align right' },
    ],
    [
        { action: 'undo', icon: 'bi-arrow-counterclockwise', title: 'Undo (Ctrl+Z)' },
        { action: 'redo', icon: 'bi-arrow-clockwise',        title: 'Redo (Ctrl+Shift+Z)' },
    ],
    [
        { action: 'clearNote', icon: 'bi-eraser', title: 'Clear note' },
    ],
];
const COLORS = [
    { name: 'Orange',  value: '#ea580c' },
    { name: 'Indigo',  value: '#6366f1' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber',   value: '#f59e0b' },
    { name: 'Sky',     value: '#0ea5e9' },
    { name: 'Pink',    value: '#ec4899' },
    { name: 'Muted',   value: '#94a3b8' },
];

function buildColorPicker(editor) {
    const wrap = document.createElement('span');
    wrap.className = 'tiptap-color-picker';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tiptap-toolbar-btn';
    btn.title = 'Text colour';
    btn.setAttribute('aria-label', 'Text colour');
    btn.setAttribute('aria-haspopup', 'true');
    btn.innerHTML = `<i class="bi bi-palette"></i>`;

    const popover = document.createElement('div');
    popover.className = 'tiptap-color-popover';

    const swatchRow = document.createElement('div');
    swatchRow.className = 'color-picker';
    const swatchButtons = {};

    COLORS.forEach(({ name, value }) => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'cp-swatch';
        sw.style.setProperty('--sw', value);
        sw.setAttribute('aria-label', name);
        sw.title = name;
        sw.addEventListener('click', () => {
            editor.chain().focus().setColor(value).run();
            wrap.classList.remove('open');
        });
        swatchRow.appendChild(sw);
        swatchButtons[value] = sw;
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'color-picker-reset';
    resetBtn.innerHTML = `<i class="bi bi-slash-circle"></i> Default`;
    resetBtn.addEventListener('click', () => {
        editor.chain().focus().unsetColor().run();
        wrap.classList.remove('open');
    });

    popover.appendChild(swatchRow);
    popover.appendChild(resetBtn);

    btn.addEventListener('click', e => {
        e.stopPropagation();
        wrap.classList.toggle('open');
    });
    document.addEventListener('click', e => {
        if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });

    wrap.appendChild(btn);
    wrap.appendChild(popover);

    return {
        el: wrap,
        sync() {
            const activeColor = editor.getAttributes('textStyle').color || null;
            Object.entries(swatchButtons).forEach(([value, el]) => {
                el.classList.toggle('active', value === activeColor);
            });
            btn.classList.toggle('is-active', !!activeColor);
        },
    };
}

const DRAWING_OPTIONS = [
    { mode: 'DRAWING',     icon: 'bi-brush',        label: 'Drawing',     hint: 'Blank canvas' },
    { mode: 'HANDWRITING', icon: 'bi-journal-text', label: 'Handwriting', hint: 'Ruled book page' },
];

function buildDrawingInsertControl(editor) {
    const wrap = document.createElement('span');
    wrap.className = 'tiptap-drawing-picker';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tiptap-toolbar-btn';
    btn.title = 'Insert drawing';
    btn.setAttribute('aria-label', 'Insert drawing');
    btn.setAttribute('aria-haspopup', 'true');
    btn.innerHTML = `<i class="bi bi-vector-pen"></i>`;

    const popover = document.createElement('div');
    popover.className = 'tiptap-drawing-popover';

    let busy = false;
    DRAWING_OPTIONS.forEach(({ mode, icon, label, hint }) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'tiptap-drawing-option';
        opt.innerHTML = `<i class="bi ${icon}"></i>
            <span class="drawing-option-text"><strong>${label}</strong><small>${hint}</small></span>`;
        opt.addEventListener('click', async () => {
            if (busy) return;
            busy = true;
            wrap.classList.remove('open');
            try {
                const created = await createDrawing(mode);
                drawingStore.put(created);
                editor.chain().focus().insertDrawing({ drawingId: created.id, mode: created.mode }).run();
                revealDrawing(editor, created.id);
            } catch (err) {
                window.showToast?.('Could not create the drawing. Please try again.', 'error');
            } finally {
                busy = false;
            }
        });
        popover.appendChild(opt);
    });

    btn.addEventListener('click', e => {
        e.stopPropagation();
        wrap.classList.toggle('open');
    });
    document.addEventListener('click', e => {
        if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });

    wrap.appendChild(btn);
    wrap.appendChild(popover);
    return { el: wrap };
}

/* Replaces the whole document with one empty paragraph. A normal transaction, so one Ctrl+Z
   restores everything, drawings included: their data is kept in the database, only the blocks go. */
async function clearNote(editor) {
    if (editor.isEmpty) { window.showToast?.('The note is already empty.'); return; }
    const ok = await confirmDialog({
        title: 'You\'re just about to clear the note. ',
        message: 'Everything in the note will be removed: text, tables and drawings. You can undo this right afterwards.',
        confirmText: 'Clear',
        danger: true,
    });
    if (!ok) return;
    editor.chain().focus().command(({ tr, state }) => {
        tr.replaceWith(0, state.doc.content.size, state.schema.nodes.paragraph.create());
        return true;
    }).run();
    window.showToast?.('Note cleared. Use Undo to bring it back.');
}

const COMMANDS = {
    clearNote: e => clearNote(e),
    bold:        e => e.chain().focus().toggleBold().run(),
    italic:      e => e.chain().focus().toggleItalic().run(),
    underline:   e => e.chain().focus().toggleUnderline().run(),
    strike:      e => e.chain().focus().toggleStrike().run(),
    highlight:   e => e.chain().focus().toggleHighlight().run(),
    heading1:    e => e.chain().focus().toggleHeading({ level: 1 }).run(),
    heading2:    e => e.chain().focus().toggleHeading({ level: 2 }).run(),
    heading3:    e => e.chain().focus().toggleHeading({ level: 3 }).run(),
    bulletList:  e => e.chain().focus().toggleBulletList().run(),
    orderedList: e => e.chain().focus().toggleOrderedList().run(),
    taskList:    e => e.chain().focus().toggleTaskList().run(),
    blockquote:  e => e.chain().focus().toggleBlockquote().run(),
    codeBlock:   e => e.chain().focus().toggleCodeBlock().run(),
    alignLeft:   e => e.chain().focus().setTextAlign('left').run(),
    alignCenter: e => e.chain().focus().setTextAlign('center').run(),
    alignRight:  e => e.chain().focus().setTextAlign('right').run(),
    undo:        e => drawingSession.isActive() ? drawingSession.undo() : e.chain().focus().undo().run(),
    redo:        e => drawingSession.isActive() ? drawingSession.redo() : e.chain().focus().redo().run(),
    link: e => {
        const existing = e.getAttributes('link').href;
        const url = window.prompt('Link URL', existing || 'https://');
        if (url === null) return;              // cancelled
        if (url.trim() === '') {                // cleared — remove the link
            e.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        e.chain().focus().extendMarkRange('link').setLink({ href: url.trim(), target:'_blank' }).run();
    },
};

const ACTIVE_CHECK = {
    bold:        e => e.isActive('bold'),
    italic:      e => e.isActive('italic'),
    underline:   e => e.isActive('underline'),
    strike:      e => e.isActive('strike'),
    highlight:   e => e.isActive('highlight'),
    heading1:    e => e.isActive('heading', { level: 1 }),
    heading2:    e => e.isActive('heading', { level: 2 }),
    heading3:    e => e.isActive('heading', { level: 3 }),
    bulletList:  e => e.isActive('bulletList'),
    orderedList: e => e.isActive('orderedList'),
    taskList:    e => e.isActive('taskList'),
    blockquote:  e => e.isActive('blockquote'),
    codeBlock:   e => e.isActive('codeBlock'),
    alignLeft:   e => e.isActive({ textAlign: 'left' }),
    alignCenter: e => e.isActive({ textAlign: 'center' }),
    alignRight:  e => e.isActive({ textAlign: 'right' }),
    link:        e => e.isActive('link'),
};

export function renderToolbar(editor, mountEl) {
    mountEl.innerHTML = '';
    mountEl.classList.add('tiptap-toolbar');

    // Toolbar buttons must not take focus from the editor (selection stays, no scroll jump on iOS).
    // Real inputs (the table rows/columns fields) still need focus, so they're excluded.
    mountEl.addEventListener('mousedown', e => {
        if (e.target.closest('button') && !e.target.closest('input, textarea, select')) e.preventDefault();
    });

    const buttons = {};
    const colorPicker = buildColorPicker(editor);
    const tablePicker = buildTableInsertControl(editor);
    const drawingPicker = buildDrawingInsertControl(editor);
    const tableBar = buildTableContextBar(editor);
    // mountEl.insertAdjacentElement('afterend', tableBar.el);

    GROUPS.forEach((group, gi) => {
        if (gi > 0) {
            const divider = document.createElement('span');
            divider.className = 'tiptap-toolbar-divider';
            mountEl.appendChild(divider);
        }
        group.forEach(({ action, icon, title }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tiptap-toolbar-btn';
            btn.title = title;
            btn.setAttribute('aria-label', title);
            btn.innerHTML = `<i class="bi ${icon}"></i>`;
            btn.dataset.action = action;
            btn.addEventListener('click', () => COMMANDS[action]?.(editor));            mountEl.appendChild(btn);
            buttons[action] = btn;
        });

        // Text colour rides alongside the basic formatting group — same
        // "change how the selection looks" concern as bold/highlight,
        // just needs a swatch popover instead of a plain toggle.
        if (gi === 0) {
            const divider = document.createElement('span');
            divider.className = 'tiptap-toolbar-divider';
            mountEl.appendChild(divider);
            mountEl.appendChild(colorPicker.el);
        }
        if (gi === 3) { // alongside quote/code-block
            const divider = document.createElement('span');
            divider.className = 'tiptap-toolbar-divider';
            mountEl.appendChild(divider);
            mountEl.appendChild(tablePicker.el);
            mountEl.appendChild(drawingPicker.el);
        }
    });


    // Table actions live inside the sticky toolbar, so they stay on screen while the cursor is in a table
    mountEl.appendChild(tableBar.el);

    function syncState() {
        Object.entries(ACTIVE_CHECK).forEach(([action, check]) => {
            buttons[action]?.classList.toggle('is-active', !!check(editor));
        });
        // While a drawing is live these belong to Excalidraw, which doesn't
        // report its history depth, so they stay enabled.
        const drawing = drawingSession.isActive();
        if (buttons.undo) buttons.undo.disabled = !drawing && !editor.can().undo();
        if (buttons.redo) buttons.redo.disabled = !drawing && !editor.can().redo();
        if (buttons.clearNote) buttons.clearNote.disabled = editor.isEmpty;
        colorPicker.sync();
        tablePicker.sync();
        tableBar.sync();
    }
    

    editor.on('transaction', syncState);
    editor.on('selectionUpdate', syncState);
    drawingSession.subscribe(syncState);
    syncState();
}