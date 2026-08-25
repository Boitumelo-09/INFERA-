/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/tiptap-editor.js
   Mounts the Tiptap rich-text editor onto #editorContentMount and
   wires the toolbar in #editorToolbarMount. Loaded as a native ES
   module (no bundler in this project) — see note in chat about the
   CDN-ESM tradeoff if you ever see duplicate-ProseMirror warnings.
═══════════════════════════════════════════════════════════════════ */

import { Editor }   from 'https://esm.sh/@tiptap/core@2.11.5';
import Placeholder   from 'https://esm.sh/@tiptap/extension-placeholder@2.11.5';

import { getSharedExtensions, parseDocumentJson } from './extensions.js';
import { renderToolbar } from './toolbar.js';

const mountEl = document.getElementById('editorContentMount');
mountEl.innerHTML = ''; // clear the Step 2 "editor will mount here" placeholder

const editor = new Editor({
    element: mountEl,
    extensions: [
        ...getSharedExtensions(),
        Placeholder.configure({ placeholder: 'Start capturing your idea...' }),
    ],
    content: parseDocumentJson(window.__NOTE_RAW_CONTENT__ || ''),
    autofocus: false,
});

renderToolbar(editor, document.getElementById('editorToolbarMount'));

/* Exposed so Step 4's autosave script can read editor.getJSON()
   without this module needing to know anything about saving. */
window.__inferaEditor = editor;