import { createContext } from 'react';

import type { MessageCitation } from '@/types';

/**
 * The citations of the answer being rendered. A context rather than a prop
 * because react-markdown instantiates the anchor component itself; the empty
 * default means "no citations", so every other renderer is unaffected.
 */
export const CitationsContext = createContext<readonly MessageCitation[]>([]);
