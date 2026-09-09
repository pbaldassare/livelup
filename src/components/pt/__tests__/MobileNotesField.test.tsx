import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNotesField } from '@/components/pt/MobileNotesField';

describe('MobileNotesField', () => {
  it('accetta più righe e non è un input a riga singola', () => {
    const onChange = vi.fn();
    render(
      <MobileNotesField
        value="focus tecnica"
        onChange={onChange}
        placeholder="Es. focus tecnica o stop a un tetto"
      />,
    );

    const field = screen.getByPlaceholderText('Es. focus tecnica o stop a un tetto');
    expect(field.tagName).toBe('TEXTAREA');
    fireEvent.change(field, { target: { value: 'riga 1\nriga 2' } });
    expect(onChange).toHaveBeenCalledWith('riga 1\nriga 2');
  });

  it('la X svuota le note', () => {
    const onChange = vi.fn();
    render(<MobileNotesField value="da cancellare" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancella note' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
