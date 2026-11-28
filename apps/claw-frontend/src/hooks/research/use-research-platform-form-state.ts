import { useCallback, useState } from 'react';

import { INITIAL_RESEARCH_PLATFORM_FORM } from '@/constants/research-platform.constants';
import type {
  ResearchPlatform,
  ResearchPlatformFormFieldSetter,
  ResearchPlatformFormState,
  UseResearchPlatformFormStateReturn,
} from '@/types/research-platform.types';
import { researchPlatformToForm } from '@/utilities/research-platform.utility';

/** Open / closed, which platform is being edited (null = adding one), and the typed fields. */
export function useResearchPlatformFormState(): UseResearchPlatformFormStateReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchPlatform | null>(null);
  const [form, setForm] = useState<ResearchPlatformFormState>(INITIAL_RESEARCH_PLATFORM_FORM);

  const setField = useCallback<ResearchPlatformFormFieldSetter>((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(INITIAL_RESEARCH_PLATFORM_FORM);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((platform: ResearchPlatform) => {
    setEditing(platform);
    setForm(researchPlatformToForm(platform));
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, editing, form, setField, openCreate, openEdit, close };
}
