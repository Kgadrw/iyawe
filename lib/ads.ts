/** Where an ad appears on the public homepage */
export const AD_PLACEMENTS = ['BANNER_TOP', 'SIDEBAR_RIGHT'] as const
export type AdPlacement = (typeof AD_PLACEMENTS)[number]

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  BANNER_TOP: 'Below header (horizontal banner)',
  SIDEBAR_RIGHT: 'Right sidebar (vertical)',
}

/** Max active ads allowed below the header */
export const BANNER_TOP_MAX_ACTIVE = 2

export function normalizeAdPlacement(value: unknown): AdPlacement {
  if (value === 'BANNER_TOP' || value === 'SIDEBAR_RIGHT') return value
  return 'SIDEBAR_RIGHT'
}

export type PublicAd = {
  id: string
  image: string
  link: string
  title?: string
  placement: AdPlacement
  order?: number
}
