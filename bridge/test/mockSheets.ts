import { createHash, randomUUID } from 'node:crypto'
/** Minimal in-memory SpreadsheetApp mock — enough for apps-script/Code.js logic tests. */
type Cell = { v: unknown; f: string }

export class MockRange {
  constructor(private sh: MockSheet, public r: number, public c: number, public nr: number, public nc: number) {}
  getRow() { return this.r }
  getColumn() { return this.c }
  getNumRows() { return this.nr }
  getNumColumns() { return this.nc }
  getSheet() { return this.sh }
  getA1Notation() { return `R${this.r}C${this.c}` }
  getValues() {
    const out: unknown[][] = []
    for (let i = 0; i < this.nr; i++) {
      const row: unknown[] = []
      for (let j = 0; j < this.nc; j++) row.push(this.sh.cell(this.r + i, this.c + j).v)
      out.push(row)
    }
    return out
  }
  getDisplayValues() { return this.getValues().map((r) => r.map((v) => (v == null ? '' : String(v)))) }
  getValue() { return this.sh.cell(this.r, this.c).v }
  getFormula() { return this.sh.cell(this.r, this.c).f }
  setValues(vals: unknown[][]) {
    if (vals.length !== this.nr || vals.some((r) => r.length !== this.nc)) throw new Error(`setValues size mismatch ${vals.length}x${vals[0]?.length} vs ${this.nr}x${this.nc}`)
    vals.forEach((row, i) => row.forEach((v, j) => this.sh.put(this.r + i, this.c + j, { v, f: '' })))
    return this
  }
  setValue(v: unknown) { this.sh.put(this.r, this.c, { v, f: '' }); return this }
  setFormula(f: string) { this.sh.put(this.r, this.c, { v: '', f }); return this }
  clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.put(this.r + i, this.c + j, { v: '', f: '' }); return this }
  insertCheckboxes() { return this }
  removeCheckboxes() { return this }
  setNumberFormat() { return this }
  setDataValidation() { return this }
  setFontWeight() { return this }
  setBackground() { return this }
  setWrap() { return this }
  protect() { return { setWarningOnly: () => {} } }
}

export class MockSheet {
  cells = new Map<string, Cell>()
  hidden: number[] = []
  maxRows = 1000
  constructor(public name: string) {}
  cell(r: number, c: number): Cell { return this.cells.get(`${r},${c}`) ?? { v: '', f: '' } }
  put(r: number, c: number, cell: Cell) {
    if (r > this.maxRows) throw new Error('outside the dimensions of the sheet')
    if (cell.v === '' && !cell.f) this.cells.delete(`${r},${c}`)
    else this.cells.set(`${r},${c}`, cell)
  }
  getName() { return this.name }
  setName(n: string) { this.name = n; return this }
  getLastRow() { let m = 0; for (const k of this.cells.keys()) m = Math.max(m, Number(k.split(',')[0])); return m }
  getLastColumn() { let m = 0; for (const k of this.cells.keys()) m = Math.max(m, Number(k.split(',')[1])); return m }
  getMaxRows() { return this.maxRows }
  insertRowsAfter(_after: number, n: number) { this.maxRows += n; return this }
  getRange(a: number | string, b?: number, nr = 1, nc = 1) {
    if (typeof a === 'string') {
      const m = a.match(/^([A-Z]+)(\d+)/)!
      const col = m[1]!.split('').reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0)
      return new MockRange(this, Number(m[2]), col, 1, 1)
    }
    if (a + nr - 1 > this.maxRows) throw new Error('The coordinates of the range are outside the dimensions of the sheet.')
    return new MockRange(this, a, b!, nr, nc)
  }
  getDataRange() { return new MockRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())) }
  clear() { this.cells.clear(); return this }
  clearContents() { this.cells.clear(); return this }
  setFrozenRows() { return this }
  hideSheet() { this.isHidden = true; return this }
  isHidden = false
  setFrozenColumns() { return this }
  hideColumns(c: number) { this.hidden.push(c); return this }
  setColumnWidth() { return this }
  deleteRows(start: number, n: number) {
    const next = new Map<string, Cell>()
    for (const [k, v] of this.cells) {
      const [r, c] = k.split(',').map(Number) as [number, number]
      if (r >= start && r < start + n) continue
      next.set(`${r >= start + n ? r - n : r},${c}`, v)
    }
    this.cells = next
  }
  appendRow(row: unknown[]) { const r = this.getLastRow() + 1; row.forEach((v, j) => this.put(r, j + 1, { v, f: '' })); return this }
  /** test helper: rows as arrays of values */
  rows() { return this.getDataRange().getValues() }
}

export class MockSpreadsheet {
  sheets: MockSheet[] = []
  locale = 'en_US'
  tz = 'America/New_York'
  created: MockSpreadsheet[] = []
  constructor(public id = 'COPY_ID') {}
  getId() { return this.id }
  getUrl() { return `https://docs.google.com/spreadsheets/d/${this.id}/edit` }
  getSheets() { return this.sheets }
  getSheetByName(n: string) { return this.sheets.find((s) => s.name === n) ?? null }
  insertSheet(n: string) { if (this.getSheetByName(n)) throw new Error('exists ' + n); const s = new MockSheet(n); this.sheets.push(s); return s }
  deleteSheet(s: MockSheet) { this.sheets = this.sheets.filter((x) => x !== s) }
  setSpreadsheetLocale(l: string) { this.locale = l }
  setSpreadsheetTimeZone(t: string) { this.tz = t }
  getSpreadsheetTimeZone() { return this.tz }
  toast() {}
}

export function makeGlobals(ss: MockSpreadsheet) {
  const props = new Map<string, string>()
  let uuid = 0
  const created: MockSpreadsheet[] = []
  const g = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: (id: string) => { if (id !== ss.id) throw new Error('no access'); return ss },
      create: (name: string) => { const n = new MockSpreadsheet('BACKUP_' + created.length); n.sheets.push(new MockSheet('Sheet1')); (n as unknown as { name: string }).name = name; created.push(n); return n },
      newDataValidation: () => { const b: Record<string, unknown> = {}; for (const m of ['requireValueInList', 'requireValueInRange', 'requireDate', 'requireCheckbox', 'setAllowInvalid', 'setHelpText']) b[m] = () => b; b.build = () => ({}); return b },
      getUi: () => ({ alert: () => {}, prompt: () => ({ getSelectedButton: () => 'OK', getResponseText: () => '' }), createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => {} }; return m }, Button: { OK: 'OK' }, ButtonSet: { OK: 1, OK_CANCEL: 2 } }),
      flush: () => {},
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => { props.set(k, v) }, deleteProperty: (k: string) => { props.delete(k) } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    Utilities: {
      getUuid: () => { ++uuid; return randomUUID() },
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_alg: string, s: string) => Array.from(createHash('sha256').update(s, 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s: string) => ({ text: s, setMimeType() { return this } }) },
    console,
  }
  return { g, props, created }
}
