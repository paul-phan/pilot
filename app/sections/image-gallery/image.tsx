import type {
  HydrogenComponentProps,
  HydrogenComponentSchema,
} from '@weaverse/hydrogen';
import clsx from 'clsx';
import {forwardRef} from 'react';
import {Image} from '@shopify/hydrogen';

interface ImageGalleryItemProps extends HydrogenComponentProps {
  src: string;
  columnSpan: number;
  borderRadius: number;
  hideOnMobile: boolean;
  altText: string;
}

let columnSpanClasses: {[span: number]: string} = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
};

let radiusClasses: {[radius: string]: string} = {
  0: '',
  2: 'rounded-sm',
  4: 'rounded',
  6: 'rounded-md',
  8: 'rounded-lg',
};

let ImageGalleryItem = forwardRef<HTMLImageElement, ImageGalleryItemProps>(
  (props, ref) => {
    let {src, columnSpan, borderRadius, hideOnMobile, altText, ...rest} = props;
    return (
      <Image
        ref={ref}
        {...rest}
        className={clsx(
          'h-72 object-cover object-center w-full',
          columnSpanClasses[columnSpan],
          radiusClasses[borderRadius],
          hideOnMobile && 'hidden sm:block',
        )}
        data={{url: src, altText}}
        sizes={`(min-width: 45em) 50vw, 100vw`}
      />
    );
  },
);

export default ImageGalleryItem;

export let schema: HydrogenComponentSchema = {
  type: 'image-gallery--item',
  title: 'Image',
  inspector: [
    {
      group: 'Image Gallery Item',
      inputs: [
        {
          type: 'image',
          name: 'src',
          label: 'Image',
          defaultValue:
            'https://images.placeholders.dev/?width=1000&height=1000&text=Pilot&bgColor=%23f4f4f5&textColor=%23a1a1aa',
        },
        {
          type: 'text',
          label: 'Alt Text',
          name: 'altText',
          defaultValue: 'Pilot Image',
        },
        {
          type: 'range',
          label: 'Column Span',
          name: 'columnSpan',
          configs: {
            min: 1,
            max: 4,
            step: 1,
          },
          defaultValue: 1,
        },
        {
          type: 'range',
          label: 'Border Radius',
          name: 'borderRadius',
          configs: {
            min: 0,
            max: 8,
            step: 2,
            unit: 'px',
          },
          defaultValue: 8,
        },
        {
          type: 'switch',
          label: 'Hide on Mobile',
          name: 'hideOnMobile',
          defaultValue: false,
        },
      ],
    },
  ],
  toolbar: ['general-settings', ['duplicate', 'delete']],
};
