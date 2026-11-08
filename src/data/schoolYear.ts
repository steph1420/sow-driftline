// v0.8 F-SH-08: school years (sessions) run April to March, labelled "2026–27".
export type SchoolYear = { id: string; label: string; start: number }
const SHOWN = 3 // this year and the two before it (O3-session-open)
const short = (start: number) => String((start + 1) % 100).padStart(2, '0')

export const yearFrom = (start: number): SchoolYear => ({ id: `${start}-${short(start)}`, label: `${start}–${short(start)}`, start })
export const yearById = (id: string): SchoolYear => yearFrom(Number(id.slice(0, 4)))
export function yearOf(iso: string): SchoolYear {
  const y = Number(iso.slice(0, 4)); return yearFrom(Number(iso.slice(5, 7)) >= 4 ? y : y - 1)
}
/** The year on screen: the past year being viewed, else this year. */
export const shownYear = (viewing: string | null, today: string): SchoolYear => (viewing ? yearById(viewing) : yearOf(today))
/** Newest first: this year, then the past years the Session sheet offers. */
export const recentYears = (today: string): SchoolYear[] => Array.from({ length: SHOWN }, (_, i) => yearFrom(yearOf(today).start - i))
