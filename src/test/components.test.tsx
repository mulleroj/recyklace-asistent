import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import SearchBox from '../components/ui/SearchBox';
import SuggestionList from '../components/waste/SuggestionList';
import UpdatePrompt from '../components/ui/UpdatePrompt';
import CalendarModal from '../components/schedule/CalendarModal';
import CollectionAlert from '../components/schedule/CollectionAlert';
import AddWasteModal from '../components/waste/AddWasteModal';
import { WasteCategory } from '../../types';

describe('component smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const stubNotification = (permission: NotificationPermission) => {
    const requestPermission = vi.fn();
    const notification = vi.fn();
    Object.defineProperty(notification, 'permission', {
      value: permission,
      configurable: true,
    });
    Object.defineProperty(notification, 'requestPermission', {
      value: requestPermission,
      configurable: true,
    });
    vi.stubGlobal('Notification', notification);
    return { notification, requestPermission };
  };

  it('does not submit an empty query', () => {
    const onSearch = vi.fn();
    render(
      <SearchBox
        query="   "
        setQuery={() => undefined}
        onSearch={onSearch}
        onVoice={() => undefined}
        isListening={false}
        loading={false}
        error={null}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /hledat/i }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('keeps voice entry and removes camera search controls', () => {
    render(
      <SearchBox
        query="lahev"
        setQuery={() => undefined}
        onSearch={() => undefined}
        onVoice={() => undefined}
        isListening={false}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByRole('button', { name: /hlas/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /foto|camera|vyfot/i })).toBeNull();
  });

  it('suggestions do not offer an AI action', () => {
    render(
      <SuggestionList
        suggestions={[{ name: 'PET lahev', category: 'plast' }]}
        onSelect={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByText(/možná myslíte/i)).toBeTruthy();
    expect(screen.queryByText(/ai/i)).toBeNull();
  });

  it('shows an honest not-found state and never calls fetch while searching', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/napi/i), { target: { value: 'zzzz-neexistuje-odpad' } });
    fireEvent.click(screen.getByRole('button', { name: /hledat/i }));
    expect(screen.getByText(/tuto položku zatím v databázi nemám/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /přidat vlastní položku/i })).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('closes update prompt without duplicate action', () => {
    const onDismiss = vi.fn();
    render(<UpdatePrompt onUpdate={() => undefined} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /pozd/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('mounting CollectionAlert never requests notification permission', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T12:00:00+01:00'));
    const { requestPermission } = stubNotification('default');

    render(<CollectionAlert />);

    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('CollectionAlert can show a notification when permission is already granted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T12:00:00+01:00'));
    const { notification } = stubNotification('granted');

    render(<CollectionAlert />);

    expect(notification).toHaveBeenCalledTimes(1);
  });

  it('exposes accessible calendar controls', () => {
    const onClose = vi.fn();
    render(<CalendarModal isOpen onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: /kalendář svozů/i })).toBeTruthy();
    const heading = screen.getByRole('heading', { name: /kalendář svozů/i });
    expect(heading.getAttribute('id')).toBe('collection-calendar-title');

    fireEvent.click(screen.getByRole('button', { name: 'Další měsíc' }));
    expect(screen.getByText(/srpen/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Předchozí měsíc' }));
    expect(screen.getByText(/červenec/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Zavřít kalendář' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Escape closing the calendar', () => {
    const onClose = vi.fn();
    render(<CalendarModal isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('labels AddWasteModal fields and keeps submit working', () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<AddWasteModal isOpen onAdd={onAdd} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: /přidat do databáze/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/název odpadu/i), { target: { value: 'Auditní kelímek' } });
    fireEvent.change(screen.getByLabelText(/kategorie/i), { target: { value: WasteCategory.PLAST } });
    fireEvent.change(screen.getByLabelText(/poznámka/i), { target: { value: 'Čistý obal' } });
    expect(screen.getByRole('button', { name: /navrhnout kategorii offline/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^přidat$/i }));

    expect(onAdd).toHaveBeenCalledWith({
      name: 'Auditní kelímek',
      category: WasteCategory.PLAST,
      note: 'Čistý obal',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('focuses AddWaste name input and restores focus after Escape', async () => {
    render(<App />);
    const openButton = screen.getByRole('button', { name: /přidat vlastní odpad do databáze/i });

    openButton.focus();
    fireEvent.click(openButton);

    const nameInput = screen.getByLabelText(/název odpadu/i);
    await waitFor(() => expect(document.activeElement).toBe(nameInput));

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(document.activeElement).toBe(openButton));
  });

  it('restores focus after cancelling AddWasteModal', async () => {
    render(<App />);
    const openButton = screen.getByRole('button', { name: /přidat vlastní odpad do databáze/i });

    openButton.focus();
    fireEvent.click(openButton);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/název odpadu/i)));
    fireEvent.click(screen.getByRole('button', { name: /zrušit/i }));

    await waitFor(() => expect(document.activeElement).toBe(openButton));
  });
});
