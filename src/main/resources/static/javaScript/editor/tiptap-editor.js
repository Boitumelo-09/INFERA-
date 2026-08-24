/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/tiptap-editor.js
   Mounts the Tiptap rich-text editor onto #editorContentMount and
   wires the toolbar in #editorToolbarMount. Loaded as a native ES
   module (no bundler in this project) — see note in chat about the
   CDN-ESM tradeoff if you ever see duplicate-ProseMirror warnings.
═══════════════════════════════════════════════════════════════════ */

import { Editor }   from 'https://esm.sh/@tiptap/core@2.11.5';
import StarterKit   from 'https://esm.sh/@tiptap/starter-kit@2.11.5';
import Underline     from 'https://esm.sh/@tiptap/extension-underline@2.11.5';
import Link           from 'https://esm.sh/@tiptap/extension-link@2.11.5';
import Placeholder     from 'https://esm.sh/@tiptap/extension-placeholder@2.11.5';
import TaskList          from 'https://esm.sh/@tiptap/extension-task-list@2.11.5';
import TaskItem            from 'https://esm.sh/@tiptap/extension-task-item@2.11.5';
import TextAlign             from 'https://esm.sh/@tiptap/extension-text-align@2.11.5';

import { renderToolbar } from '../toolbar.js';

/* ───────────────────────────────────────────────────────────────────
   HYDRATION — existing notes may not hold valid Tiptap JSON yet
   (the New Note modal still writes plain text until Step 5 retires
   it). Never discard that text silently — wrap it into a paragraph
   instead of failing or blanking the note.
─────────────────────────────────────────────────────────────────── */
function parseInitialContent(raw) {
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

const mountEl = document.getElementById('editorContentMount');
mountEl.innerHTML = ''; // clear the Step 2 "editor will mount here" placeholder

const editor = new Editor({
    element: mountEl,
    extensions: [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
        }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true }),
        Placeholder.configure({ placeholder: 'Start capturing your idea...' }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: parseInitialContent(window.__NOTE_RAW_CONTENT__ || ''),
    autofocus: false,
});

renderToolbar(editor, document.getElementById('editorToolbarMount'));

/* Exposed so Step 4's autosave script can read editor.getJSON()
   without this module needing to know anything about saving. */
window.__inferaEditor = editor;