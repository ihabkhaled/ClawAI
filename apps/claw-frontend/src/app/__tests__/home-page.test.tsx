import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage, { generateMetadata } from '@/app/(marketing)/page';

describe('HomePage', () => {
  it('renders exactly one h1', () => {
    render(<HomePage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders primary CTAs to /chat and /login', () => {
    render(<HomePage />);
    const openClawLinks = screen.getAllByRole('link', { name: 'Open Claw' });
    expect(openClawLinks.length).toBeGreaterThan(0);
    for (const link of openClawLinks) {
      expect(link).toHaveAttribute('href', '/chat');
    }
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('renders the last-reviewed date from the content registry', () => {
    render(<HomePage />);
    expect(screen.getByText(/Last reviewed 2026-07-24/)).toBeInTheDocument();
  });
});

describe('HomePage generateMetadata', () => {
  it('returns the registry title/description and a canonical URL', async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toContain('ClawAI');
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toMatch(/\/$/);
  });
});
