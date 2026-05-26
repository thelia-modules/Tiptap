# Tiptap — WYSIWYG editor module for Thelia 3

Modern WYSIWYG editor based on [TipTap 3](https://tiptap.dev/) (ProseMirror) for the Thelia 3 back-office Twig template. Drop-in replacement for the legacy [Tinymce](https://github.com/thelia-modules/Tinymce) module — feature parity on the toolbar, MIT-licensed editor core, no iframe, no GPL viral, ~436 KB minified.

## Why TipTap

| Item | Tinymce 4 (legacy) | Tiptap |
|---|---|---|
| Engine | TinyMCE 4 (EOL since 2018) | TipTap 3 (ProseMirror, active) |
| License | GPL-2.0+ (viral) | MIT (core), LGPL-3.0+ (module) |
| Bundle | iframe + 1 MB skin | inline DOM + ~436 KB |
| Image upload | filemanager.php (PHP 5 era) | drag/drop URL (extension Phase 2) |
| Stimulus | no | optional (`window.TiptapEditor.mount(el)`) |
| Maintenance | unmaintained | ueberdosis team + 10 Pro extensions open-sourced 2025 |

## Install

```bash
composer require thelia/tiptap-module
ddev exec php Thelia module:refresh
ddev exec php Thelia module:activate Tiptap
```

The compiled JS/CSS bundle ships pre-built inside `Resources/dist/`. `postActivation` mirrors the assets into `web/tiptap/` (symlink when `Document::CONFIG_DELIVERY_MODE = symlink`, hard copy otherwise).

If both `Tinymce` and `Tiptap` are active at the same time, **Tinymce wins** — Tiptap detects `window.tinymce` at runtime and stays inactive. Deactivate the legacy module first to switch over.

## What it does

Listens to the canonical Thelia back-office hook `wysiwyg.js` (already emitted by ~18 BO Twig templates: `hook/edit`, `category/edit`, `product/edit`, `folder/edit`, `content/edit`, `brand/edit`, `coupon/edit`, `sale/edit`, `attribute/update`, `feature/update`, `template/update`, `tax-rule/update`, `order-status/update`, …). The hook injects three tags:

```html
<link rel="stylesheet" href="/tiptap/tiptap-editor.css">
<script id="tiptap-editor-config" type="application/json">{ ... }</script>
<script src="/tiptap/tiptap-editor.js" defer></script>
```

The bundle then scans the DOM for textareas matching the configured selector list and, on first focus, replaces them with a TipTap editor backed by the original `<textarea>` element. The form submit reads from the textarea like before — no template change required.

### Lazy mount

The editor instantiates **on first focus / mousedown / touchstart**, not at page load. This keeps the initial render fast on screens with several rich-text fields (e.g. `category/update` has 3, `product/update` has 3 + SEO fields). The placeholder textarea carries the `tiptap-pending` class until the user interacts with it.

### Default selectors

Default `target_selectors` (configurable in admin, see below):

```
textarea.wysiwyg,
textarea[data-controller~="tiptap-editor"],
textarea[name$="[description]"],
textarea[name$="[chapo]"],
textarea[name$="[postscriptum]"],
textarea[name$="[conclusion]"]
```

SEO meta fields (`meta_description`, `meta_keywords`) and textareas inside `.theliablocks-editor`, `.ace_editor`, `.CodeMirror`, `.monaco-editor`, `.mce-tinymce`, `[data-no-tiptap]` or the Symfony web debug toolbar are explicitly excluded.

To opt a textarea **out**, add `data-no-tiptap` to it. To opt **in** outside the default selectors, add `class="wysiwyg"` or `data-controller="tiptap-editor"`.

## Toolbar (mirror of legacy Tinymce)

| Group | Buttons |
|---|---|
| History | Undo, Redo |
| Inline | Bold, Italic, Underline, Strike |
| Block | Heading dropdown (H1–H6 + Paragraph) |
| Alignment | Left, Center, Right, Justify |
| Lists | Bullet list, Ordered list, Outdent, Indent |
| Insert | Link, Unlink, Image (URL) |
| Color | Text color, Highlight |
| Block | Horizontal rule, Blockquote, Table (3×3 + row/column ops) |
| Code | Inline code, Source HTML toggle |
| Misc | Special character grid, Fullscreen, Print, Preview |

The toolbar is rendered with Bootstrap 5 utility classes and Bootstrap Icons — same look and feel as the rest of the BO Twig templates.

## Configuration

All settings live in the `config` table under the `tiptap.` prefix:

| Key | Default | Description |
|---|---|---|
| `tiptap.toolbar_items` | full toolbar | Comma-separated button list. Use `|` to insert a separator. |
| `tiptap.target_selectors` | see above | CSS selectors of the textareas to upgrade. |
| `tiptap.editor_height` | `320` | Minimum height of the editor area in pixels. |
| `tiptap.show_toolbar` | `1` | Set to `0` to hide the toolbar entirely. |
| `tiptap.force_pasting_as_text` | `0` | Strip formatting on paste (reserved — Phase 2). |

Settings are seeded on `postActivation`. Update them via SQL or the upcoming `/admin/module/Tiptap` configuration page.

## Programmatic mount

The bundle exposes `window.TiptapEditor`:

```js
// Mount a single textarea
window.TiptapEditor.mount(document.getElementById('my-textarea'));

// Re-arm lazy mount on a freshly inserted modal
window.TiptapEditor.arm(document.getElementById('my-modal'));
```

## Compatibility

- Thelia ≥ 2.6 (PHP 8.2+)
- BO Twig template (`thelia-templates/default-twig`). The Smarty BO is supported via the same `wysiwyg.js` hook but has not been smoke-tested as part of Phase 1.

## Development

```bash
# install
cd Resources
npm install

# rebuild bundle
npm run build       # production
npm run watch       # dev with sourcemaps
```

The webpack output lands in `Resources/dist/` and is committed alongside the PHP module so that `composer require` ships a ready-to-use bundle. Bump `version` in `package.json` and `Config/module.xml` together.

## License

LGPL-3.0+ — see [LICENSE.txt](LICENSE.txt). TipTap and its extensions are MIT-licensed (bundled under `Resources/node_modules/@tiptap/*`).
