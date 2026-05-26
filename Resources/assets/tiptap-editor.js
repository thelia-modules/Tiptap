/*
 * TipTap WYSIWYG bundle for Thelia 3 back-office Twig.
 *
 * Mirrors the legacy Tinymce feature set: undo/redo, bold/italic/underline/
 * strike, headings, alignment, lists, indent/outdent, link/image, text and
 * background colours, table, horizontal rule, blockquote, inline code,
 * source HTML, charmap, fullscreen, print, preview.
 *
 * The bundle is plain JS (no Stimulus) to avoid clashing with the BO Twig
 * `stimulus-bridge` app. We scan textareas matching the configured CSS
 * selector list and wrap each one with a TipTap editor on the spot. The
 * mount is idempotent: a textarea already carrying `data-tiptap-mounted`
 * is skipped. Bail-out triggers when `window.tinymce` is present so the
 * legacy Tinymce module wins if both modules are active simultaneously.
 */

import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

import './tiptap-editor.scss';

const TIPTAP_MOUNTED_ATTR = 'data-tiptap-mounted';

const SPECIAL_CHARS = [
    '€', '£', '¥', '¢', '©', '®', '™', '°', '±', '×', '÷', '≈', '≠', '≤', '≥',
    'µ', 'π', 'Σ', 'Ω', '√', '∞', 'α', 'β', 'γ', 'δ', 'ε',
    '←', '→', '↑', '↓', '↔', '⇐', '⇒',
    '•', '·', '‒', '–', '—', '«', '»', '‘', '’', '“', '”', '…',
    '✓', '✗', '★', '☆', '♥', '♦', '♣', '♠', '♪', '♫',
];

const ICONS = {
    bold: '<i class="bi bi-type-bold"></i>',
    italic: '<i class="bi bi-type-italic"></i>',
    underline: '<i class="bi bi-type-underline"></i>',
    strike: '<i class="bi bi-type-strikethrough"></i>',
    heading: '<i class="bi bi-type-h2"></i>',
    paragraph: '<i class="bi bi-paragraph"></i>',
    'align-left': '<i class="bi bi-text-left"></i>',
    'align-center': '<i class="bi bi-text-center"></i>',
    'align-right': '<i class="bi bi-text-right"></i>',
    'align-justify': '<i class="bi bi-justify"></i>',
    bulletlist: '<i class="bi bi-list-ul"></i>',
    orderedlist: '<i class="bi bi-list-ol"></i>',
    indent: '<i class="bi bi-text-indent-left"></i>',
    outdent: '<i class="bi bi-text-indent-right"></i>',
    link: '<i class="bi bi-link-45deg"></i>',
    unlink: '<i class="bi bi-x-circle"></i>',
    image: '<i class="bi bi-image"></i>',
    forecolor: '<i class="bi bi-palette"></i>',
    backcolor: '<i class="bi bi-paint-bucket"></i>',
    hr: '<i class="bi bi-hr"></i>',
    blockquote: '<i class="bi bi-quote"></i>',
    table: '<i class="bi bi-table"></i>',
    code: '<i class="bi bi-code"></i>',
    source: '<i class="bi bi-code-slash"></i>',
    charmap: '<i class="bi bi-emoji-smile"></i>',
    fullscreen: '<i class="bi bi-arrows-fullscreen"></i>',
    print: '<i class="bi bi-printer"></i>',
    preview: '<i class="bi bi-eye"></i>',
    undo: '<i class="bi bi-arrow-counterclockwise"></i>',
    redo: '<i class="bi bi-arrow-clockwise"></i>',
};

const TITLES = {
    bold: 'Bold (Ctrl+B)',
    italic: 'Italic (Ctrl+I)',
    underline: 'Underline (Ctrl+U)',
    strike: 'Strike',
    heading: 'Heading',
    paragraph: 'Paragraph',
    'align-left': 'Align left',
    'align-center': 'Align center',
    'align-right': 'Align right',
    'align-justify': 'Justify',
    bulletlist: 'Bullet list',
    orderedlist: 'Ordered list',
    indent: 'Indent',
    outdent: 'Outdent',
    link: 'Insert / edit link',
    unlink: 'Remove link',
    image: 'Insert image',
    forecolor: 'Text color',
    backcolor: 'Background color',
    hr: 'Horizontal rule',
    blockquote: 'Blockquote',
    table: 'Table',
    code: 'Inline code',
    source: 'Source HTML',
    charmap: 'Special character',
    fullscreen: 'Fullscreen',
    print: 'Print',
    preview: 'Preview',
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
};

