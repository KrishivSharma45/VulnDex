'use client'

import {useEffect} from 'react'
import {Badge, Flex, Text} from '@sanity/ui'
import {set, unset, useFormValue, type StringInputProps} from 'sanity'

import {RARITIES, SEVERITIES, getRarity, getSeverity} from '@/lib/cvss'

const derivers = {
  severity: {derive: getSeverity, options: SEVERITIES},
  rarity: {derive: getRarity, options: RARITIES},
} as const

/**
 * Read-only input that keeps a field in sync with the document's cvssScore.
 * Stored (not just computed) so it can be queried/filtered with GROQ.
 */
export function DerivedFromCvssInput(props: StringInputProps) {
  const {value, onChange, schemaType} = props
  const cvssScore = useFormValue(['cvssScore']) as number | undefined
  const {derive, options} = derivers[schemaType.name as keyof typeof derivers]

  const next = typeof cvssScore === 'number' ? derive(cvssScore) : undefined

  useEffect(() => {
    if (next === value) return
    onChange(next ? set(next) : unset())
  }, [next, value, onChange])

  const title = options.find((o) => o.value === next)?.title

  return (
    <Flex align="center" gap={2}>
      {title ? (
        <Badge tone="primary" padding={2}>
          {title}
        </Badge>
      ) : (
        <Text muted size={1}>
          Set a CVSS score to derive this
        </Text>
      )}
    </Flex>
  )
}
