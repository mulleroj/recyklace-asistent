import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from '../components/layout/Header';

const renderHeader = (overrides: Partial<React.ComponentProps<typeof Header>> = {}) => {
  const props = {
    isOnline: true,
    soundEnabled: true,
    onToggleSound: vi.fn(),
    onOpenNotificationSettings: vi.fn(),
    onOpenHelp: vi.fn(),
    onOpenCalendar: vi.fn(),
    onOpenAnalytics: vi.fn(),
    ...overrides,
  };
  const view = render(<Header {...props} />);
  return { props, view };
};

describe('Header', () => {
  it('shows the app name with Czech diacritics', () => {
    renderHeader();
    expect(screen.getByRole('heading', { name: 'Třídič' })).toBeTruthy();
    expect(screen.queryByText('Tridic')).toBeNull();
  });

  it('has no visible technical shortcut texts', () => {
    renderHeader();
    for (const text of ['Cal', 'Stats', 'Bell', 'Sound', 'Mute']) {
      expect(screen.queryByText(text)).toBeNull();
    }
  });

  it('exposes Czech accessible names on the desktop controls', () => {
    renderHeader();
    expect(screen.getAllByRole('button', { name: 'Kalendář svozů' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Nápověda' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Statistiky' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nastavení upozornění' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vypnout zvuk' })).toBeTruthy();
  });

  it('labels the sound toggle by its next action', () => {
    renderHeader({ soundEnabled: false });
    expect(screen.getByRole('button', { name: 'Zapnout zvuk' })).toBeTruthy();
  });

  it('keeps a standalone calendar button next to the mobile menu', () => {
    renderHeader();
    // Desktop and mobile calendar buttons both exist in the DOM (visibility is CSS-only).
    expect(screen.getAllByRole('button', { name: 'Kalendář svozů' })).toHaveLength(2);
  });

  it('opens the mobile menu and renames the toggle to close', () => {
    renderHeader();
    const toggle = screen.getByRole('button', { name: 'Otevřít nabídku' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Zavřít nabídku' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upozornění' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stáhnout aplikaci' })).toBeTruthy();
  });

  it('closes the menu with Escape', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Otevřít nabídku' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Upozornění' })).toBeNull();
  });

  it('closes the menu on click outside', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Otevřít nabídku' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: 'Upozornění' })).toBeNull();
  });

  it('closes the menu after choosing an item', () => {
    const { props } = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Otevřít nabídku' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upozornění' }));
    expect(props.onOpenNotificationSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Upozornění' })).toBeNull();
  });

  it('never offers an API key control', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Otevřít nabídku' }));
    expect(screen.queryByRole('button', { name: /api/i })).toBeNull();
    expect(screen.queryByText(/api/i)).toBeNull();
  });

  it('shows the offline banner with correct Czech text', () => {
    renderHeader({ isOnline: false });
    expect(screen.getByRole('status').textContent).toBe('Režim offline: funguje lokální databáze.');
  });
});
