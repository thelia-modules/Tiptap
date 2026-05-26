<?php

/*
 * This file is part of the Tiptap module for Thelia 3.
 *
 * (c) OpenStudio <info@thelia.net>
 *
 * For the full copyright and license information, please view the LICENSE.txt
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace Tiptap\Hook;

use Symfony\Component\HttpFoundation\RequestStack;
use Thelia\Core\Event\Hook\HookRenderEvent;
use Thelia\Core\Hook\BaseHook;
use Thelia\Model\ConfigQuery;
use Tiptap\Tiptap;

/**
 * Injects the TipTap editor bootstrap (CSS + JS + config) into every
 * back-office page that emits the `wysiwyg.js` hook. Mirrors the legacy
 * Tinymce module so that any textarea with class `.wysiwyg` becomes a
 * fully featured WYSIWYG editor — no template change required.
 *
 * Unlike most BaseHook implementations, this listener avoids calling
 * `$this->getRequest()` / `getParser()` because Thelia's `ParserResolver`
 * does not expose a "current parser" when the host page is rendered by
 * the BO Twig bundle (Twig native render). The locale is resolved through
 * an explicit `RequestStack` injection instead.
 */
class WysiwygHookManager extends BaseHook
{
    public function __construct(
        private readonly RequestStack $requestStack,
    ) {
        parent::__construct();
    }

    public static function getSubscribedHooks(): array
    {
        return [
            'wysiwyg.js' => [
                [
                    'type' => 'back',
                    'method' => 'onJsWysiwyg',
                ],
            ],
        ];
    }

    public function onJsWysiwyg(HookRenderEvent $event): void
    {
        $event->add($this->renderInit());
    }

    private function renderInit(): string
    {
        $config = [
            'targetSelectors' => (string) ConfigQuery::read('tiptap.target_selectors', Tiptap::DEFAULT_TARGET_SELECTORS),
            'editorHeight' => (int) ConfigQuery::read('tiptap.editor_height', Tiptap::DEFAULT_EDITOR_HEIGHT),
            'toolbarItems' => (string) ConfigQuery::read('tiptap.toolbar_items', Tiptap::DEFAULT_TOOLBAR),
            'showToolbar' => '1' === (string) ConfigQuery::read('tiptap.show_toolbar', '1'),
            'forcePastingAsText' => '1' === (string) ConfigQuery::read('tiptap.force_pasting_as_text', '0'),
            'locale' => $this->resolveLocale(),
            'assetBaseUrl' => '/tiptap',
        ];

        $configJson = json_encode($config, \JSON_THROW_ON_ERROR | \JSON_UNESCAPED_SLASHES);

        return <<<HTML
<link rel="stylesheet" href="/tiptap/tiptap-editor.css">
<script id="tiptap-editor-config" type="application/json">{$configJson}</script>
<script src="/tiptap/tiptap-editor.js" defer></script>
HTML;
    }

    private function resolveLocale(): string
    {
        return $this->requestStack->getCurrentRequest()?->getLocale() ?? 'en_US';
    }
}
