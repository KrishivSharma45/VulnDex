import {defineArrayMember, defineField, defineType} from 'sanity'

import {RARITIES, SEVERITIES} from '@/lib/cvss'
import {DerivedFromCvssInput} from '../components/DerivedFromCvssInput'

export const cveCardType = defineType({
  name: 'cveCard',
  title: 'CVE Card',
  type: 'document',
  fieldsets: [{name: 'derived', title: 'Derived from CVSS', options: {columns: 2}}],
  fields: [
    defineField({
      name: 'cveId',
      title: 'CVE ID',
      type: 'string',
      description: 'e.g. CVE-2021-44228',
      validation: (rule) =>
        rule
          .required()
          .regex(/^CVE-\d{4}-\d{4,}$/, {name: 'CVE ID'})
          .error('Must look like CVE-YYYY-NNNN'),
    }),
    defineField({
      name: 'nickname',
      type: 'string',
      description: 'e.g. Log4Shell, Heartbleed',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'year',
      type: 'number',
      validation: (rule) => rule.required().integer().min(1988).max(new Date().getFullYear()),
    }),
    defineField({
      name: 'cvssScore',
      title: 'CVSS Score',
      type: 'number',
      description: '0.0 – 10.0',
      validation: (rule) => rule.required().min(0).max(10).precision(1),
    }),
    defineField({
      name: 'severity',
      type: 'string',
      fieldset: 'derived',
      options: {list: [...SEVERITIES]},
      components: {input: DerivedFromCvssInput},
    }),
    defineField({
      name: 'rarity',
      type: 'string',
      fieldset: 'derived',
      options: {list: [...RARITIES]},
      components: {input: DerivedFromCvssInput},
    }),
    defineField({
      name: 'attackVector',
      type: 'string',
      options: {
        list: [
          {title: 'Network', value: 'network'},
          {title: 'Adjacent', value: 'adjacent'},
          {title: 'Local', value: 'local'},
          {title: 'Physical', value: 'physical'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'affectedSoftware',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'story',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
    defineField({
      name: 'patchInfo',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          {title: 'Draft', value: 'draft'},
          {title: 'Verified', value: 'verified'},
          {title: 'Published', value: 'published'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'draft',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'set',
      type: 'reference',
      to: [{type: 'cardSet'}],
    }),
    defineField({
      name: 'attackTypes',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'attackType'}]})],
    }),
  ],
  orderings: [
    {title: 'CVSS, highest first', name: 'cvssDesc', by: [{field: 'cvssScore', direction: 'desc'}]},
    {title: 'Year, newest first', name: 'yearDesc', by: [{field: 'year', direction: 'desc'}]},
  ],
  preview: {
    select: {cveId: 'cveId', nickname: 'nickname', cvss: 'cvssScore', rarity: 'rarity'},
    prepare: ({cveId, nickname, cvss, rarity}) => ({
      title: nickname ? `${nickname} (${cveId ?? '?'})` : (cveId ?? 'New card'),
      subtitle: [rarity?.toUpperCase(), cvss != null && `CVSS ${cvss}`].filter(Boolean).join(' · '),
    }),
  },
})
