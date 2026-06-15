import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks ---
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'atleta-1' } }),
}));

// Build a fluent supabase mock that resolves with the rows we feed it per test.
let documentsRows: any[] = [];
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: () => {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          not: () => Promise.resolve({ data: documentsRows, error: null }),
        };
        return builder;
      },
    },
  };
});

import { AtletaDocumentExpiryBanner } from '@/components/app/AtletaDocumentExpiryBanner';

function renderBanner() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AtletaDocumentExpiryBanner />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('AtletaDocumentExpiryBanner', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    documentsRows = [];
  });

  it('non renderizza nulla se non ci sono documenti scaduti o in scadenza', async () => {
    documentsRows = [
      { id: '1', title: 'Visita medica', expiry_date: isoDaysFromNow(120) },
    ];
    const { container } = renderBanner();
    // attende il settle della query
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('mostra documenti SCADUTI con priorità', async () => {
    documentsRows = [
      { id: '1', title: 'Vecchia visita', expiry_date: isoDaysFromNow(-5) },
      { id: '2', title: 'Assicurazione', expiry_date: isoDaysFromNow(10) },
    ];
    renderBanner();
    expect(await screen.findByText(/1 documento scaduto/i)).toBeInTheDocument();
    expect(screen.getByText(/Vecchia visita/)).toBeInTheDocument();
  });

  it('mostra documenti in scadenza nei 30 giorni quando non ci sono scaduti', async () => {
    documentsRows = [
      { id: '1', title: 'Certificato', expiry_date: isoDaysFromNow(15) },
      { id: '2', title: 'Vecchio', expiry_date: isoDaysFromNow(-200) }, // anche scaduto: priorità
    ];
    renderBanner();
    // perché c'è uno scaduto, il banner mostra la riga scaduto
    expect(await screen.findByText(/1 documento scaduto/i)).toBeInTheDocument();
  });

  it('esclude correttamente documenti oltre i 30 giorni', async () => {
    documentsRows = [
      { id: '1', title: 'Lontano', expiry_date: isoDaysFromNow(45) },
      { id: '2', title: 'Vicino', expiry_date: isoDaysFromNow(20) },
    ];
    renderBanner();
    expect(await screen.findByText(/1 documento in scadenza/i)).toBeInTheDocument();
  });

  it('naviga a /app/documenti al click', async () => {
    documentsRows = [
      { id: '1', title: 'Prossima visita', expiry_date: isoDaysFromNow(7) },
    ];
    renderBanner();
    const btn = await screen.findByRole('button');
    fireEvent.click(btn);
    expect(navigateMock).toHaveBeenCalledWith('/app/documenti');
  });
});
