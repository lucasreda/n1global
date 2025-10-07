import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { Image as ImageIcon, Video, Play, Sparkle, FileCode, Frame, Images, User } from 'lucide-react';
import { ElementTemplate } from './text-elements';

export const MEDIA_ELEMENTS: ElementTemplate[] = [
  {
    id: 'image',
    name: 'Image',
    icon: ImageIcon,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'image',
      tag: 'img',
      attributes: {
        src: 'https://via.placeholder.com/800x600',
        alt: 'Placeholder image',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          height: 'auto',
          borderRadius: '8px',
        },
      },
    }),
  },
  {
    id: 'video',
    name: 'Video',
    icon: Video,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'video',
      tag: 'video',
      attributes: {
        src: '',
        controls: 'true',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          borderRadius: '8px',
        },
      },
    }),
  },
  {
    id: 'background-video',
    name: 'Background Video',
    icon: Play,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [
        {
          id: nanoid(),
          type: 'video',
          tag: 'video',
          attributes: {
            src: '',
            autoplay: 'true',
            muted: 'true',
            loop: 'true',
          },
          classNames: [],
          styles: {
            desktop: {
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: '-1',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          position: 'relative',
          minHeight: '400px',
          overflow: 'hidden',
        },
      },
    }),
  },
  {
    id: 'icon',
    name: 'Icon',
    icon: Sparkle,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      textContent: '⭐',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '48px',
          display: 'inline-block',
        },
      },
    }),
  },
  {
    id: 'svg',
    name: 'SVG',
    icon: FileCode,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'svg',
      attributes: {
        viewBox: '0 0 100 100',
        fill: 'currentColor',
      },
      children: [
        {
          id: nanoid(),
          type: 'container',
          tag: 'circle',
          attributes: {
            cx: '50',
            cy: '50',
            r: '40',
          },
          classNames: [],
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          width: '100px',
          height: '100px',
          color: '#3b82f6',
        },
      },
    }),
  },
  {
    id: 'embed',
    name: 'Embed',
    icon: Frame,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'iframe',
      attributes: {
        src: '',
        title: 'Embedded content',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          height: '400px',
          border: 'none',
          borderRadius: '8px',
        },
      },
    }),
  },
  {
    id: 'image-gallery',
    name: 'Image Gallery',
    icon: Images,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [
        {
          id: nanoid(),
          type: 'image',
          tag: 'img',
          attributes: {
            src: 'https://via.placeholder.com/400x300',
            alt: 'Gallery image 1',
          },
          classNames: [],
          styles: {
            desktop: {
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
            },
          },
        },
        {
          id: nanoid(),
          type: 'image',
          tag: 'img',
          attributes: {
            src: 'https://via.placeholder.com/400x300',
            alt: 'Gallery image 2',
          },
          classNames: [],
          styles: {
            desktop: {
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        },
      },
    }),
  },
  {
    id: 'avatar',
    name: 'Avatar',
    icon: User,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'image',
      tag: 'img',
      attributes: {
        src: 'https://via.placeholder.com/200x200',
        alt: 'User avatar',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          objectFit: 'cover',
        },
      },
    }),
  },
];
