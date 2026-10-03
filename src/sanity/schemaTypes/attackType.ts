import {defineField, defineType} from 'sanity'

export const attackTypeType = defineType({
  name: 'attackType',
  title: 'Attack Type',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      description: 'e.g. Remote Code Execution, SQL Injection',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
    }),
  ],
})
