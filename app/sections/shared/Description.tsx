import {
  type HydrogenComponentProps,
  type HydrogenComponentSchema,
} from '@weaverse/hydrogen';
import {clsx} from 'clsx';
import {forwardRef} from 'react';

import type {Alignment} from '~/lib/type';

type DescriptionProps = HydrogenComponentProps & {
  content: string;
  as?: 'p' | 'div';
  color?: string;
  width?: Width;
  alignment?: Alignment;
  className?: string;
};

type Width = 'full' | 'narrow';

let widthClasses: Record<Width, string> = {
  full: 'w-full mx-auto',
  narrow: 'w-full md:w-1/2 lg:w-3/4 max-w-4xl mx-auto',
};

let alignmentClasses: Record<Alignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

let Description = forwardRef<
  HTMLParagraphElement | HTMLDivElement,
  DescriptionProps
>((props, ref) => {
  let {
    as: Tag = 'p',
    width,
    content,
    color,
    alignment,
    className,
    ...rest
  } = props;
  return (
    <Tag
      ref={ref}
      {...rest}
      style={{color}}
      className={clsx(
        widthClasses[width!],
        alignmentClasses[alignment!],
        className,
      )}
      dangerouslySetInnerHTML={{__html: content}}
    ></Tag>
  );
});

Description.defaultProps = {
  as: 'p',
  width: 'narrow',
  content:
    "Pair large text with an image or full-width video to showcase your brand's lifestyle to describe and showcase an important detail of your products that you can tag on your image.",
  alignment: 'center',
};

export default Description;

export let schema: HydrogenComponentSchema = {
  type: 'description',
  title: 'Description',
  inspector: [
    {
      group: 'Description',
      inputs: [
        {
          type: 'select',
          name: 'as',
          label: 'Tag name',
          configs: {
            options: [
              {value: 'p', label: 'Paragraph'},
              {value: 'div', label: 'Div'},
            ],
          },
          defaultValue: 'p',
        },
        {
          type: 'richtext',
          name: 'content',
          label: 'Content',
          defaultValue:
            "Pair large text with an image or full-width video to showcase your brand's lifestyle to describe and showcase an important detail of your products that you can tag on your image.",
          placeholder:
            "Pair large text with an image or full-width video to showcase your brand's lifestyle to describe and showcase an important detail of your products that you can tag on your image.",
        },
        {
          type: 'color',
          name: 'color',
          label: 'Text color',
        },
        {
          type: 'toggle-group',
          name: 'width',
          label: 'Width',
          configs: {
            options: [
              {value: 'full', label: 'Full', icon: 'move-horizontal'},
              {
                value: 'narrow',
                label: 'Narrow',
                icon: 'fold-horizontal',
              },
            ],
          },
          defaultValue: 'narrow',
        },
        {
          type: 'toggle-group',
          name: 'alignment',
          label: 'Alignment',
          configs: {
            options: [
              {value: 'left', label: 'Left', icon: 'align-start-vertical'},
              {value: 'center', label: 'Center', icon: 'align-center-vertical'},
              {value: 'right', label: 'Right', icon: 'align-end-vertical'},
            ],
          },
          defaultValue: 'center',
        },
      ],
    },
  ],
  toolbar: ['general-settings', ['duplicate', 'delete']],
};
