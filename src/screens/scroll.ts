// A–Z / search jump: put the name in the vertical middle of the list viewport (between bar and dock).
// Near the top of the list it can't be centred → stays where it lands (scroll clamps at 0).
export function centreScrollTop(o: { rowPageTop: number; rowH: number; viewTop: number; viewBottom: number }): number {
  return Math.max(0, o.rowPageTop + o.rowH / 2 - (o.viewTop + o.viewBottom) / 2)
}
