import {randomUUID} from 'node:crypto'

export const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

export const toBlocks = (paragraphs: string[]) =>
  paragraphs.map((text) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  }))

// IDs use hyphens, not dots: dotted IDs are treated as private paths in Sanity.
export const setId = (slug: string) => `cardSet-${slug}`
export const attackId = (slug: string) => `attackType-${slug}`
export const cardId = (cveId: string) => cveId.toLowerCase()
