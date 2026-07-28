import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import SearchBox from '../components/ui/SearchBox';
import SuggestionList from '../components/waste/SuggestionList';
import UpdatePrompt from '../components/ui/UpdatePrompt';

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
});
