-- =====================================================
-- BLOG & Q&A — contenuti demo pubblicati (idempotente per slug)
-- Articoli + curiosità attribuiti ai PT demo esistenti; alcune voci
-- attribuite a un professionista (professional_profiles) se presente,
-- tramite professional_profile_id + author_kind, senza account proprio.
-- =====================================================

DO $$
DECLARE
  v_pt_ids UUID[];
  v_pt_count INT;
  v_nutri RECORD;
  v_fisio RECORD;
BEGIN
  -- Autori PT: preferisci i 3 PT demo noti, altrimenti qualunque PT attivo
  SELECT COALESCE(
    (SELECT array_agg(id ORDER BY email) FROM (
      SELECT public.get_auth_user_id_by_email(e) AS id, e AS email
      FROM unnest(ARRAY[
        'elena.vitale.pt@fitplatform.com',
        'davide.russo.pt@fitplatform.com',
        'chiara.lombardi.pt@fitplatform.com'
      ]) AS e
    ) x WHERE x.id IS NOT NULL),
    '{}'::UUID[]
  ) INTO v_pt_ids;

  IF array_length(v_pt_ids, 1) IS NULL OR array_length(v_pt_ids, 1) = 0 THEN
    SELECT COALESCE(array_agg(ur.user_id), '{}'::UUID[]) INTO v_pt_ids
    FROM (
      SELECT user_id FROM public.user_roles WHERE role = 'pt' ORDER BY user_id LIMIT 3
    ) ur;
  END IF;

  v_pt_count := COALESCE(array_length(v_pt_ids, 1), 0);

  IF v_pt_count = 0 THEN
    RAISE NOTICE 'Blog & Q&A seed: nessun utente PT trovato, salto il seed dei contenuti PT.';
  ELSE
    -- ARTICOLI
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'programmazione-settimanale-efficace') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (
        v_pt_ids[1],
        'Come impostare una programmazione settimanale efficace',
        E'Una buona programmazione settimanale bilancia stimolo e recupero. Il primo passo è definire l''obiettivo (forza, ipertrofia, dimagrimento) e distribuire i gruppi muscolari su 3-5 sedute, evitando di allenare due volte di fila lo stesso distretto senza recupero adeguato.\n\nStruttura consigliata per un principiante:\n- Lunedì: Full body A\n- Mercoledì: Full body B\n- Venerdì: Full body C\n\nAumenta il volume solo quando riesci a completare tutte le serie con buona tecnica. La progressione va monitorata settimana per settimana, non seduta per seduta.',
        'programmazione-settimanale-efficace',
        ARRAY['programmazione', 'allenamento', 'principianti'],
        'article', 'published', 'pt', now()
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'errori-comuni-tecnica-squat') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (
        v_pt_ids[1 + (1 % v_pt_count)],
        '5 errori comuni nella tecnica di squat',
        E'Lo squat è uno degli esercizi più completi, ma anche uno dei più soggetti a errori tecnici:\n\n1. Ginocchia che collassano verso l''interno\n2. Tallone che si alza da terra\n3. Schiena che si arrotonda in buca\n4. Discesa troppo rapida e non controllata\n5. Range di movimento incompleto per usare più carico\n\nCorreggere questi punti richiede spesso di scaricare il peso e lavorare su mobilità di anca e caviglia prima di tornare a carichi elevati.',
        'errori-comuni-tecnica-squat',
        ARRAY['squat', 'tecnica', 'forza'],
        'article', 'published', 'pt', now()
      );
    END IF;

    -- CURIOSITÀ
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'muscolo-piu-forte-corpo-umano') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (
        v_pt_ids[1 + (2 % v_pt_count)],
        'Lo sapevi? Qual è il muscolo più forte del corpo umano',
        E'In rapporto al peso, il masetere (muscolo della mandibola) è considerato il muscolo più forte: può generare una pressione di oltre 90 kg sui molari. In termini di forza assoluta, invece, il quadricipite e il grande gluteo restano i muscoli più potenti del corpo, fondamentali in movimenti come squat e sprint.',
        'muscolo-piu-forte-corpo-umano',
        ARRAY['curiosità', 'anatomia'],
        'curiosity', 'published', 'pt', now()
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'quanto-tempo-primi-risultati-palestra') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (
        v_pt_ids[1],
        'Quanto tempo serve per vedere i primi risultati in palestra?',
        E'I primi adattamenti neuromuscolari (più forza, più controllo del movimento) si notano già dopo 2-3 settimane di allenamento costante. I cambiamenti visibili nella composizione corporea richiedono in genere 6-8 settimane con allenamento regolare e alimentazione coerente con l''obiettivo. La costanza conta più dell''intensità di ogni singola sessione.',
        'quanto-tempo-primi-risultati-palestra',
        ARRAY['curiosità', 'risultati', 'motivazione'],
        'curiosity', 'published', 'pt', now()
      );
    END IF;

    -- Q&A
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'quante-volte-settimana-allenarsi-principianti') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (
        v_pt_ids[1 + (1 % v_pt_count)],
        'Quante volte a settimana dovrei allenarmi da principiante?',
        E'Per chi inizia, 3 sedute a settimana (a giorni alterni) sono l''ideale: bastano per creare uno stimolo di crescita costante lasciando tempo di recupero sufficiente tra le sessioni. Dopo 2-3 mesi, quando il corpo si è adattato, si può valutare di salire a 4 sedute suddividendo meglio i gruppi muscolari.',
        'quante-volte-settimana-allenarsi-principianti',
        ARRAY['q&a', 'principianti', 'frequenza'],
        'qa', 'published', 'pt', now()
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'doms-dolori-muscolari-normali') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (
        v_pt_ids[1 + (2 % v_pt_count)],
        'È normale avere dolori muscolari (DOMS) dopo ogni allenamento?',
        E'Un minimo di indolenzimento (DOMS) nelle 24-48h successive è normale, soprattutto con esercizi nuovi o carichi aumentati. Non è però un indicatore di qualità dell''allenamento: con il tempo, a parità di stimolo, i DOMS tendono a ridursi. Se il dolore è molto intenso, localizzato in modo asimmetrico o dura più di 4-5 giorni, meglio consultare il PT o un professionista sanitario.',
        'doms-dolori-muscolari-normali',
        ARRAY['q&a', 'recupero', 'doms'],
        'qa', 'published', 'pt', now()
      );
    END IF;
  END IF;

  -- =====================================================
  -- Contenuti attribuiti a professionisti (se presenti in professional_profiles)
  -- =====================================================
  SELECT id, first_name, last_name INTO v_nutri
  FROM public.professional_profiles
  WHERE profession_type = 'nutrizionista'
  ORDER BY created_at
  LIMIT 1;

  IF v_nutri.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blog_posts WHERE slug = 'periodizzazione-nutrizionale-basi'
  ) THEN
    INSERT INTO public.blog_posts (
      pt_user_id, professional_profile_id, title, content, slug, tags, post_type, status, author_kind, published_at
    )
    SELECT
      pp.user_id, pp.id,
      'Alimentazione e allenamento: le basi della periodizzazione nutrizionale',
      E'La periodizzazione nutrizionale consiste nell''adattare l''alimentazione alle fasi dell''allenamento. Nelle fasi di carico (forza/ipertrofia) serve un surplus calorico moderato con adeguato apporto proteico (1.6-2.2 g/kg); nelle fasi di definizione un deficit contenuto per preservare la massa muscolare. Non esiste una dieta unica: la periodizzazione va sincronizzata con gli obiettivi e il calendario di allenamento del PT.',
      'periodizzazione-nutrizionale-basi',
      ARRAY['nutrizione', 'periodizzazione', 'alimentazione'],
      'article', 'published', 'nutrizionista', now()
    FROM public.professional_profiles pp WHERE pp.id = v_nutri.id;
  END IF;

  SELECT id, first_name, last_name INTO v_fisio
  FROM public.professional_profiles
  WHERE profession_type = 'fisioterapista'
  ORDER BY created_at
  LIMIT 1;

  IF v_fisio.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blog_posts WHERE slug = 'sonno-crescita-muscolare-ruolo'
  ) THEN
    INSERT INTO public.blog_posts (
      pt_user_id, professional_profile_id, title, content, slug, tags, post_type, status, author_kind, published_at
    )
    SELECT
      pp.user_id, pp.id,
      'Il ruolo del sonno nella crescita muscolare',
      E'Durante il sonno profondo il corpo rilascia la maggior parte dell''ormone della crescita e ripara i tessuti sollecitati in allenamento. Dormire meno di 6 ore a notte per periodi prolungati è associato a peggior recupero, più infortuni e minore forza percepita. 7-9 ore di sonno di qualità sono parte integrante del piano di allenamento, non un dettaglio secondario.',
      'sonno-crescita-muscolare-ruolo',
      ARRAY['curiosità', 'recupero', 'sonno'],
      'curiosity', 'published', 'fisioterapista', now()
    FROM public.professional_profiles pp WHERE pp.id = v_fisio.id;
  END IF;

  IF v_fisio.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blog_posts WHERE slug = 'allenarsi-con-schiena-sensibile'
  ) THEN
    INSERT INTO public.blog_posts (
      pt_user_id, professional_profile_id, title, content, slug, tags, post_type, status, author_kind, published_at
    )
    SELECT
      pp.user_id, pp.id,
      'Posso allenarmi anche se ho la schiena sensibile?',
      E'Nella maggior parte dei casi sì, ma con alcuni adattamenti: evita carichi assiali elevati (es. squat/stacchi pesanti) fino a stabilizzare la sintomatologia, privilegia esercizi a catena chiusa e lavoro di core stability, e monitora la risposta al dolore nelle 24h successive. Se il dolore è acuto, irradia lungo la gamba o è comparso da un trauma, consulta prima un professionista sanitario per un percorso personalizzato insieme al tuo PT.',
      'allenarsi-con-schiena-sensibile',
      ARRAY['q&a', 'schiena', 'infortuni'],
      'qa', 'published', 'fisioterapista', now()
    FROM public.professional_profiles pp WHERE pp.id = v_fisio.id;
  END IF;

  RAISE NOTICE 'Blog & Q&A seed completato (PT trovati: %, nutrizionista: %, fisioterapista: %)',
    v_pt_count, (v_nutri.id IS NOT NULL), (v_fisio.id IS NOT NULL);
END $$;
