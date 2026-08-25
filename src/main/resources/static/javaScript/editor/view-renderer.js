/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/view-renderer.js
   Renders a note's documentJson to static HTML for the read-only
   View modal, using Tiptap's own generateHTML() against the exact
   same extension set the live editor uses — one source of truth,
   not a second markdown-flavoured renderer living in notes.js.

   notes.js is a classic script (not a module), so this exposes a
   small API on window rather than being imported directly.
═══════════════════════════════════════════════════════════════════ */

import { generateHTML } from 'https://esm.sh/@tiptap/core@2.11.5';
import { getSharedExtensions, parseDocumentJson } from './extensions.js';

const extensions = getSharedExtensions();

window.__inferaViewRenderer = {
    render(raw) {
        const json = parseDocumentJson(raw);
        try {
            return generateHTML(json, extensions);
        } catch (e) {
            console.error('[INCAPTUR] failed to render note content', e);
            return '<p><em>This note could not be displayed.</em></p>';
        }
    }
};