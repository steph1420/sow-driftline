// v0.7f/g date wheels: Month | Date | Day + year pill (Steve t74u, t75u). Pure. Spec: FEATURES.md F-DT-02/03.
const NI = (): never => { throw new Error('not implemented (v0.7.0)') }
export function spinMonth(_iso: string, _delta: number): string { return NI() }
export function spinDate(_iso: string, _delta: number): string { return NI() }
/** dow 0 = Monday … 6 = Sunday; moves to that weekday in the same Mon–Sun week. */
export function spinDay(_iso: string, _dow: number): string { return NI() }
export function setYear(_iso: string, _year: number): string { return NI() }
