# Livelapp — Prompt Lovable: chat senza connessione

Incolla il blocco sotto nella chat Lovable del progetto collegato a questo repo.
Serve perché preview/produzione parlano ancora del Cloud dove `can_chat_with` accetta solo connessioni `active`/`pending`. Senza questo SQL, **Invia un messaggio** fallisce con RLS su `chats`.

Non toccare `src/integrations/supabase/client.ts`, `types.ts`, `.env`.

---

## PROMPT DA INCOLLARE IN LOVABLE

```text
Sei Lovable Cloud per Livelapp.

OBIETTIVO
Applica SUBITO la migration della chat 1:1 senza connessione sul backend COLLEGATO a questa preview/produzione (quello di VITE_SUPABASE_URL, anche se è il Cloud vecchio). Senza questo SQL il pulsante "Invia un messaggio" dà: new row violates row-level security policy for table "chats".

REGOLE
1. Esegui il SQL qui sotto così com'è, in una sola volta. È idempotente (CREATE OR REPLACE + DROP POLICY IF EXISTS).
2. Non creare una connessione pending. La chat di domanda è separata da "Richiedi connessione".
3. Non toccare client.ts, types.ts, .env.
4. File canonico nel repo: supabase/migrations/20260919193000_chat_without_connection.sql
5. Alla fine conferma: funzione can_chat_with aggiornata, policy INSERT su chats ricreata, nessun errore.

SQL DA ESEGUIRE ORA:

-- Chat 1:1 anche senza connessione PT–atleta
CREATE OR REPLACE FUNCTION public.can_chat_with(_pt_user_id UUID, _atleta_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.pt_atleta_connections
      WHERE pt_user_id = _pt_user_id
        AND atleta_user_id = _atleta_user_id
        AND status IN ('active', 'pending')
    )
    OR (
      auth.uid() = _atleta_user_id
      AND public.has_role(_pt_user_id, 'pt')
      AND public.has_role(_atleta_user_id, 'atleta')
      AND EXISTS (
        SELECT 1
        FROM public.pt_profiles p
        WHERE p.user_id = _pt_user_id
          AND COALESCE(p.is_active, true)
          AND p.status IS DISTINCT FROM 'sospeso'::public.pt_status
      )
    );
$$;

COMMENT ON FUNCTION public.can_chat_with(uuid, uuid) IS
  'True se PT e atleta hanno connessione active/pending, oppure se l''atleta apre una chat di domanda verso un PT non sospeso.';

GRANT EXECUTE ON FUNCTION public.can_chat_with(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Connected users can create chat" ON public.chats;
CREATE POLICY "Connected users can create chat"
  ON public.chats FOR INSERT
  WITH CHECK (
    (auth.uid() = pt_user_id OR auth.uid() = atleta_user_id)
    AND public.can_chat_with(pt_user_id, atleta_user_id)
  );

VERIFICA
Dopo l'apply, da atleta sul profilo di un Professionista non collegato: tocca "Invia un messaggio" — deve aprire la chat, non mostrare errore RLS.
```
