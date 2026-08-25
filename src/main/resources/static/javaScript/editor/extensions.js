/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/extensions.js
   Single source of truth for "what Tiptap extensions does INFERA
   support". Both the live editor (tiptap-editor.js) and the read-only
   View modal renderer (view-renderer.js) import from here, so they
   can never quietly drift apart. When Phase 2 adds the Drawing node,
   it gets registered once, here, and both surfaces pick it up.
═══════════════════════════════════════════════════════════════════ */

import StarterKit  from 'https://esm.sh/@tiptap/starter-kit@2.11.5';
import Underline    from 'https://esm.sh/@tiptap/extension-underline@2.11.5';
import Link           from 'https://esm.sh/@tiptap/extension-link@2.11.5';
import TaskList         from 'https://esm.sh/@tiptap/extension-task-list@2.11.5';
import TaskItem           from 'https://esm.sh/@tiptap/extension-task-item@2.11.5';
import TextAlign            from 'https://esm.sh/@tiptap/extension-text-align@2.11.5';
import Highlight              from 'https://esm.sh/@tiptap/extension-highlight@2.11.5';

export function getSharedExtensions() {
    return [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight,
    ];
}

/* Hydration fallback — a note's documentJson may not be valid Tiptap
   JSON yet (older notes still hold plain text from before the Tiptap
   migration). Never discard that text: wrap it into a paragraph
   instead of failing or blanking the note. Used by both the live
   editor's initial load and the View modal's read-only render. */
export function parseDocumentJson(raw) {
    if (!raw || !raw.trim()) {
        return { type: 'doc', content: [{ type: 'paragraph' }] };
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.type === 'doc') return parsed;
    } catch (e) {
        // Not JSON — fall through to the plain-text wrap below.
    }
    return {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }]
    };
}