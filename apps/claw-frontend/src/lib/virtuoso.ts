// Wrapper per CLAUDE.md library-wrapping rule. All Virtuoso usage in the app
// imports from here, not from 'react-virtuoso' directly. Keeping a single
// import surface lets us swap implementations or patch typings in one place.
export { Virtuoso } from 'react-virtuoso';
export type { FollowOutputCallback, VirtuosoHandle } from 'react-virtuoso';
