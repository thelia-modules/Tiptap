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

use Thelia\Core\Event\Hook\HookRenderEvent;
use Thelia\Core\Hook\BaseHook;
use Thelia\Model\ConfigQuery;
use Tiptap\Tiptap;

class ConfigurationHookManager extends BaseHook
{
    public static function getSubscribedHooks(): array
    {
        return [
            'module.configuration' => [
                [
                    'type' => 'back',
                    'method' => 'onModuleConfiguration',
                ],
            ],
        ];
    }

    public function onModuleConfiguration(HookRenderEvent $event): void
    {
        $matrix = [];
        foreach (Tiptap::ENTITIES as $entity) {
            foreach (array_keys(Tiptap::FIELDS) as $field) {
                $key = $entity.'_'.$field;
                $matrix[$key] = '1' === (string) ConfigQuery::read('tiptap.'.$key, '1');
            }
        }

        $event->add($this->render('Tiptap/configuration.html.twig', [
            'matrix' => $matrix,
            'extraSelectors' => (string) ConfigQuery::read('tiptap.extra_selectors', Tiptap::DEFAULT_EXTRA_SELECTORS),
            'editorHeight' => (int) ConfigQuery::read('tiptap.editor_height', Tiptap::DEFAULT_EDITOR_HEIGHT),
        ]));
    }
}
