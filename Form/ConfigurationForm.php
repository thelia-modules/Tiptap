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

namespace Tiptap\Form;

use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Thelia\Form\BaseForm;
use Thelia\Model\ConfigQuery;
use Tiptap\Tiptap;

class ConfigurationForm extends BaseForm
{
    protected function buildForm(): void
    {
        foreach (Tiptap::ENTITIES as $entity) {
            foreach (array_keys(Tiptap::FIELDS) as $field) {
                $key = $entity.'_'.$field;
                $this->formBuilder->add(
                    $key,
                    CheckboxType::class,
                    [
                        'required' => false,
                        'data' => '1' === (string) ConfigQuery::read('tiptap.'.$key, '1'),
                    ]
                );
            }
        }

        $this->formBuilder
            ->add(
                'extra_selectors',
                TextType::class,
                [
                    'required' => false,
                    'data' => (string) ConfigQuery::read('tiptap.extra_selectors', Tiptap::DEFAULT_EXTRA_SELECTORS),
                    'label' => $this->translator->trans('Additional text areas', [], Tiptap::DOMAIN_NAME),
                ]
            )
            ->add(
                'editor_height',
                IntegerType::class,
                [
                    'required' => false,
                    'data' => (int) ConfigQuery::read('tiptap.editor_height', Tiptap::DEFAULT_EDITOR_HEIGHT),
                    'label' => $this->translator->trans('Editor height', [], Tiptap::DOMAIN_NAME),
                ]
            )
            ->add(
                'test_zone',
                TextareaType::class,
                [
                    'required' => false,
                    'mapped' => false,
                    'label' => $this->translator->trans('Sample editor', [], Tiptap::DOMAIN_NAME),
                ]
            );
    }

    public static function getName(): string
    {
        return 'tiptap_configuration';
    }
}
