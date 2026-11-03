// Contract 1 (bridge 0.46.x, schema 1). Read side only in D1.
export type Subject = { subjectKey: string; classKey: string; subject: string; kind: string; active: boolean }
export type Pupil = { classKey: string; roll: number; name: string; status: 'Active' | 'Left'; updatedAt: string }
export type SessionRow = { sessionId: string; subjectKey: string; classKey: string; date: string; topic: string; status: string; updatedAt: string }
export type TickRow = { tickId: string; sessionId: string; subjectKey: string; classKey: string; roll: number; set: boolean; updatedAt: string }
export type SheetState = { ok: true; schema: number; subjects: Subject[]; roster: Pupil[]; sessions: SessionRow[]; ticks: TickRow[] }
/** RosterSource: the sheet adapter now, the T-07 roster-DB adapter later. UI and store depend only on this. */
export interface RosterSource { readonly kind: 'sheet' | 'demo' | 'fake'; pull(): Promise<SheetState> }
