// Only cards with status "published" are ever exposed on the public site.
const PUBLISHED_CARD = `_type == "cveCard" && status == "published" && defined(cveId)`

const CARD_PROJECTION = `{
  _id,
  cveId,
  nickname,
  year,
  cvssScore,
  severity,
  rarity,
  attackVector,
  affectedSoftware,
  summary,
  story,
  patchInfo,
  "set": set->{_id, title, themeColor},
  "attackTypes": attackTypes[]->{_id, name}
}`

export const CARDS_QUERY = `*[${PUBLISHED_CARD}] | order(cvssScore desc, year desc) ${CARD_PROJECTION}`

export const CARD_BY_ID_QUERY = `*[${PUBLISHED_CARD} && cveId == $cveId][0] ${CARD_PROJECTION}`

export const CARD_IDS_QUERY = `*[${PUBLISHED_CARD}].cveId`
