/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/note-print.js
   "Save note as PDF": renders already-built note HTML into a hidden
   iframe with a light, print-only stylesheet, waits for fonts/images,
   then opens the browser print dialog (user picks "Save as PDF").
   Callers pass HTML from window.__inferaViewRenderer.render(...), so the
   PDF always matches the View modal (formulas included).
═══════════════════════════════════════════════════════════════════ */

import DOMPurify from 'https://esm.sh/dompurify@3.2.4';
import { KATEX_CSS } from './maths/math-katex.js';

const MAX_WAIT_MS = 15000;
let printing = false;

const PRINT_CSS = `
@page { size: A4; margin: 18mm 16mm; }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #111; }
body {
    font: 11pt/1.55 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    overflow-wrap: break-word;
}
.pdf-title { font-size: 22pt; line-height: 1.2; font-weight: 700; margin: 0 0 4pt; }
.pdf-meta { color: #666; font-size: 9.5pt; margin: 0 0 14pt; padding-bottom: 8pt; border-bottom: 1px solid #ddd; }

h1, h2, h3 { line-height: 1.25; margin: 1.1em 0 .4em; break-after: avoid; }
h1 { font-size: 17pt; } h2 { font-size: 14pt; } h3 { font-size: 12pt; }
p { margin: 0 0 .6em; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 .7em; padding-left: 1.4em; }
li > p { margin: 0; }
ul[data-type="taskList"] { list-style: none; padding-left: .2em; }
ul[data-type="taskList"] li { display: flex; gap: .5em; align-items: flex-start; }
ul[data-type="taskList"] li > label { flex: none; margin-top: .25em; }
ul[data-type="taskList"] li > div { flex: 1; min-width: 0; }

blockquote { margin: .6em 0; padding: .2em 0 .2em 1em; border-left: 3px solid #bbb; color: #444; break-inside: avoid; }
pre {
    margin: .6em 0; padding: 8pt 10pt; background: #f5f5f5; border: 1px solid #e2e2e2; border-radius: 4px;
    white-space: pre-wrap; word-break: break-word; break-inside: avoid;
    font: 9.5pt/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .92em; }
:not(pre) > code { background: #f1f1f1; padding: 0 .25em; border-radius: 3px; }
a { color: #1a56c4; text-decoration: underline; }
mark { background: #fff3a3; color: inherit; padding: 0 .1em; }

table { width: 100%; border-collapse: collapse; margin: .6em 0; }
th, td { border: 1px solid #bbb; padding: 4pt 6pt; vertical-align: top; text-align: left; word-break: break-word; }
th { background: #f0f0f0; font-weight: 600; }
tr { break-inside: avoid; }
thead { display: table-header-group; }

.math-inline { display: inline; }
.math-block { display: block; margin: .7em 0; text-align: center; break-inside: avoid; }
.math-block .katex-display { margin: 0; }

.pdf-drawing { margin: .8em 0; text-align: center; break-inside: avoid; }
.pdf-drawing img { display: block; margin: 0 auto; max-width: 100%; max-height: 245mm; height: auto; object-fit: contain; }
.pdf-drawing-missing { color: #888; font-style: italic; font-size: 9.5pt; border: 1px dashed #ccc; padding: 8pt; text-align: center; }
`;

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Text colours picked for a dark UI (Silver, Mustard, Lime…) vanish on white paper: darken the light ones. */
function darkenLightColours(root) {
    root.querySelectorAll('[style*="color"]').forEach(el => {
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(el.style.color || '');
        if (!m) return;
        const [r, g, b] = [m[1], m[2], m[3]].map(Number);
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        if (lum > 0.5) el.style.color = `rgb(${Math.round(r * .55)}, ${Math.round(g * .55)}, ${Math.round(b * .55)})`;
    });
}

/* generateHTML only leaves drawing placeholders; fill them with the saved preview SVGs, as the View modal does. */
async function inlineDrawings(root, noteId, blobUrls) {
    const nodes = [...root.querySelectorAll('div[data-type="drawing"]')];
    if (!nodes.length) return;

    let summaries = null;
    if (noteId) {
        try {
            const res = await fetch(`/api/notes/${noteId}/drawings`, { headers: { Accept: 'application/json' } });
            if (res.ok) summaries = new Map((await res.json()).map(s => [s.id, s]));
        } catch { /* handled below */ }
    }

    nodes.forEach(node => {
        const summary = summaries?.get(Number(node.dataset.drawingId));
        const mode = node.dataset.mode;
        node.className = 'pdf-drawing';
        node.removeAttribute('style');
        node.textContent = '';

        if (summary?.previewSvg) {
            const url = URL.createObjectURL(new Blob([summary.previewSvg], { type: 'image/svg+xml' }));
            blobUrls.push(url);
            const img = document.createElement('img');
            img.alt = mode === 'HANDWRITING' ? 'Handwriting page' : 'Drawing';
            img.src = url;
            node.appendChild(img);
        } else if (!summaries || !summary) {
            node.className = 'pdf-drawing pdf-drawing-missing';
            node.textContent = summaries ? 'Drawing not found' : 'Drawing could not be loaded';
        } else {
            node.remove(); // empty drawing: nothing worth printing
        }
    });
}

function buildDocument(title, meta, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${KATEX_CSS}">
<style>${PRINT_CSS}</style>
</head><body>
<header>
  <div class="pdf-title">${escapeHtml(title)}</div>
  ${meta ? `<div class="pdf-meta">${escapeHtml(meta)}</div>` : ''}
</header>
<main>${bodyHtml}</main>
</body></html>`;
}

export async function printNote({ title = 'Note', meta = '', noteId = null, html = '' }) {
    if (printing) return;
    if (!html || !html.trim()) { window.showToast?.('Nothing to export: the note is empty.'); return; }
    printing = true;

    const blobUrls = [];
    const prevTitle = document.title;
    let iframe = null;
    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        document.title = prevTitle;
        iframe?.remove();
        blobUrls.forEach(u => URL.revokeObjectURL(u));
        printing = false;
    };

    try {
        const body = document.createElement('div');
        body.innerHTML = DOMPurify.sanitize(html);
        darkenLightColours(body);
        await inlineDrawings(body, noteId, blobUrls);

        // Browsers name the PDF after the page title, so use the note's title (minus characters files can't have)
        const fileTitle = (String(title).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Note').slice(0, 100);

        iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;';
        iframe.srcdoc = buildDocument(fileTitle, meta, body.innerHTML);

        const loaded = new Promise(resolve => {
            iframe.addEventListener('load', resolve, { once: true });
            setTimeout(resolve, MAX_WAIT_MS);
        });
        document.body.appendChild(iframe);
        await loaded;

        // Print only once images and the KaTeX fonts are ready, or formulas/drawings come out blank
        const doc = iframe.contentDocument;
        await Promise.all([...doc.images].map(img => img.decode().catch(() => {})));
        await doc.fonts?.ready;

        document.title = fileTitle;
        const win = iframe.contentWindow;
        win.addEventListener('afterprint', () => setTimeout(cleanup, 300), { once: true });
        setTimeout(cleanup, 5 * 60 * 1000); // safety net where afterprint never fires (some mobile browsers)
        win.focus();
        win.print();
    } catch (err) {
        console.error('[INCAPTUR] PDF export failed', err);
        cleanup();
        window.showToast?.('Could not prepare the PDF. Please try again.', 'error');
    }
}