import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { FileText, Type, Mail, Phone, Lock, Hash, MessageSquare, ChevronDown, CheckSquare, Circle, ToggleLeft, SlidersHorizontal, Upload } from 'lucide-react';
import { ElementTemplate } from './text-elements';

export const FORM_ELEMENTS: ElementTemplate[] = [
  {
    id: 'form',
    name: 'Form',
    icon: FileText,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'form',
      tag: 'form',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        },
      },
    }),
  },
  {
    id: 'input-text',
    name: 'Input Text',
    icon: Type,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'text',
        placeholder: 'Enter text',
      },
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
        },
      },
    }),
  },
  {
    id: 'input-email',
    name: 'Input Email',
    icon: Mail,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'email',
        placeholder: 'Enter email',
      },
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
        },
      },
    }),
  },
  {
    id: 'input-number',
    name: 'Input Number',
    icon: Hash,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'number',
        placeholder: 'Enter number',
      },
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
        },
      },
    }),
  },
  {
    id: 'input-phone',
    name: 'Input Phone',
    icon: Phone,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'tel',
        placeholder: 'Enter phone',
      },
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
        },
      },
    }),
  },
  {
    id: 'input-password',
    name: 'Input Password',
    icon: Lock,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'password',
        placeholder: 'Enter password',
      },
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
        },
      },
    }),
  },
  {
    id: 'textarea',
    name: 'Textarea',
    icon: MessageSquare,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'textarea',
      attributes: {
        placeholder: 'Enter message',
        rows: '4',
      },
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
          fontFamily: 'inherit',
          resize: 'vertical',
        },
      },
    }),
  },
  {
    id: 'select',
    name: 'Select',
    icon: ChevronDown,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'select',
      children: [
        {
          id: nanoid(),
          type: 'text',
          tag: 'option',
          textContent: 'Option 1',
          attributes: { value: 'option1' },
          classNames: [],
        },
        {
          id: nanoid(),
          type: 'text',
          tag: 'option',
          textContent: 'Option 2',
          attributes: { value: 'option2' },
          classNames: [],
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
          backgroundColor: '#ffffff',
        },
      },
    }),
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    icon: CheckSquare,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'checkbox',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '20px',
          height: '20px',
          cursor: 'pointer',
        },
      },
    }),
  },
  {
    id: 'radio',
    name: 'Radio Button',
    icon: Circle,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'radio',
        name: 'radio-group',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '20px',
          height: '20px',
          cursor: 'pointer',
        },
      },
    }),
  },
  {
    id: 'toggle',
    name: 'Toggle Switch',
    icon: ToggleLeft,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'checkbox',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '48px',
          height: '24px',
          cursor: 'pointer',
          appearance: 'none',
          backgroundColor: '#d1d5db',
          borderRadius: '12px',
          position: 'relative',
          transition: 'background-color 0.2s',
        },
      },
    }),
  },
  {
    id: 'slider',
    name: 'Slider',
    icon: SlidersHorizontal,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'range',
        min: '0',
        max: '100',
        value: '50',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          height: '6px',
          cursor: 'pointer',
        },
      },
    }),
  },
  {
    id: 'file-upload',
    name: 'File Upload',
    icon: Upload,
    category: 'form',
    createNode: () => ({
      id: nanoid(),
      type: 'input',
      tag: 'input',
      attributes: {
        type: 'file',
      },
      classNames: [],
      styles: {
        desktop: {
          padding: '12px 16px',
          fontSize: '16px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          width: '100%',
        },
      },
    }),
  },
];
