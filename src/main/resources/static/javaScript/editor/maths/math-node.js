/* Formula nodes: inlineMath (inside a sentence) and blockMath (own line).
   Both store only the LaTeX source in attrs.latex and render it with KaTeX. */
import { Node, mergeAttributes, InputRule } from 'https://esm.sh/@tiptap/core@2.11.5';
import { renderMath } from './math-katex.js';
import { openMathDialog } from './math-dialog.js';

/* $x^2$ typed in a paragraph becomes a formula. The first and last character inside the $…$ must not be a
   space, so "costs $5 and $6" stays plain text. */
const INLINE_RULE = /\$([^\s$](?:[^$\n]*[^\s$])?)\$$/;

function mathNodeView(name, display) {
    return ({ node, getPos, editor }) => {
        const dom = document.createElement(display ? 'div' : 'span');
        dom.className = `math-node ${display ? 'math-block' : 'math-inline'}`;
        dom.contentEditable = 'false';
        let current = node;
        renderMath(dom, current.attrs.latex, display);

        dom.addEventListener('click', () => {
            if (!editor.isEditable) return;
            openMathDialog({
                latex: current.attrs.latex,
                display,
                onApply: ({ latex }) => {
                    editor.chain().focus().command(({ tr }) => {
                        tr.setNodeMarkup(getPos(), undefined, { latex });
                        return true;
                    }).run();
                },
                onRemove: () => {
                    editor.chain().focus().command(({ tr }) => {
                        const pos = getPos();
                        tr.delete(pos, pos + current.nodeSize);
                        return true;
                    }).run();
                },
                onClose: () => editor.view.focus(),
            });
        });

        return {
            dom,
            update(updated) {
                if (updated.type.name !== name) return false;
                if (updated.attrs.latex !== current.attrs.latex) {
                    current = updated;
                    renderMath(dom, current.attrs.latex, display);
                } else {
                    current = updated;
                }
                return true;
            },
        };
    };
}

const latexAttribute = {
    latex: {
        default: '',
        parseHTML: el => el.getAttribute('data-latex') || '',
        renderHTML: () => ({}),
    },
};

export const InlineMath = Node.create({
    name: 'inlineMath',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() { return latexAttribute; },
    parseHTML() { return [{ tag: 'span[data-type="inline-math"]' }]; },
    renderHTML({ node, HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-math', 'data-latex': node.attrs.latex }), node.attrs.latex];
    },
    addNodeView() { return mathNodeView(this.name, false); },

    addCommands() {
        return {
            insertInlineMath: latex => ({ commands }) =>
                commands.insertContent({ type: this.name, attrs: { latex } }),
        };
    },

    addInputRules() {
        return [
            new InputRule({
                find: INLINE_RULE,
                handler: ({ state, range, match }) => {
                    const latex = match[1].trim();
                    if (!latex) return null;
                    state.tr.replaceWith(range.from, range.to, this.type.create({ latex }));
                },
            }),
        ];
    },
});

export const BlockMath = Node.create({
    name: 'blockMath',
    group: 'block',
    atom: true,
    selectable: true,

    addAttributes() { return latexAttribute; },
    parseHTML() { return [{ tag: 'div[data-type="block-math"]' }]; },
    renderHTML({ node, HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'block-math', 'data-latex': node.attrs.latex }), node.attrs.latex];
    },
    addNodeView() { return mathNodeView(this.name, true); },

    addCommands() {
        return {
            // An empty paragraph follows, so there is always somewhere to keep typing after the formula.
            insertBlockMath: latex => ({ commands }) =>
                commands.insertContent([
                    { type: this.name, attrs: { latex } },
                    { type: 'paragraph' },
                ]),
        };
    },
});