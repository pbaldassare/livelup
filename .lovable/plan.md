## Problema
La creazione gruppi fallisce perché nel database Lovable Cloud non esistono le tabelle `public.groups`, `group_disciplines`, `group_members`, `group_messages`. Le migration sono presenti nel repo ma non sono mai state applicate.

## Piano
1. Applicare la migration `supabase/migrations/20260703140000_groups.sql`:
   - crea enum: `group_visibility`, `group_status`, `group_member_role`, `group_member_status`, `group_channel`
   - crea tabelle `groups`, `group_disciplines`, `group_members`, `group_messages` con FK, indici, GRANT su `authenticated`/`service_role`
   - abilita RLS + policy (owner, membri, admin) e trigger di supporto
   - crea bucket storage `group-images` se referenziato
2. Applicare la migration `supabase/migrations/20260703150000_more_disciplines.sql` per popolare/estendere `pt_types` con le discipline extra usate dal picker.
3. Verificare post-migration con query:
   - `to_regclass('public.groups')` non null
   - `SELECT count(*) FROM pt_types`
4. La rigenerazione dei tipi Supabase (`src/integrations/supabase/types.ts`) avviene automaticamente da Lovable dopo l'approvazione della migration — nessuna modifica manuale al file.
5. Nessuna modifica al codice applicativo: `src/lib/api/groups.ts`, `GroupForm`, `GroupCreatePage` sono già allineati allo schema.

## Verifica finale
- Ricaricare la PWA e creare un gruppo di test dalla pagina `/app/groups/new` → deve riuscire e reindirizzare al dettaglio.

## Note tecniche
Le migration verranno lanciate come singolo blocco tramite lo strumento migration (richiede la tua approvazione). Se una delle enum o tabelle risultasse già parzialmente creata da un tentativo precedente, la migration verrà adattata con `IF NOT EXISTS` / drop condizionale prima di rieseguirla.
