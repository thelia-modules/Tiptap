# Tiptap — WYSIWYG for Thelia 3

[TipTap 3](https://tiptap.dev/) WYSIWYG editor for the Thelia 3 back-office Twig template. Replaces the legacy [Tinymce](https://github.com/thelia-modules/Tinymce) module — MIT editor core, ~436 KB bundle, no iframe, toolbar matching the legacy feature set.

## Install

```bash
composer require thelia/tiptap-module
php Thelia module:refresh
php Thelia module:activate Tiptap
```

The compiled bundle ships in `Resources/dist/`. `postActivation` mirrors it into `public/tiptap/` (or a symlink, depending on `Document::CONFIG_DELIVERY_MODE`).

If both Tinymce and Tiptap are active, Tiptap detects `window.tinymce` and stays inactive. Deactivate the legacy module first.

## How it works

Listens to the `wysiwyg.js` back-office hook (already emitted by ~18 BO Twig templates: `hook/edit`, `category/edit`, `product/edit`, `folder/edit`, `content/edit`, `brand/edit`, `coupon/edit`, `sale/edit`, `attribute/update`, `feature/update`, `template/update`, `tax-rule/update`, `order-status/update`, …). The hook injects:

```html
<link rel="stylesheet" href="/tiptap/tiptap-editor.css">
<script id="tiptap-editor-config" type="application/json">{ ... }</script>
<script src="/tiptap/tiptap-editor.js" defer></script>
```

The bundle then scans the DOM for matching textareas and upgrades them progressively (one per `setTimeout(0)` slot) so the page stays fluid even with several rich-text fields. Focus / mousedown / touchstart fast-tracks the targeted textarea to the front of the queue.

## Default selectors

```
textarea.wysiwyg
textarea[data-controller~="tiptap-editor"]
textarea[name$="[description]"]
textarea[name$="[chapo]"]
textarea[name$="[postscriptum]"]
textarea[name$="[conclusion]"]
```

Excluded: SEO meta fields (`meta_description`, `meta_keywords`) and textareas inside `.theliablocks-editor`, `.ace_editor`, `.CodeMirror`, `.monaco-editor`, `.mce-tinymce`, `[data-no-tiptap]`, the Symfony web debug toolbar.

To opt **out** a specific textarea, add `data-no-tiptap`. To opt **in** outside the defaults, add `class="wysiwyg"`.

## Toolbar

Undo / Redo · Bold / Italic / Underline / Strike · Heading H1–H6 dropdown · Align (L/C/R/Justify) · Bullet & ordered lists · Indent / Outdent · Link / Unlink / Image · Text color / Highlight · Horizontal rule / Blockquote / Table (3×3 + row/column ops) · Inline code · Source HTML toggle · Special character grid · Fullscreen · Print · Preview.

Bootstrap 5 markup with Bootstrap Icons — same look as the rest of the BO Twig templates.

## Configuration

Settings live in the `config` table under the `tiptap.` prefix and are seeded on activation:

| Key | Default | Description |
|---|---|---|
| `tiptap.toolbar_items` | full toolbar | Comma-separated buttons. Use `|` to insert a separator. |
| `tiptap.target_selectors` | see above | CSS selectors of textareas to upgrade. |
| `tiptap.editor_height` | `320` | Minimum editor height (px). |
| `tiptap.show_toolbar` | `1` | Set to `0` to hide the toolbar. |
| `tiptap.force_pasting_as_text` | `0` | Strip formatting on paste (Phase 2). |

## Programmatic API

```js
window.TiptapEditor.mount(document.getElementById('my-textarea'));
window.TiptapEditor.arm(document.getElementById('my-modal'));
```

## Compatibility

- Thelia ≥ 2.6, PHP 8.2+
- BO Twig (`thelia-templates/default-twig`). The Smarty BO is reachable through the same hook but not smoke-tested in 0.1.0.

## Development

```bash
cd Resources
npm install
npm run build    # production
npm run watch    # dev with sourcemaps
```

`dist/` is committed so that `composer require` ships a ready-to-use bundle. Bump `version` in `package.json` and `Config/module.xml` together.

## License

LGPL-3.0+ — see [LICENSE.txt](LICENSE.txt). TipTap and its extensions are MIT.
