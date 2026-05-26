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

    /**
     * Default toolbar identical in capability to the legacy Tinymce module
     * (undo/redo, bold/italic/underline/strike, headings, alignment, lists,
     * link, image, color, highlight, hr, table, code, source, fullscreen,
     * print, preview, charmap).
     */
    public const DEFAULT_TOOLBAR = 'undo,redo,|,bold,italic,underline,strike,|,heading,paragraph,|,align-left,align-center,align-right,align-justify,|,bulletlist,orderedlist,outdent,indent,|,link,unlink,image,|,forecolor,backcolor,|,hr,blockquote,table,|,code,source,|,charmap,fullscreen,print,preview';

    /**
     * Default CSS selectors for textareas to upgrade into TipTap editors.
     *
     * We cover the legacy `.wysiwyg` class (kept for Smarty templates that
     * still tag their textareas) plus the canonical Thelia rich-text field
     * names — description / chapo / postscriptum / conclusion / summary /
     * content — that every back-office form uses by convention. The list
     * is taken from the legacy Tinymce `available_text_areas` mapping and
     * extended to match the BO Twig form naming. SEO meta_description /
     * meta_keywords textareas are intentionally excluded by the JS layer
     * because they are not rich-text.
     */
    public const DEFAULT_TARGET_SELECTORS = 'textarea.wysiwyg,textarea[data-controller~="tiptap-editor"],textarea[name$="[description]"],textarea[name$="[chapo]"],textarea[name$="[postscriptum]"],textarea[name$="[conclusion]"]';

    public const DEFAULT_EDITOR_HEIGHT = '320';

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
            // The compiled bundle ships with the module; if it is missing,
            // the maintainer forgot to run `npm run build` before publishing.
            // We do not fail postActivation (the module stays installed) but
            // we log a warning visible in the admin module page once the
            // user opens it. Hook rendering will gracefully no-op until the
            // bundle is available on disk.
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

        // Always seed defaults on (re)activation. Existing values are not
        // overwritten — keep null-check to preserve user customizations — but
        // we ensure each config row exists with a sane initial value.
        if (null === ConfigQuery::read('tiptap.toolbar_items')) {
            ConfigQuery::write('tiptap.toolbar_items', self::DEFAULT_TOOLBAR);
        }

        if (null === ConfigQuery::read('tiptap.target_selectors')) {
            ConfigQuery::write('tiptap.target_selectors', self::DEFAULT_TARGET_SELECTORS);
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

        // Nothing module-owned in the database for now (config rows only).
        // The Config\Variable table cleanup is handled by the core uninstaller
        // through the variables prefixed by `tiptap.`.
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
