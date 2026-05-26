# Changelog

All notable changes to the Tiptap WYSIWYG module are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-26

Initial release.

### Added
- BaseHook listener `Tiptap\Hook\WysiwygHookManager` on the `wysiwyg.js` back-office hook (auto-discovered via `getSubscribedHooks()`).
- Webpack bundle `Resources/dist/tiptap-editor.js` (~436 KB minified) shipping TipTap 3 with StarterKit, Underline, Link, Image, TextAlign, TextStyle, Color, Highlight, Subscript, Superscript, Table (+ Row / Header / Cell).
- Bootstrap 5 styled toolbar mirroring the legacy Tinymce feature set: undo/redo, bold/italic/underline/strike, heading dropdown H1–H6, alignment, bullet/ordered lists, indent/outdent, link/image, text color, highlight, horizontal rule, blockquote, table operations, inline code, source HTML toggle, special characters grid, fullscreen, print, preview.
- Lazy mount on first user interaction (focus / mousedown / touchstart) — page render stays fast even on screens with several rich-text fields.
- Auto-detection of canonical Thelia rich-text fields: `[description]`, `[chapo]`, `[postscriptum]`, `[conclusion]`, plus the legacy `.wysiwyg` class.
- Exclusion of SEO meta fields and other editors (TheliaBlocks, Ace, CodeMirror, Monaco, Tinymce legacy) via `EXCLUDE_PARENT_SELECTOR`.
- Bail-out when `window.tinymce` is present so the legacy module wins side-by-side.
- Global JS API `window.TiptapEditor.mount(el)` / `window.TiptapEditor.arm(root)` to mount dynamically inserted textareas.
- `postActivation` mirrors the compiled bundle into `THELIA_WEB_DIR/tiptap/` (symlink or copy, depending on `Document::CONFIG_DELIVERY_MODE`).
- Seed of five configurable defaults under the `tiptap.` config prefix.
- I18n strings (`fr_FR`, `en_US`) for the future admin configuration page.

### Known limitations (deferred to 0.2.0)
- Image upload endpoint (`/admin/tiptap/upload-image`) — Phase 1 uses prompt-for-URL only.
- Admin configuration page at `/admin/module/Tiptap` (toolbar editor, height slider, paste-as-text toggle).
- Smarty fallback template (`backOffice/default/wysiwyg_init.tpl`).
- `force_pasting_as_text` config flag is stored but not yet honoured by the bundle.

[0.1.0]: https://github.com/thelia-modules/Tiptap/releases/tag/0.1.0
