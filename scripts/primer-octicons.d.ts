// @primer/octicons ships no type declarations — the generator needs only these
declare module '@primer/octicons' {
  interface Octicon {
    heights: Record<string, { width: number; path: string }>
  }
  const octicons: Record<string, Octicon>
  export default octicons
}
