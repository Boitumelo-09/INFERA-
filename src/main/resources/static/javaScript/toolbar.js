/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/toolbar.js
   Builds the formatting toolbar and wires it to a live Tiptap editor
   instance. Kept separate from tiptap-editor.js so the button
   registry can grow (e.g. a future Drawing button in Phase 2)
   without touching editor mount/init logic.
═══════════════════════════════════════════════════════════════════ */

const GROUPS = [
    [
        { action: 'bold',      icon: 'bi-type-bold',          title: 'Bold (Ctrl+B)' },
        { action: 'italic',    icon: 'bi-type-italic',        title: 'Italic (Ctrl+I)' },
        { action: 'underline', icon: 'bi-type-underline',     title: 'Underline (Ctrl+U)' },
        { action: 'strike',    icon: 'bi-type-strikethrough', title: 'Strikethrough' },
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
];

const COMMANDS = {
    bold:        e => e.chain().focus().toggleBold().run(),
    italic:      e => e.chain().focus().toggleItalic().run(),
    underline:   e => e.chain().focus().toggleUnderline().run(),
    strike:      e => e.chain().focus().toggleStrike().run(),
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
    undo:        e => e.chain().focus().undo().run(),
    redo:        e => e.chain().focus().redo().run(),
    link: e => {
        const existing = e.getAttributes('link').href;
        const url = window.prompt('Link URL', existing || 'https://');
        if (url === null) return;              // cancelled
        if (url.trim() === '') {                // cleared — remove the link
            e.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        e.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    },
};

const ACTIVE_CHECK = {
    bold:        e => e.isActive('bold'),
    italic:      e => e.isActive('italic'),
    underline:   e => e.isActive('underline'),
    strike:      e => e.isActive('strike'),
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

    const buttons = {};

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
            btn.addEventListener('click', () => COMMANDS[action]?.(editor));
            mountEl.appendChild(btn);
            buttons[action] = btn;
        });
    });

    function syncState() {
        Object.entries(ACTIVE_CHECK).forEach(([action, check]) => {
            buttons[action]?.classList.toggle('is-active', !!check(editor));
        });
        if (buttons.undo) buttons.undo.disabled = !editor.can().undo();
        if (buttons.redo) buttons.redo.disabled = !editor.can().redo();
    }

    editor.on('transaction', syncState);
    editor.on('selectionUpdate', syncState);
    syncState();
}