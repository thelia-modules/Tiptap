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

namespace Tiptap\Controller\Admin;

use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Thelia\Controller\Admin\AdminController;
use Thelia\Core\Security\AccessManager;
use Thelia\Core\Security\Resource\AdminResources;
use Thelia\Form\Exception\FormValidationException;
use Thelia\Model\ConfigQuery;
use Tiptap\Form\ConfigurationForm;
use Tiptap\Tiptap;

class ConfigurationController extends AdminController
{
    #[Route('/admin/module/Tiptap/configure', name: 'tiptap.configure', methods: 'POST')]
    public function configure(): RedirectResponse|Response|null
    {
        if (null !== $response = $this->checkAuth([AdminResources::MODULE], ['Tiptap'], AccessManager::UPDATE)) {
            return $response;
        }

        $form = $this->createForm(ConfigurationForm::getName());

        try {
            $data = $this->validateForm($form)->getData();

            foreach (Tiptap::ENTITIES as $entity) {
                foreach (array_keys(Tiptap::FIELDS) as $field) {
                    $key = $entity.'_'.$field;
                    ConfigQuery::write('tiptap.'.$key, $data[$key] ? '1' : '0');
                }
            }

            ConfigQuery::write('tiptap.extra_selectors', (string) $data['extra_selectors']);
            ConfigQuery::write('tiptap.editor_height', (string) (int) $data['editor_height']);

            $this->adminLogAppend(
                AdminResources::MODULE,
                AccessManager::UPDATE,
                'Tiptap configuration updated'
            );

            return $this->generateSuccessRedirect($form);
        } catch (FormValidationException $exception) {
            $errorMessage = $this->createStandardFormValidationErrorMessage($exception);
        } catch (\Exception $exception) {
            $errorMessage = $exception->getMessage();
        }

        $form->setErrorMessage($errorMessage);

        $this->getParserContext()
            ->addForm($form)
            ->setGeneralError($errorMessage);

        return $this->generateErrorRedirect($form);
    }
}