const EXCLUDE_PARENT_SELECTOR = '.tiptap-wrapper, .theliablocks-editor, .ace_editor, .CodeMirror, .monaco-editor, .mce-tinymce, [data-no-tiptap], #sfwdt-target, .sf-toolbar';

const buildExtensions = () => [
    StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: { HTMLAttributes: { class: 'tiptap-code-block' } },
        link: false,
        underline: false,
    }),
    Underline,
    Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
    }),
    Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'img-fluid' } }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    Table.configure({ resizable: true, HTMLAttributes: { class: 'table table-bordered' } }),
    TableRow,
    TableHeader,
    TableCell,
];

class TiptapMount {
    constructor(textarea, options) {
        this.textarea = textarea;
        this.options = options;
        this.editor = null;
        this.wrapper = null;
        this.toolbarEl = null;
        this.editorEl = null;
        this._submitHandler = null;
    }

    mount() {
        try {
            this.textarea.setAttribute(TIPTAP_MOUNTED_ATTR, 'true');

            this.wrapper = document.createElement('div');
            this.wrapper.className = 'tiptap-wrapper';

            this.textarea.classList.add('tiptap-source-textarea');
            this.textarea.style.display = 'none';

            const parent = this.textarea.parentNode;
            parent.insertBefore(this.wrapper, this.textarea);
            this.wrapper.appendChild(this.textarea);

            if (this.options.showToolbar) {
                this.toolbarEl = document.createElement('div');
                this.toolbarEl.className = 'tiptap-toolbar btn-toolbar';
                this.toolbarEl.setAttribute('role', 'toolbar');
                this.wrapper.appendChild(this.toolbarEl);
            }

            this.editorEl = document.createElement('div');
            this.editorEl.className = 'tiptap-content';
            if (this.options.editorHeight > 0) {
                this.editorEl.style.minHeight = `${this.options.editorHeight}px`;
            }
            this.wrapper.appendChild(this.editorEl);

            this.editor = new Editor({
                element: this.editorEl,
                extensions: buildExtensions(),
                content: this.textarea.value || '',
                editorProps: { attributes: { class: 'tiptap-prose' } },
                onUpdate: ({ editor }) => {
                    this.textarea.value = editor.getHTML();
                    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    this.textarea.dispatchEvent(new Event('change', { bubbles: true }));
                    if (this.toolbarEl) {
                        this.refreshToolbar();
                    }
                },
                onSelectionUpdate: () => this.toolbarEl && this.refreshToolbar(),
            });

            if (this.toolbarEl) {
                this.renderToolbar();
                this.refreshToolbar();
            }

            const form = this.textarea.form;
            if (form) {
                this._submitHandler = () => {
                    this.textarea.value = this.editor.getHTML();
                };
                form.addEventListener('submit', this._submitHandler);
            }
        } catch (err) {
            // If the editor fails to mount, restore the textarea so the
            // page stays usable. The error is logged for the developer.
            // eslint-disable-next-line no-console
            console.error('[tiptap] mount failed for textarea', this.textarea, err);
            this.textarea.removeAttribute(TIPTAP_MOUNTED_ATTR);
            this.textarea.classList.remove('tiptap-source-textarea');
            this.textarea.style.display = '';
            if (this.wrapper && this.wrapper.parentNode) {
                this.wrapper.parentNode.insertBefore(this.textarea, this.wrapper);
                this.wrapper.parentNode.removeChild(this.wrapper);
            }
        }
    }

