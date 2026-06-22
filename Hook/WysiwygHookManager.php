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
            'targetSelectors' => Tiptap::buildTargetSelectors(),
            'editorHeight' => (int) ConfigQuery::read('tiptap.editor_height', Tiptap::DEFAULT_EDITOR_HEIGHT),
            'toolbarItems' => (string) ConfigQuery::read('tiptap.toolbar_items', Tiptap::DEFAULT_TOOLBAR),
            'showToolbar' => '1' === (string) ConfigQuery::read('tiptap.show_toolbar', '1'),
            'forcePastingAsText' => '1' === (string) ConfigQuery::read('tiptap.force_pasting_as_text', '0'),
            'locale' => $this->resolveLocale(),
            'assetBaseUrl' => '/tiptap',
        ];

        $configJson = json_encode($config, \JSON_THROW_ON_ERROR | \JSON_UNESCAPED_SLASHES);
        $version = $this->assetVersion();

        return <<<HTML
<link rel="stylesheet" href="/tiptap/tiptap-editor.css?v={$version}">
<script id="tiptap-editor-config" type="application/json">{$configJson}</script>
<script src="/tiptap/tiptap-editor.js?v={$version}" defer></script>
HTML;
    }

    /**
     * Cache-busting token derived from the built bundle mtime, so a module
     * update is picked up without a manual browser hard-refresh.
     */
    private function assetVersion(): string
    {
        foreach ([
            THELIA_WEB_DIR.'tiptap'.\DIRECTORY_SEPARATOR.'tiptap-editor.js',
            \dirname(__DIR__).\DIRECTORY_SEPARATOR.'Resources'.\DIRECTORY_SEPARATOR.'dist'.\DIRECTORY_SEPARATOR.'tiptap-editor.js',
        ] as $bundle) {
            if (is_file($bundle) && false !== ($mtime = filemtime($bundle))) {
                return (string) $mtime;
            }
        }

        return '1';
    }

    private function resolveLocale(): string
    {
        return $this->requestStack->getCurrentRequest()?->getLocale() ?? 'en_US';
    }
}
