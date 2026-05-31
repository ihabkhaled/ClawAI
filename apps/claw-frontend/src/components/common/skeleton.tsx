// Single re-export hub for the design-system skeleton primitives. Each
// implementation lives in its own file under `./skeletons/` per the
// one-component-per-file rule; this barrel exists so consumers can `import
// { CardSkeleton, TextSkeleton, AvatarSkeleton, TableRowSkeleton } from
// '@/components/common/skeleton'` without juggling four import lines.
export { CardSkeleton } from './skeletons/card-skeleton';
export { ListRowSkeleton } from './skeletons/list-row-skeleton';
export { TableRowSkeleton } from './skeletons/table-row-skeleton';
export { TextSkeleton } from './skeletons/text-skeleton';
export { AvatarSkeleton } from './skeletons/avatar-skeleton';