    renderToolbar() {
        const items = (this.options.toolbar || '').split(',').map((s) => s.trim()).filter(Boolean);
        const groups = [];
        let current = [];
        items.forEach((it) => {
            if (it === '|') {
                if (current.length) {
                    groups.push(current);
                }
                current = [];
            } else {
                current.push(it);
            }
        });
        if (current.length) {
            groups.push(current);
        }

        this.toolbarEl.innerHTML = '';
        groups.forEach((group) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'btn-group btn-group-sm me-1 mb-1';
            groupEl.setAttribute('role', 'group');
            group.forEach((item) => {
                const btn = this.buildButton(item);
                if (btn) {
                    groupEl.appendChild(btn);
                }
            });
            this.toolbarEl.appendChild(groupEl);
        });
    }

    buildButton(item) {
        if (item === 'heading') {
            return this.buildHeadingDropdown();
        }
        if (item === 'forecolor') {
            return this.buildColorPicker('forecolor');
        }
        if (item === 'backcolor') {
            return this.buildColorPicker('backcolor');
        }
        if (item === 'table') {
            return this.buildTableDropdown();
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline-secondary';
        btn.dataset.tiptapAction = item;
        btn.innerHTML = ICONS[item] || `<span>${item}</span>`;
        btn.setAttribute('title', TITLES[item] || item);
        btn.setAttribute('aria-label', TITLES[item] || item);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.runAction(item);
        });
        return btn;
    }

    buildHeadingDropdown() {
        const wrapper = document.createElement('div');
        wrapper.className = 'btn-group btn-group-sm';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-outline-secondary dropdown-toggle';
        toggle.setAttribute('data-bs-toggle', 'dropdown');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('title', TITLES.heading);
        toggle.innerHTML = ICONS.heading;
        wrapper.appendChild(toggle);

        const menu = document.createElement('ul');
        menu.className = 'dropdown-menu';
        const items = [
            { label: 'Paragraph', action: 'paragraph' },
            { label: 'Heading 1', action: 'h1' },
            { label: 'Heading 2', action: 'h2' },
            { label: 'Heading 3', action: 'h3' },
            { label: 'Heading 4', action: 'h4' },
            { label: 'Heading 5', action: 'h5' },
            { label: 'Heading 6', action: 'h6' },
        ];
        items.forEach((it) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = '#';
            a.textContent = it.label;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.runAction(it.action);
            });
            li.appendChild(a);
            menu.appendChild(li);
        });
        wrapper.appendChild(menu);
        return wrapper;
    }

    buildColorPicker(kind) {
        const wrapper = document.createElement('div');
        wrapper.className = 'btn-group btn-group-sm position-relative';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-outline-secondary';
        toggle.innerHTML = ICONS[kind];
        toggle.setAttribute('title', TITLES[kind]);
        wrapper.appendChild(toggle);

        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'tiptap-color-input';
        input.value = kind === 'forecolor' ? '#000000' : '#ffff00';
        wrapper.appendChild(input);

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            input.click();
        });

        input.addEventListener('input', () => {
            if (kind === 'forecolor') {
                this.editor.chain().focus().setColor(input.value).run();
            } else {
                this.editor.chain().focus().toggleHighlight({ color: input.value }).run();
            }
        });

        return wrapper;
    }

    buildTableDropdown() {
        const wrapper = document.createElement('div');
        wrapper.className = 'btn-group btn-group-sm';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-outline-secondary dropdown-toggle';
        toggle.setAttribute('data-bs-toggle', 'dropdown');
        toggle.setAttribute('title', TITLES.table);
        toggle.innerHTML = ICONS.table;
        wrapper.appendChild(toggle);

        const menu = document.createElement('ul');
        menu.className = 'dropdown-menu';
        const actions = [
            { label: 'Insert 3×3 table', action: () => this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
            { label: 'Add row before', action: () => this.editor.chain().focus().addRowBefore().run() },
            { label: 'Add row after', action: () => this.editor.chain().focus().addRowAfter().run() },
            { label: 'Add column before', action: () => this.editor.chain().focus().addColumnBefore().run() },
            { label: 'Add column after', action: () => this.editor.chain().focus().addColumnAfter().run() },
            { label: 'Delete row', action: () => this.editor.chain().focus().deleteRow().run() },
            { label: 'Delete column', action: () => this.editor.chain().focus().deleteColumn().run() },
            { label: 'Toggle header row', action: () => this.editor.chain().focus().toggleHeaderRow().run() },
            { label: 'Merge cells', action: () => this.editor.chain().focus().mergeCells().run() },
            { label: 'Split cell', action: () => this.editor.chain().focus().splitCell().run() },
            { label: 'Delete table', action: () => this.editor.chain().focus().deleteTable().run() },
        ];
        actions.forEach((it) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = '#';
            a.textContent = it.label;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                it.action();
            });
            li.appendChild(a);
            menu.appendChild(li);
        });
        wrapper.appendChild(menu);
        return wrapper;
    }

    runAction(name) {
        if (!this.editor && name !== 'source') {
            return;
        }
        const chain = this.editor ? this.editor.chain().focus() : null;
        switch (name) {
            case 'bold': chain.toggleBold().run(); break;
            case 'italic': chain.toggleItalic().run(); break;
            case 'underline': chain.toggleUnderline().run(); break;
            case 'strike': chain.toggleStrike().run(); break;
            case 'paragraph': chain.setParagraph().run(); break;
            case 'h1': chain.toggleHeading({ level: 1 }).run(); break;
            case 'h2': chain.toggleHeading({ level: 2 }).run(); break;
            case 'h3': chain.toggleHeading({ level: 3 }).run(); break;
            case 'h4': chain.toggleHeading({ level: 4 }).run(); break;
            case 'h5': chain.toggleHeading({ level: 5 }).run(); break;
            case 'h6': chain.toggleHeading({ level: 6 }).run(); break;
            case 'align-left': chain.setTextAlign('left').run(); break;
            case 'align-center': chain.setTextAlign('center').run(); break;
            case 'align-right': chain.setTextAlign('right').run(); break;
            case 'align-justify': chain.setTextAlign('justify').run(); break;
            case 'bulletlist': chain.toggleBulletList().run(); break;
            case 'orderedlist': chain.toggleOrderedList().run(); break;
            case 'indent': chain.sinkListItem('listItem').run(); break;
            case 'outdent': chain.liftListItem('listItem').run(); break;
            case 'link': this.openLinkPrompt(); break;
            case 'unlink': chain.unsetLink().run(); break;
            case 'image': this.openImagePrompt(); break;
            case 'hr': chain.setHorizontalRule().run(); break;
            case 'blockquote': chain.toggleBlockquote().run(); break;
            case 'code': chain.toggleCode().run(); break;
            case 'source': this.toggleSource(); break;
            case 'charmap': this.openCharmap(); break;
            case 'fullscreen': this.toggleFullscreen(); break;
            case 'print': this.printContent(); break;
            case 'preview': this.openPreview(); break;
            case 'undo': chain.undo().run(); break;
            case 'redo': chain.redo().run(); break;
            default: break;
        }
    }

    refreshToolbar() {
        if (!this.toolbarEl || !this.editor) {
            return;
        }
        const ed = this.editor;
        const checks = {
            bold: () => ed.isActive('bold'),
            italic: () => ed.isActive('italic'),
            underline: () => ed.isActive('underline'),
            strike: () => ed.isActive('strike'),
            bulletlist: () => ed.isActive('bulletList'),
            orderedlist: () => ed.isActive('orderedList'),
            blockquote: () => ed.isActive('blockquote'),
            code: () => ed.isActive('code'),
            link: () => ed.isActive('link'),
            'align-left': () => ed.isActive({ textAlign: 'left' }),
            'align-center': () => ed.isActive({ textAlign: 'center' }),
            'align-right': () => ed.isActive({ textAlign: 'right' }),
            'align-justify': () => ed.isActive({ textAlign: 'justify' }),
        };

        this.toolbarEl.querySelectorAll('[data-tiptap-action]').forEach((btn) => {
            const action = btn.dataset.tiptapAction;
            const fn = checks[action];
            if (fn && fn()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    openLinkPrompt() {
        const previous = this.editor.getAttributes('link').href || '';
        // eslint-disable-next-line no-alert
        const url = window.prompt('URL', previous);
        if (url === null) {
            return;
        }
        if (url === '') {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        this.editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    }

    openImagePrompt() {
        // eslint-disable-next-line no-alert
        const url = window.prompt('Image URL', '');
        if (!url) {
            return;
        }
        this.editor.chain().focus().setImage({ src: url, alt: '' }).run();
    }

    openCharmap() {
        const modal = this.ensureModal('tiptap-charmap-modal', 'Special character');
        const body = modal.querySelector('.modal-body');
        body.innerHTML = '<div class="d-flex flex-wrap gap-1"></div>';
        const grid = body.firstElementChild;
        SPECIAL_CHARS.forEach((ch) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline-secondary tiptap-char-btn';
            btn.textContent = ch;
            btn.addEventListener('click', () => {
                this.editor.chain().focus().insertContent(ch).run();
                this.hideModal(modal);
            });
            grid.appendChild(btn);
        });
        this.showModal(modal);
    }

    openPreview() {
        const modal = this.ensureModal('tiptap-preview-modal', 'Preview', 'modal-lg');
        const body = modal.querySelector('.modal-body');
        body.innerHTML = `<div class="tiptap-preview-content">${this.editor.getHTML()}</div>`;
        this.showModal(modal);
    }

    printContent() {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            return;
        }
        const html = this.editor.getHTML();
        win.document.write(`<!DOCTYPE html><html><head><title>Print</title><style>body{font:14px/1.5 sans-serif;padding:24px;color:#111}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style></head><body>${html}</body></html>`);
        win.document.close();
        win.focus();
        win.print();
    }

    toggleFullscreen() {
        this.wrapper.classList.toggle('is-fullscreen');
        document.body.classList.toggle('tiptap-fullscreen-active', this.wrapper.classList.contains('is-fullscreen'));
    }

    toggleSource() {
        if (this.wrapper.classList.contains('is-source-view')) {
            const html = this.textarea.value;
            this.editor.commands.setContent(html, false);
            this.editorEl.style.display = '';
            this.textarea.style.display = 'none';
            this.wrapper.classList.remove('is-source-view');
            return;
        }
        this.textarea.value = this.editor.getHTML();
        this.editorEl.style.display = 'none';
        this.textarea.style.display = '';
        this.wrapper.classList.add('is-source-view');
    }

    ensureModal(id, title, sizeClass = '') {
        const existing = document.getElementById(id);
        if (existing) {
            existing.querySelector('.modal-title').textContent = title;
            return existing;
        }
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog ${sizeClass}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    showModal(modal) {
        if (window.bootstrap && window.bootstrap.Modal) {
            const inst = window.bootstrap.Modal.getOrCreateInstance(modal);
            inst.show();
            return;
        }
        modal.classList.add('show');
        modal.style.display = 'block';
    }

    hideModal(modal) {
        if (window.bootstrap && window.bootstrap.Modal) {
            const inst = window.bootstrap.Modal.getOrCreateInstance(modal);
            inst.hide();
            return;
        }
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function bootstrap() {
    if (window.__tiptapEditorLoaded) {
        return;
    }
    window.__tiptapEditorLoaded = true;

    if (typeof window.tinymce !== 'undefined') {
        return;
    }

    let config = {};
    const configEl = document.getElementById('tiptap-editor-config');
    if (configEl) {
        try {
            config = JSON.parse(configEl.textContent || '{}');
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[tiptap] invalid editor config JSON, falling back to defaults', e);
        }
    }

    const selectors = (config.targetSelectors || 'textarea.wysiwyg').split(',').map((s) => s.trim()).filter(Boolean);
    const options = {
        toolbar: config.toolbarItems || 'undo,redo,|,bold,italic,underline,|,heading,paragraph,|,bulletlist,orderedlist,|,link,unlink,|,source',
        editorHeight: config.editorHeight || 320,
        showToolbar: config.showToolbar !== false,
        forcePastingAsText: !!config.forcePastingAsText,
    };

    const isEligible = (el) => {
        if (!el || el.tagName !== 'TEXTAREA') return false;
        if (el.getAttribute(TIPTAP_MOUNTED_ATTR) === 'true') return false;
        if (el.closest(EXCLUDE_PARENT_SELECTOR)) return false;
        if (el.hasAttribute('data-no-tiptap')) return false;
        const elName = el.getAttribute('name') || '';
        if (/\bmeta_/i.test(elName) || /seo\[/i.test(elName)) return false;
        return true;
    };

    const matchesSelectors = (el) => {
        for (const sel of selectors) {
            try {
                if (el.matches(sel)) return true;
            } catch (e) {
                // skip invalid selector
            }
        }
        return false;
    };

    // Progressive mount: every matching textarea is wrapped after the
    // page has painted, one per idle frame, so the user sees the
    // editors immediately without freezing the browser even when several
    // rich-text fields share the same page (category/edit, product/edit).
    // A focus listener fast-tracks the textarea the user is about to
    // interact with so the queue can never feel sluggish.
    const mountTarget = (target) => {
        if (!isEligible(target) || !matchesSelectors(target)) return;
        new TiptapMount(target, options).mount();
    };

    const collectTargets = (root) => {
        if (!root || typeof root.querySelectorAll !== 'function') return [];
        const seen = new Set();
        const found = [];
        selectors.forEach((sel) => {
            let nodes;
            try {
                nodes = root.querySelectorAll(sel);
            } catch (e) {
                return;
            }
            nodes.forEach((el) => {
                if (!isEligible(el)) return;
                if (seen.has(el)) return;
                seen.add(el);
                found.push(el);
            });
        });
        return found;
    };

    const mountQueue = [];
    let queueRunning = false;
    // setTimeout(0) is more predictable than requestIdleCallback for
    // queue draining: requestIdleCallback can be deferred indefinitely
    // by headless browsers (Playwright never reports the page as idle)
    // and would leave the editors stuck in the pending state.
    const scheduleIdle = (fn) => setTimeout(fn, 0);

    const drainQueue = () => {
        if (mountQueue.length === 0) {
            queueRunning = false;
            return;
        }
        const target = mountQueue.shift();
        if (target && isEligible(target)) {
            target.classList.remove('tiptap-pending');
            mountTarget(target);
        }
        if (mountQueue.length > 0) {
            scheduleIdle(drainQueue);
        } else {
            queueRunning = false;
        }
    };

    const enqueue = (target) => {
        if (!target || target.getAttribute(TIPTAP_MOUNTED_ATTR) === 'true') return;
        if (mountQueue.includes(target)) return;
        mountQueue.push(target);
        if (!queueRunning) {
            queueRunning = true;
            scheduleIdle(drainQueue);
        }
    };

    const promoteToFront = (target) => {
        const idx = mountQueue.indexOf(target);
        if (idx > 0) {
            mountQueue.splice(idx, 1);
            mountQueue.unshift(target);
        }
    };

    const armProgressiveMount = (root) => {
        const targets = collectTargets(root);
        targets.forEach((el) => {
            el.classList.add('tiptap-pending');
            // Fast-track: if the user reaches this textarea before the
            // idle queue does, bump it to the front and mount on the
            // next animation frame so the focus is not lost.
            const onInteract = () => {
                el.removeEventListener('focus', onInteract);
                el.removeEventListener('mousedown', onInteract);
                el.removeEventListener('touchstart', onInteract);
                if (el.getAttribute(TIPTAP_MOUNTED_ATTR) === 'true') return;
                promoteToFront(el);
                requestAnimationFrame(() => {
                    if (el.getAttribute(TIPTAP_MOUNTED_ATTR) === 'true') return;
                    el.classList.remove('tiptap-pending');
                    mountTarget(el);
                });
            };
            el.addEventListener('focus', onInteract);
            el.addEventListener('mousedown', onInteract);
            el.addEventListener('touchstart', onInteract);
            enqueue(el);
        });
    };

    const arm = () => armProgressiveMount(document);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', arm, { once: true });
    } else {
        // Defer to the next frame so the browser can paint the rest of
        // the page before we kick off the queue.
        requestAnimationFrame(arm);
    }

    // Expose a manual hook so other scripts (e.g. dynamically inserted
    // modals) can re-arm new textareas without waiting for the next page
    // load.
    window.TiptapEditor = {
        arm: armProgressiveMount,
        mount: mountTarget,
    };
}

bootstrap();
