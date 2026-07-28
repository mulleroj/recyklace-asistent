import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchBox from '../components/ui/SearchBox';
import UpdatePrompt from '../components/ui/UpdatePrompt';

describe('component smoke', () => {
  it('does not submit an empty query', () => {
    const onSearch = vi.fn();
    render(
      <SearchBox
        query="   "
        setQuery={() => undefined}
        onSearch={onSearch}
        onCamera={() => undefined}
        onVoice={() => undefined}
        isListening={false}
        loading={false}
        isOnline
        error={null}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /hledat/i }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('closes update prompt without duplicate action', () => {
    const onDismiss = vi.fn();
    render(<UpdatePrompt onUpdate={() => undefined} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /pozd/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
