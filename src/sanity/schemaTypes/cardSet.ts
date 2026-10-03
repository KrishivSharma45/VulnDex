import {defineField, defineType} from 'sanity'

export const cardSetType = defineType({
  name: 'cardSet',
  title: 'Card Set',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'themeColor',
      title: 'Theme color',
      type: 'string',
      description: 'Hex color, e.g. #ff3366',
      validation: (rule) =>
        rule.regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, {name: 'hex color'}).error('Use a hex color like #ff3366'),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'themeColor'},
  },
})
