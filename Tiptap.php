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

namespace Tiptap;

use Propel\Runtime\Connection\ConnectionInterface;
use Symfony\Component\DependencyInjection\Loader\Configurator\ServicesConfigurator;
use Symfony\Component\Filesystem\Filesystem;
use Thelia\Action\Document;
use Thelia\Model\ConfigQuery;
use Thelia\Module\BaseModule;

class Tiptap extends BaseModule
{
    public const DOMAIN_NAME = 'tiptap';

    public const DEFAULT_TOOLBAR = 'undo,redo,|,bold,italic,underline,strike,|,heading,paragraph,|,align-left,align-center,align-right,align-justify,|,bulletlist,orderedlist,outdent,indent,|,link,unlink,image,|,forecolor,backcolor,|,hr,blockquote,table,|,code,source,|,charmap,fullscreen,print,preview';

    /**
     * Extra zones, beyond the per-field matrix, where the editor mounts. Holds
     * the test zone (.wysiwyg) on the configuration page and any textarea opting
     * in through the `tiptap-editor` Stimulus controller.
     */
    public const DEFAULT_EXTRA_SELECTORS = '.wysiwyg,textarea[data-controller~="tiptap-editor"]';

    public const DEFAULT_EDITOR_HEIGHT = '320';

    /** Catalogue entities whose edit screen carries rich-text fields. */
    public const ENTITIES = ['product', 'content', 'folder', 'brand', 'category'];

    /** Configurable fields, mapped to the Thelia form field they target. */
    public const FIELDS = ['summary' => 'chapo', 'conclusion' => 'postscriptum'];

    private readonly string $assetSourceDir;
    private readonly string $assetWebDir;

    public function __construct()
    {
        $this->assetSourceDir = __DIR__.DS.'Resources'.DS.'dist';
        $this->assetWebDir = THELIA_WEB_DIR.'tiptap';
    }

    public function postActivation(ConnectionInterface $con = null): void
    {
        $fileSystem = new Filesystem();

        if (!$fileSystem->exists($this->assetSourceDir)) {
            $fileSystem->mkdir($this->assetSourceDir);
        }

        if (!$fileSystem->exists($this->assetWebDir)) {
            $deliveryMode = ConfigQuery::read(Document::CONFIG_DELIVERY_MODE);

            if ('symlink' === $deliveryMode) {
                $fileSystem->symlink($this->assetSourceDir, $this->assetWebDir);
            } else {
                $fileSystem->mirror($this->assetSourceDir, $this->assetWebDir);
            }
        }

        if (null === ConfigQuery::read('tiptap.toolbar_items')) {
            ConfigQuery::write('tiptap.toolbar_items', self::DEFAULT_TOOLBAR);
        }

        if (null === ConfigQuery::read('tiptap.extra_selectors')) {
            ConfigQuery::write('tiptap.extra_selectors', self::DEFAULT_EXTRA_SELECTORS);
        }

        if (null === ConfigQuery::read('tiptap.editor_height')) {
            ConfigQuery::write('tiptap.editor_height', self::DEFAULT_EDITOR_HEIGHT);
        }

        if (null === ConfigQuery::read('tiptap.force_pasting_as_text')) {
            ConfigQuery::write('tiptap.force_pasting_as_text', '0');
        }

        if (null === ConfigQuery::read('tiptap.show_toolbar')) {
            ConfigQuery::write('tiptap.show_toolbar', '1');
        }

        foreach (self::ENTITIES as $entity) {
            foreach (array_keys(self::FIELDS) as $field) {
                $key = 'tiptap.'.$entity.'_'.$field;
                if (null === ConfigQuery::read($key)) {
                    ConfigQuery::write($key, '1');
                }
            }
        }
    }

    /**
     * Build the CSS selector list of textareas the editor mounts on, from the
     * per-field matrix. The description field is always editable; summary and
     * conclusion follow their matrix checkbox per entity; extra zones are
     * appended from the free-text configuration.
     */
    public static function buildTargetSelectors(): string
    {
        $selectors = [];

        foreach (self::ENTITIES as $entity) {
            $prefix = 'thelia_'.$entity.'_modification';
            $selectors[] = sprintf('textarea[name="%s[description]"]', $prefix);

            foreach (self::FIELDS as $field => $formField) {
                if ('1' === (string) ConfigQuery::read('tiptap.'.$entity.'_'.$field, '1')) {
                    $selectors[] = sprintf('textarea[name="%s[%s]"]', $prefix, $formField);
                }
            }
        }

        $extra = (string) ConfigQuery::read('tiptap.extra_selectors', self::DEFAULT_EXTRA_SELECTORS);
        foreach (explode(',', $extra) as $selector) {
            $selector = trim($selector);
            if ('' !== $selector) {
                $selectors[] = $selector;
            }
        }

        return implode(',', array_values(array_unique($selectors)));
    }

    public function postDeactivation(ConnectionInterface $con = null): void
    {
        $fileSystem = new Filesystem();

        if ($fileSystem->exists($this->assetWebDir)) {
            $fileSystem->remove($this->assetWebDir);
        }
    }

    public function destroy(ConnectionInterface $con = null, $deleteModuleData = false): void
    {
        if (!$deleteModuleData) {
            return;
        }
    }

    public static function configureServices(ServicesConfigurator $servicesConfigurator): void
    {
        $servicesConfigurator->load(self::getModuleCode().'\\', __DIR__)
            ->exclude([
                __DIR__.'/I18n/**/*',
                __DIR__.'/Resources/**/*',
                __DIR__.'/templates/**/*',
                __DIR__.'/Config/**/*',
                __DIR__.'/Tiptap.php',
            ])
            ->autowire(true)
            ->autoconfigure(true);
    }
}
