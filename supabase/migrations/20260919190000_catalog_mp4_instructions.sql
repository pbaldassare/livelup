-- Tecnica catalogo Drive: due righe vere, toglie «Video dimostrativo in arrivo».
-- Solo esercizi pubblici con MP4 in storage. Non tocca testi custom dei PT.

UPDATE public.exercises AS e
SET instructions = v.instructions
FROM (
  VALUES
  ('Back lever · Advanced', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Back lever · Advanced Pulls', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Posizione intermedia: allunga più del tuck senza arrivare al full; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Back lever · Full', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Corpo completamente teso in linea.$instr$),
  ('Back lever · Full Pulls', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Corpo completamente teso in linea; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Back lever · One Leg', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato.$instr$),
  ('Back lever · One Leg Advanced', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato; posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Back lever · One Leg Advanced Pulls', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato; posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Back lever · One Leg Pulls', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Back lever · Skin The Cat', $instr$Dalla sbarra, porta le gambe attraverso le braccia e ruota il bacino fino alla posizione inversa, con scapole attive.
Controlla salita e ritorno: non crollare sulle spalle e tieni i gomiti morbidi ma stabili.$instr$),
  ('Back lever · Straddle', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('Back lever · Straddle Pulls', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Gambe aperte in straddle per ridurre il braccio di leva; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Back lever · Tuck', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Ginocchia raccolte al petto per accorciare la leva.$instr$),
  ('Back lever · Tuck Pulls', $instr$Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.
Ginocchia raccolte al petto per accorciare la leva; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Bar muscle up', $instr$Tira il petto sopra la sbarra e transisci in dip in un unico movimento. Core chiuso, polsi sopra la sbarra, non aprire le spalle in transizione.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Bar muscle up · Box Assisted', $instr$Usa il box per aiutare la transizione: tira, porta i polsi sopra la sbarra e finisci in dip.
Meno spinta dalle gambe possibile: il petto deve passare sopra la sbarra, non di lato.$instr$),
  ('Bar muscle up · Chest To Bar Pull Ups', $instr$Tira fino a toccare la sbarra col petto, non solo col mento.
Chiudi le scapole in alto e prepara la transizione del muscle-up senza dondolare.$instr$),
  ('Bar muscle up · L Sit', $instr$Esegui il muscle-up tenendo le gambe tese in L per tutto il movimento.
Core chiuso e transizione secca: le gambe non devono aiutarti con uno slancio.$instr$),
  ('Core · Crunch', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Stacca le scapole da terra arrotolando il busto, non tirando il collo.$instr$),
  ('Core · Dragon Flag Full', $instr$Dalla panca o dalla sbarra, solleva il corpo teso in linea dalle spalle ai piedi.
Scendi centimetro per centimetro senza spezzare le anche o il petto.$instr$),
  ('Core · Dragon Flag One Leg', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Una gamba tesa e l’altra raccolta, bacino squadrato; corpo in leva sulle spalle: anche e petto restano in linea.$instr$),
  ('Core · Dynamic Dragon Flag Full', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Corpo completamente teso in linea; corpo in leva sulle spalle: anche e petto restano in linea.$instr$),
  ('Core · Dynamic Dragon Flag One Leg', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Una gamba tesa e l’altra raccolta, bacino squadrato; corpo in leva sulle spalle: anche e petto restano in linea.$instr$),
  ('Core · Dynamic Superman', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Stacca petto e gambe insieme, sguardo a terra, niente iperestensione del collo; il movimento è continuo ma lento: niente rimbalzo in fondo.$instr$),
  ('Core · High Plank', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Braccia tese, corpo in linea, non lasciare crollare il bacino.$instr$),
  ('Core · Hollow Position', $instr$Sulla schiena, stacca spalle e gambe da terra tenendo la zona lombare incollata.
Braccia lunghe, bacino in retroversione: se la schiena stacca, accorcia le leve.$instr$),
  ('Core · One Arm Plank', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Un appoggio solo: bacino squadrato, non ruotare le spalle.$instr$),
  ('Core · Plank', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Braccia tese, corpo in linea, non lasciare crollare il bacino.$instr$),
  ('Core · Reverse Crunch', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Porta le ginocchia verso il petto staccando il sacro, senza slancio.$instr$),
  ('Core · Seated Full Leg Raises', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Corpo completamente teso in linea; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Core · Seated One Leg Raises', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Una gamba tesa e l’altra raccolta, bacino squadrato; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Core · Side Plank', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Spalla sopra il gomito o la mano, anche allineate, sguardo avanti.$instr$),
  ('Core · Sit Up', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Sali vertebra per vertebra e scendi con lo stesso controllo.$instr$),
  ('Core · Straddle Leg Raises', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Gambe aperte in straddle per ridurre il braccio di leva; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Core · Straddle One Leg Raises', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Gambe aperte in straddle per ridurre il braccio di leva; una gamba tesa e l’altra raccolta, bacino squadrato.$instr$),
  ('Core · Superman', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Stacca petto e gambe insieme, sguardo a terra, niente iperestensione del collo.$instr$),
  ('Core · Toes To Bar', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Porta le gambe su col bacino, non con uno slancio di schiena.$instr$),
  ('Core · Toes To Bar Cross Body Knee To Elbow', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Porta le gambe su col bacino, non con uno slancio di schiena.$instr$),
  ('Core · Toes To Bar Elbow To Knee', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Porta le gambe su col bacino, non con uno slancio di schiena.$instr$),
  ('Core · Toes To Bar To L', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Porta le gambe su col bacino, non con uno slancio di schiena.$instr$),
  ('Core · Toes To Bar Tuck', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Ginocchia raccolte al petto per accorciare la leva; porta le gambe su col bacino, non con uno slancio di schiena.$instr$),
  ('Core · Tuck V Ups', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Ginocchia raccolte al petto per accorciare la leva; mani e piedi si cercano in alto: schiena bassa sempre a terra nella partenza.$instr$),
  ('Core · V Ups', $instr$Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.
Mani e piedi si cercano in alto: schiena bassa sempre a terra nella partenza.$instr$),
  ('Dip · Bar Dips', $instr$Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Dip · Dips', $instr$Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Dip · Elevated Foot Dips', $instr$Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Dip · Foot Assisted Dips', $instr$Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma.$instr$),
  ('Dip · Ring Dips', $instr$Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra.$instr$),
  ('Dip · Russian Dips', $instr$Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.
Passa dalla posizione raccolta a quella tesa senza perdere le spalle.$instr$),
  ('Dip · Supinated Ring Dips', $instr$Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra; presa supina: tieni i gomiti davanti e le spalle basse.$instr$),
  ('Dragon press · Advanced', $instr$Dal supporto, porta il corpo in avanti fino a sollevare le gambe a braccia tese. Scapole protratte e bacino chiuso.
Posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Dragon press · Full', $instr$Dal supporto, porta il corpo in avanti fino a sollevare le gambe a braccia tese. Scapole protratte e bacino chiuso.
Corpo completamente teso in linea.$instr$),
  ('Dragon press · One Leg', $instr$Dal supporto, porta il corpo in avanti fino a sollevare le gambe a braccia tese. Scapole protratte e bacino chiuso.
Una gamba tesa e l’altra raccolta, bacino squadrato.$instr$),
  ('Dragon press · Straddle', $instr$Dal supporto, porta il corpo in avanti fino a sollevare le gambe a braccia tese. Scapole protratte e bacino chiuso.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('Dragon press · Tuck', $instr$Dal supporto, porta il corpo in avanti fino a sollevare le gambe a braccia tese. Scapole protratte e bacino chiuso.
Ginocchia raccolte al petto per accorciare la leva.$instr$),
  ('Front lever · Advanced', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Front lever · Advanced Pull Up', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Posizione intermedia: allunga più del tuck senza arrivare al full; esegui la trazione restando nella posizione della skill.$instr$),
  ('Front lever · Advanced Pulls', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Posizione intermedia: allunga più del tuck senza arrivare al full; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Front lever · Advanced Raises', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Posizione intermedia: allunga più del tuck senza arrivare al full; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Front lever · Full', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Corpo completamente teso in linea.$instr$),
  ('Front lever · Full Pull Up', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Corpo completamente teso in linea; esegui la trazione restando nella posizione della skill.$instr$),
  ('Front lever · Full Pulls', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Corpo completamente teso in linea; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Front lever · Full Raises', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Corpo completamente teso in linea; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Front lever · Ice Cream Maker', $instr$Dalla sbarra, passa in modo controllato da un chin-up alla front lever e torna su, senza slancio.
Tieni il bacino chiuso e le scapole depresse per tutta la transizione.$instr$),
  ('Front lever · One Leg', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato.$instr$),
  ('Front lever · One Leg Pull Up', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato; esegui la trazione restando nella posizione della skill.$instr$),
  ('Front lever · One Leg Pulls', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Front lever · One Leg Raises', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Front lever · Pulses', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Piccole oscillazioni controllate nella posizione, senza perdere la linea.$instr$),
  ('Front lever · Straddle', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('Front lever · Straddle Pull Up', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Gambe aperte in straddle per ridurre il braccio di leva; esegui la trazione restando nella posizione della skill.$instr$),
  ('Front lever · Straddle Raises', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Gambe aperte in straddle per ridurre il braccio di leva; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Front lever · Touch Advanced', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Posizione intermedia: allunga più del tuck senza arrivare al full; arriva al tocco e torna, senza rimbalzare.$instr$),
  ('Front lever · Touch Full', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Corpo completamente teso in linea; arriva al tocco e torna, senza rimbalzare.$instr$),
  ('Front lever · Touch One Leg Advanced', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Una gamba tesa e l’altra raccolta, bacino squadrato; posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Front lever · Touch Straddle', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Gambe aperte in straddle per ridurre il braccio di leva; arriva al tocco e torna, senza rimbalzare.$instr$),
  ('Front lever · Tuck', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Ginocchia raccolte al petto per accorciare la leva.$instr$),
  ('Front lever · Tuck Pulls', $instr$Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.
Ginocchia raccolte al petto per accorciare la leva; dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('Handstand', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Handstand · Back To Wall Handstand Alternating Leg Lifts', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Schiena o L alla parete per sentire la verticale senza cadere; alterna le gambe senza perdere la spinta delle spalle.$instr$),
  ('Handstand · Diagonal Wall Lean', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Usa la parete solo come riferimento, non come appoggio passivo; inclinazione diagonale: senti le spalle senza arrivare in verticale piena.$instr$),
  ('Handstand · Frog Stand', $instr$Appoggia le mani, piega i gomiti e porta le ginocchia all’esterno delle braccia.
Sposta il peso in avanti fino a staccare i piedi, guardando tra le mani.$instr$),
  ('Handstand · Half Lay', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Mezza piega delle gambe, bacino ancora in linea.$instr$),
  ('Handstand · L Handstand Assisted', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma; forma una L: piedi al muro, spalle sopra i polsi.$instr$),
  ('Handstand · L Handstand Kick Ups', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Slancio controllato: arriva in equilibrio, non oltrepassare; forma una L: piedi al muro, spalle sopra i polsi.$instr$),
  ('Handstand · One Leg', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Una gamba tesa e l’altra raccolta, bacino squadrato.$instr$),
  ('Handstand · Pike Position', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Bacino alto, spalle sopra le mani: più verticale sei, più lavori le spalle.$instr$),
  ('Handstand · Straddle To Full', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Gambe aperte in straddle per ridurre il braccio di leva; corpo completamente teso in linea.$instr$),
  ('Handstand · Tripod', $instr$Testa e mani a triangolo, ginocchia sulle braccia, poi estendi le gambe verso l’alto.
Spingi il pavimento con i palmi e tieni il collo stabile, senza crollare sulla testa.$instr$),
  ('Handstand · V Position', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Bacino alto, spalle sopra le mani: più verticale sei, più lavori le spalle.$instr$),
  ('Handstand · Wall Facing', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Viso alla parete: talloni vicini al muro, spalle lontane.$instr$),
  ('Handstand · Wall Facing Handstand Alternating Leg Lifts', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Viso alla parete: talloni vicini al muro, spalle lontane; alterna le gambe senza perdere la spinta delle spalle.$instr$),
  ('Handstand · Wall Facing Handstand Straddlemp4', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Viso alla parete: talloni vicini al muro, spalle lontane.$instr$),
  ('Handstand · Wall Facing Handstand Toe Pulls', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea; viso alla parete: talloni vicini al muro, spalle lontane.$instr$),
  ('Handstand · Wall L', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Schiena o L alla parete per sentire la verticale senza cadere; forma una L: piedi al muro, spalle sopra i polsi.$instr$),
  ('Handstand · Wall L Handstand Kick Ups', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Schiena o L alla parete per sentire la verticale senza cadere; slancio controllato: arriva in equilibrio, non oltrepassare.$instr$),
  ('Handstand · Wall Pike Position', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Usa la parete solo come riferimento, non come appoggio passivo; bacino alto, spalle sopra le mani: più verticale sei, più lavori le spalle.$instr$),
  ('Handstand · Wall Tuck Handstand Kick Ups', $instr$Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.
Ginocchia raccolte al petto per accorciare la leva; usa la parete solo come riferimento, non come appoggio passivo.$instr$),
  ('Hspu · Back To Wall', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Schiena o L alla parete per sentire la verticale senza cadere.$instr$),
  ('Hspu · Back To Wall On Parallettes', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Schiena o L alla parete per sentire la verticale senza cadere; sulle parallele, polsi neutri e spalle lontane dalle orecchie.$instr$),
  ('Hspu · Eccentric', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Fase negativa lenta: 3–5 secondi, senza crollare.$instr$),
  ('Hspu · On Prallelettes', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Sulle parallele, polsi neutri e spalle lontane dalle orecchie.$instr$),
  ('Hspu · Parallette Pyke Push Up', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Piega e stendi le braccia restando nella lean della skill; sulle parallele, polsi neutri e spalle lontane dalle orecchie.$instr$),
  ('Hspu · Pyke Push Up', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Piega e stendi le braccia restando nella lean della skill; bacino alto, spalle sopra le mani: più verticale sei, più lavori le spalle.$instr$),
  ('Hspu · Straddle', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('Hspu · V Push Up', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Piega e stendi le braccia restando nella lean della skill; bacino alto, spalle sopra le mani: più verticale sei, più lavori le spalle.$instr$),
  ('Hspu · Wall Facing On Parallettes', $instr$In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.
Viso alla parete: talloni vicini al muro, spalle lontane; sulle parallele, polsi neutri e spalle lontane dalle orecchie.$instr$),
  ('Human flag', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Human flag · Front Block', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Il blocco sostiene il corpo: cerca comunque la linea della flag.$instr$),
  ('Human flag · Full Raises', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Corpo completamente teso in linea; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Human flag · Half Lay', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Mezza piega delle gambe, bacino ancora in linea.$instr$),
  ('Human flag · Lateral Block', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Il blocco sostiene il corpo: cerca comunque la linea della flag.$instr$),
  ('Human flag · Lay Raises', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Human flag · Straddle', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('Human flag · Straddle Raises', $instr$Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.
Gambe aperte in straddle per ridurre il braccio di leva; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Iron cross', $instr$Agli anelli, apri le braccia fino alla croce tenendo gli anelli vicini al corpo. Spalle basse, gomiti stabili, non aprire all’indietro.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Iron cross · Assisted', $instr$Agli anelli, apri le braccia fino alla croce tenendo gli anelli vicini al corpo. Spalle basse, gomiti stabili, non aprire all’indietro.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma.$instr$),
  ('Iron cross · Eccentric', $instr$Agli anelli, apri le braccia fino alla croce tenendo gli anelli vicini al corpo. Spalle basse, gomiti stabili, non aprire all’indietro.
Fase negativa lenta: 3–5 secondi, senza crollare.$instr$),
  ('Iron cross · Half', $instr$Agli anelli, apri le braccia fino alla croce tenendo gli anelli vicini al corpo. Spalle basse, gomiti stabili, non aprire all’indietro.
Apri fino a metà range e tieni, senza crollare gli anelli in fuori.$instr$),
  ('Iron cross · Pulls', $instr$Agli anelli, apri le braccia fino alla croce tenendo gli anelli vicini al corpo. Spalle basse, gomiti stabili, non aprire all’indietro.
Dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea.$instr$),
  ('L-sit', $instr$Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('L-sit · Advanced', $instr$Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.
Posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('L-sit · Alternating Leg L Sit Extension', $instr$Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.
Alterna i lati senza perdere la posizione del busto.$instr$),
  ('L-sit · Dinamic', $instr$Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.
Muovi le gambe restando alto sulle spalle, senza poggiare i piedi.$instr$),
  ('L-sit · Full To Straddle', $instr$Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.
Gambe aperte in straddle per ridurre il braccio di leva; corpo completamente teso in linea.$instr$),
  ('L-sit · One Leg', $instr$Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.
Una gamba tesa e l’altra raccolta, bacino squadrato.$instr$),
  ('L-sit · Tuck', $instr$Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.
Ginocchia raccolte al petto per accorciare la leva.$instr$),
  ('Legs · Alternating Jump Lunges', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Esplosivo in salita, atterraggio morbido e silenzioso; ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Alternating Reverse Lunges', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto; alterna i lati senza perdere la posizione del busto.$instr$),
  ('Legs · Bulgarian Split Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Lateral Lunges', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Pistol Box Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma; ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Pistol Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Pistol Squat On Ring', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra; ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Revers Hyperextension On Box', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma; estendi i femorali e i glutei senza iperestendere il collo.$instr$),
  ('Legs · Single Leg Box Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma; ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Skater Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Squat Jump', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Esplosivo in salita, atterraggio morbido e silenzioso; ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Static Lunges', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Sumo Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Ginocchio in linea col piede, bacino basso, petto alto.$instr$),
  ('Legs · Wall Assisted Pistol Squat', $instr$Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma; usa la parete solo come riferimento, non come appoggio passivo.$instr$),
  ('Maltese', $instr$Agli anelli o in lean, porta il corpo orizzontale a braccia tese con le spalle davanti alle mani. Petto alto e core chiuso.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Maltese · Kneeling Maltese Lean', $instr$Agli anelli o in lean, porta il corpo orizzontale a braccia tese con le spalle davanti alle mani. Petto alto e core chiuso.
Dalle ginocchia senti la lean delle spalle prima di alzare i piedi.$instr$),
  ('Maltese · Kneeling Ring Fly', $instr$Agli anelli o in lean, porta il corpo orizzontale a braccia tese con le spalle davanti alle mani. Petto alto e core chiuso.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra; apri e chiudi le braccia con i gomiti morbidi, core chiuso.$instr$),
  ('Maltese · Straddle', $instr$Agli anelli o in lean, porta il corpo orizzontale a braccia tese con le spalle davanti alle mani. Petto alto e core chiuso.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('Oap', $instr$In trazione a un braccio tieni la spalla attiva e il corpo il più possibile in linea. L’altro braccio assiste solo quanto serve.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Oap · Archer Pull Up', $instr$Tira su un braccio mentre l’altro resta teso e fa da assistenza laterale.
Il petto resta frontale alla sbarra: non ruotare il busto verso il braccio forte.$instr$),
  ('Oap · Assisted', $instr$In trazione a un braccio tieni la spalla attiva e il corpo il più possibile in linea. L’altro braccio assiste solo quanto serve.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma.$instr$),
  ('Oap · Australian Archer Pull Up', $instr$In trazione a un braccio tieni la spalla attiva e il corpo il più possibile in linea. L’altro braccio assiste solo quanto serve.
Esegui la trazione restando nella posizione della skill; un lato lavora, l’altro resta teso e assiste senza ruotare il busto.$instr$),
  ('Oap · Eccentric', $instr$In trazione a un braccio tieni la spalla attiva e il corpo il più possibile in linea. L’altro braccio assiste solo quanto serve.
Fase negativa lenta: 3–5 secondi, senza crollare.$instr$),
  ('Oap · OAC', $instr$Trazione a un braccio in presa pronata, corpo il più possibile in linea.
Spalla attiva e scapola depressa: se perdi la linea, riduci il range o assisti di più.$instr$),
  ('Oap · OAC Isometric Assisted', $instr$In trazione a un braccio tieni la spalla attiva e il corpo il più possibile in linea. L’altro braccio assiste solo quanto serve.
Tieni la posizione ferma, respirando senza spezzare la linea; usa l’assistenza il minimo indispensabile e toglila appena tieni la forma.$instr$),
  ('Oap · Ring Archer Pull Up', $instr$In trazione a un braccio tieni la spalla attiva e il corpo il più possibile in linea. L’altro braccio assiste solo quanto serve.
Esegui la trazione restando nella posizione della skill; anelli stretti al corpo, polsi in linea, niente oscillazioni extra.$instr$),
  ('Planche · Advanced', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Planche · Advanced Push Up', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Posizione intermedia: allunga più del tuck senza arrivare al full; piega e stendi le braccia restando nella lean della skill.$instr$),
  ('Planche · Bent Arm', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Gomiti piegati e stretti, spalle comunque davanti alle mani.$instr$),
  ('Planche · Bent Arm Advanced', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Posizione intermedia: allunga più del tuck senza arrivare al full; gomiti piegati e stretti, spalle comunque davanti alle mani.$instr$),
  ('Planche · Bent Arm One Leg', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Una gamba tesa e l’altra raccolta, bacino squadrato; gomiti piegati e stretti, spalle comunque davanti alle mani.$instr$),
  ('Planche · Bent Arm Straddle', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Gambe aperte in straddle per ridurre il braccio di leva; gomiti piegati e stretti, spalle comunque davanti alle mani.$instr$),
  ('Planche · Bent Arm Tuck', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Ginocchia raccolte al petto per accorciare la leva; gomiti piegati e stretti, spalle comunque davanti alle mani.$instr$),
  ('Planche · Elephant Stand', $instr$Appoggia le mani a terra, piega le braccia e porta le ginocchia sulle braccia tenendo i gomiti stretti.
Spingi le spalle in avanti e alza i piedi da terra senza perdere l’equilibrio.$instr$),
  ('Planche · Full', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Corpo completamente teso in linea.$instr$),
  ('Planche · Full Press', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Corpo completamente teso in linea; dalla raccolta, estendi fino alla skill senza slancio.$instr$),
  ('Planche · Lean', $instr$In plank sulle mani, porta le spalle davanti ai polsi tenendo braccia tese e bacino in retroversione.
Più avanzi con le spalle, più senti il carico su deltoidi e core: non alzare il sedere.$instr$),
  ('Planche · Lean Push Up', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Piega e stendi le braccia restando nella lean della skill.$instr$),
  ('Planche · Lean Rocks', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Planche · Lift Offs', $instr$Dalla posizione tuck o lean, stacca i piedi da terra per un attimo tenendo le braccia tese.
Spalle davanti alle mani e bacino chiuso: atterra piano e ripeti senza slancio.$instr$),
  ('Planche · Open Advanced', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Advanced più aperto, senza perdere scapole e bacino.$instr$),
  ('Planche · Open Tuck', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Ginocchia raccolte al petto per accorciare la leva; tuck più aperto: allunga un po’ senza perdere il bacino chiuso.$instr$),
  ('Planche · Shoulder', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Spalle extra-protratte, petto verso le mani.$instr$),
  ('Planche · Shoulder Planche Advanced', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Posizione intermedia: allunga più del tuck senza arrivare al full; spalle extra-protratte, petto verso le mani.$instr$),
  ('Planche · Shoulder Planche One Leg', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Una gamba tesa e l’altra raccolta, bacino squadrato; spalle extra-protratte, petto verso le mani.$instr$),
  ('Planche · Shoulder Planche Straddle', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Gambe aperte in straddle per ridurre il braccio di leva; spalle extra-protratte, petto verso le mani.$instr$),
  ('Planche · Shoulder Planche Tuck', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Ginocchia raccolte al petto per accorciare la leva; spalle extra-protratte, petto verso le mani.$instr$),
  ('Planche · Straddle', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('Planche · Straddle Press', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Gambe aperte in straddle per ridurre il braccio di leva; dalla raccolta, estendi fino alla skill senza slancio.$instr$),
  ('Planche · Tuck', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Ginocchia raccolte al petto per accorciare la leva.$instr$),
  ('Planche · Tuck Push Up', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Ginocchia raccolte al petto per accorciare la leva; piega e stendi le braccia restando nella lean della skill.$instr$),
  ('Planche · Tuck To Advanced', $instr$Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.
Ginocchia raccolte al petto per accorciare la leva; posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Pull up', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Esegui la trazione restando nella posizione della skill.$instr$),
  ('Pull up · Australian', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Corpo in linea sotto la sbarra bassa: tira il petto verso l’attrezzo.$instr$),
  ('Pull up · Chin Up', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Presa supina: tieni i gomiti davanti e le spalle basse.$instr$),
  ('Pull up · Close', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Presa stretta: gomiti vicini al corpo.$instr$),
  ('Pull up · Close Chin Up', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Presa stretta: gomiti vicini al corpo; presa supina: tieni i gomiti davanti e le spalle basse.$instr$),
  ('Pull up · Eccentric', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Fase negativa lenta: 3–5 secondi, senza crollare.$instr$),
  ('Pull up · Eccentric Chin Up', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Fase negativa lenta: 3–5 secondi, senza crollare; presa supina: tieni i gomiti davanti e le spalle basse.$instr$),
  ('Pull up · Foot Assisted', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma.$instr$),
  ('Pull up · Horizontal', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Corpo parallelo al suolo, talloni a terra, scapole attive.$instr$),
  ('Pull up · Iso Chin Up', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Tieni la posizione ferma, respirando senza spezzare la linea; presa supina: tieni i gomiti davanti e le spalle basse.$instr$),
  ('Pull up · Iso Chin Up 90°', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Tieni la posizione ferma, respirando senza spezzare la linea; presa supina: tieni i gomiti davanti e le spalle basse.$instr$),
  ('Pull up · Mixed Grip', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Una mano prona e una supina: cambia lato ad ogni serie.$instr$),
  ('Pull up · Neutral Grip', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Presa neutra: non chiudere il collo e tieni le scapole giù.$instr$),
  ('Pull up · Ring', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra.$instr$),
  ('Pull up · Wide', $instr$Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.
Presa o stance più larga: non alzare le spalle.$instr$),
  ('Push Up', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Piega e stendi le braccia restando nella lean della skill.$instr$),
  ('Push Up · Archer', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Un lato lavora, l’altro resta teso e assiste senza ruotare il busto.$instr$),
  ('Push Up · Decline', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Piedi rialzati: non inarcare la schiena.$instr$),
  ('Push Up · Diamond', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Presa stretta: gomiti vicini al corpo.$instr$),
  ('Push Up · Knee', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Ginocchia a terra, corpo comunque in linea dalle spalle alle ginocchia.$instr$),
  ('Push Up · Parallette', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Sulle parallele, polsi neutri e spalle lontane dalle orecchie.$instr$),
  ('Push Up · Plio', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Esplosivo in salita, atterraggio morbido e silenzioso.$instr$),
  ('Push Up · Ring', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra.$instr$),
  ('Push Up · Ring Flyes', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra; apri e chiudi le braccia con i gomiti morbidi, core chiuso.$instr$),
  ('Push Up · Russian', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Passa dalla posizione raccolta a quella tesa senza perdere le spalle.$instr$),
  ('Push Up · Scapular', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Muovi solo le scapole, gomiti tesi, niente piegamento di braccia.$instr$),
  ('Push Up · Staggered', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Una mano più avanti: tieni il bacino squadrato e cambia lato.$instr$),
  ('Push Up · Supinated Ring', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra; presa supina: tieni i gomiti davanti e le spalle basse.$instr$),
  ('Push Up · Tiger', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Avambracci a terra, poi stendi i gomiti restando in lean.$instr$),
  ('Push Up · Wide', $instr$Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.
Presa o stance più larga: non alzare le spalle.$instr$),
  ('Ring muscle up', $instr$False grip agli anelli: tira e transisci in dip con gli anelli vicini al corpo. Non aprire le spalle in transizione.
Anelli stretti al corpo, polsi in linea, niente oscillazioni extra.$instr$),
  ('Ring muscle up · Assisted', $instr$False grip agli anelli: tira e transisci in dip con gli anelli vicini al corpo. Non aprire le spalle in transizione.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma.$instr$),
  ('Ring muscle up · Eccentric', $instr$False grip agli anelli: tira e transisci in dip con gli anelli vicini al corpo. Non aprire le spalle in transizione.
Fase negativa lenta: 3–5 secondi, senza crollare.$instr$),
  ('Ring muscle up · False Grip Australian Pull Up', $instr$False grip agli anelli: tira e transisci in dip con gli anelli vicini al corpo. Non aprire le spalle in transizione.
Esegui la trazione restando nella posizione della skill; polsi sopra l’anello prima di tirare: è la presa della transizione.$instr$),
  ('Ring muscle up · False Grip Pull Up', $instr$False grip agli anelli: tira e transisci in dip con gli anelli vicini al corpo. Non aprire le spalle in transizione.
Esegui la trazione restando nella posizione della skill; polsi sopra l’anello prima di tirare: è la presa della transizione.$instr$),
  ('Stretching · Cobra Stretch', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Spingi il petto in alto, bacino a terra, spalle lontane dalle orecchie.$instr$),
  ('Stretching · Cross Body Shoulder', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Spalle extra-protratte, petto verso le mani; scapola bassa, petto aperto, non alzare l’orecchio verso la spalla.$instr$),
  ('Stretching · Cross Legged Standing Forward Fold', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Cerniera di anche, schiena lunga, non arrotolare il collo.$instr$),
  ('Stretching · Diagonal Neck', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Inclinazione diagonale: senti le spalle senza arrivare in verticale piena; movimento piccolo e lento: non forzare la cervicale.$instr$),
  ('Stretching · Double Knee To Chest', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Tieni 20–40 secondi per lato, respira e non forzare il rimbalzo.$instr$),
  ('Stretching · Figure Four', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Caviglia sopra il ginocchio opposto, bacino a terra, respiro nel gluteo.$instr$),
  ('Stretching · Lateral Neck', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Movimento piccolo e lento: non forzare la cervicale.$instr$),
  ('Stretching · Neck Extension', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Movimento piccolo e lento: non forzare la cervicale.$instr$),
  ('Stretching · Overhead Triceps', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Tieni 20–40 secondi per lato, respira e non forzare il rimbalzo.$instr$),
  ('Stretching · Pancake', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Cerniera di anche, schiena lunga, non arrotolare il collo.$instr$),
  ('Stretching · Quadriceps Stretch', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Tieni le anche in retroversione mentre allunghi il quadricipite.$instr$),
  ('Stretching · Seated Forward Fold', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Da seduto, busto stabile e gambe che lavorano senza inclinarti indietro; cerniera di anche, schiena lunga, non arrotolare il collo.$instr$),
  ('Stretching · Seated Straddle Side', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Gambe aperte in straddle per ridurre il braccio di leva; da seduto, busto stabile e gambe che lavorano senza inclinarti indietro.$instr$),
  ('Stretching · Shoulder Width Standing Forward Fold', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Spalle extra-protratte, petto verso le mani; cerniera di anche, schiena lunga, non arrotolare il collo.$instr$),
  ('Stretching · Single Knee To Chest', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Tieni 20–40 secondi per lato, respira e non forzare il rimbalzo.$instr$),
  ('Stretching · Soulder Flexion', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Tieni 20–40 secondi per lato, respira e non forzare il rimbalzo.$instr$),
  ('Stretching · Standing Forward Fold', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Cerniera di anche, schiena lunga, non arrotolare il collo.$instr$),
  ('Stretching · Supine Quad Stretch', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Tieni le anche in retroversione mentre allunghi il quadricipite.$instr$),
  ('Stretching · Supine Spinal Twist', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Tieni 20–40 secondi per lato, respira e non forzare il rimbalzo.$instr$),
  ('Stretching · Wide Leg Standing Forward Fold', $instr$Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.
Presa o stance più larga: non alzare le spalle; cerniera di anche, schiena lunga, non arrotolare il collo.$instr$),
  ('Ted', $instr$Agli anelli, porta il corpo in linea TED con le spalle davanti e le braccia tese. Core chiuso e anelli stretti.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('Ted · Assisted', $instr$Agli anelli, porta il corpo in linea TED con le spalle davanti e le braccia tese. Core chiuso e anelli stretti.
Usa l’assistenza il minimo indispensabile e toglila appena tieni la forma.$instr$),
  ('Ted · Eccentric', $instr$Agli anelli, porta il corpo in linea TED con le spalle davanti e le braccia tese. Core chiuso e anelli stretti.
Fase negativa lenta: 3–5 secondi, senza crollare.$instr$),
  ('Ted · Half', $instr$Agli anelli, porta il corpo in linea TED con le spalle davanti e le braccia tese. Core chiuso e anelli stretti.
Apri fino a metà range e tieni, senza crollare gli anelli in fuori.$instr$),
  ('Ted · Iso', $instr$Agli anelli, porta il corpo in linea TED con le spalle davanti e le braccia tese. Core chiuso e anelli stretti.
Tieni la posizione ferma, respirando senza spezzare la linea.$instr$),
  ('V-sit', $instr$Dalle parallele o da seduto, solleva gambe e busto verso la V. Compressione attiva e ginocchia tese.
Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.$instr$),
  ('V-sit · Straddle', $instr$Dalle parallele o da seduto, solleva gambe e busto verso la V. Compressione attiva e ginocchia tese.
Gambe aperte in straddle per ridurre il braccio di leva.$instr$),
  ('V-sit · Tuck', $instr$Dalle parallele o da seduto, solleva gambe e busto verso la V. Compressione attiva e ginocchia tese.
Ginocchia raccolte al petto per accorciare la leva.$instr$),
  ('V-sit · Tuck Alternating Leg Extensions', $instr$Dalle parallele o da seduto, solleva gambe e busto verso la V. Compressione attiva e ginocchia tese.
Ginocchia raccolte al petto per accorciare la leva; alterna i lati senza perdere la posizione del busto.$instr$),
  ('V-sit · Wall Compression', $instr$Dalle parallele o da seduto, solleva gambe e busto verso la V. Compressione attiva e ginocchia tese.
Usa la parete solo come riferimento, non come appoggio passivo; avvicina busto e gambe attivamente, non solo in stretch passivo.$instr$),
  ('Victorian assisted · Advanced', $instr$Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.
Posizione intermedia: allunga più del tuck senza arrivare al full.$instr$),
  ('Victorian assisted · Advanced Raises', $instr$Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.
Posizione intermedia: allunga più del tuck senza arrivare al full; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Victorian assisted · Full', $instr$Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.
Corpo completamente teso in linea.$instr$),
  ('Victorian assisted · Full Raises', $instr$Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.
Corpo completamente teso in linea; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Victorian assisted · One Leg', $instr$Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.
Una gamba tesa e l’altra raccolta, bacino squadrato.$instr$),
  ('Victorian assisted · One Leg Raises', $instr$Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.
Una gamba tesa e l’altra raccolta, bacino squadrato; solleva il corpo nella posizione e scendi con lo stesso controllo.$instr$),
  ('Victorian assisted · Tuck', $instr$Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.
Ginocchia raccolte al petto per accorciare la leva.$instr$),
  ('Warm-up · Alternating Arm Swings', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Cerchi ampi e morbidi, addome chiuso, non inarcare la schiena; alterna i lati senza perdere la posizione del busto.$instr$),
  ('Warm-up · Alternative Arm', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
10–15 ripetizioni fluide per lato, sentendo il calore senza dolore.$instr$),
  ('Warm-up · Backward Arm Circles', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Cerchi ampi e morbidi, addome chiuso, non inarcare la schiena.$instr$),
  ('Warm-up · Cat Cow', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Alterna gibbo e inarcamento vertebra per vertebra, respiro largo.$instr$),
  ('Warm-up · Finger Flexion And Extension', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Carico graduale sui polsi, gomiti morbidi, senza dolore acuto.$instr$),
  ('Warm-up · Forward Arm Circles', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Cerchi ampi e morbidi, addome chiuso, non inarcare la schiena.$instr$),
  ('Warm-up · Hops', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Appoggi morbidi, ginocchia elastiche, ritmo costante.$instr$),
  ('Warm-up · Jumping Jacks', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Appoggi morbidi, ginocchia elastiche, ritmo costante.$instr$),
  ('Warm-up · Kneeling Shoulder Stretch', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Spalle extra-protratte, petto verso le mani; scapola bassa, petto aperto, non alzare l’orecchio verso la spalla.$instr$),
  ('Warm-up · Kneeling Wrist Stretch', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Carico graduale sui polsi, gomiti morbidi, senza dolore acuto; dalle ginocchia senti la lean delle spalle prima di alzare i piedi.$instr$),
  ('Warm-up · Neck Flexion & Extension', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Movimento piccolo e lento: non forzare la cervicale.$instr$),
  ('Warm-up · Neck Lateral Flexion', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Movimento piccolo e lento: non forzare la cervicale.$instr$),
  ('Warm-up · Neck Rotation', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Movimento piccolo e lento: non forzare la cervicale.$instr$),
  ('Warm-up · Plank Cat Cow', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Alterna gibbo e inarcamento vertebra per vertebra, respiro largo.$instr$),
  ('Warm-up · Reverse Wrist Stretch', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Carico graduale sui polsi, gomiti morbidi, senza dolore acuto.$instr$),
  ('Warm-up · Shoulder Flexion & Extension', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Spalle extra-protratte, petto verso le mani; scapola bassa, petto aperto, non alzare l’orecchio verso la spalla.$instr$),
  ('Warm-up · Shoulder Opener', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Spalle extra-protratte, petto verso le mani; scapola bassa, petto aperto, non alzare l’orecchio verso la spalla.$instr$),
  ('Warm-up · Small Arm Circles Overhead', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Cerchi ampi e morbidi, addome chiuso, non inarcare la schiena.$instr$),
  ('Warm-up · Standing Cross Body Toe Touch', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Arriva al tocco e torna, senza rimbalzare.$instr$),
  ('Warm-up · Standing Forward Band', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
10–15 ripetizioni fluide per lato, sentendo il calore senza dolore.$instr$),
  ('Warm-up · Wrist Extension Stretch', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Carico graduale sui polsi, gomiti morbidi, senza dolore acuto.$instr$),
  ('Warm-up · Wrist Flexion', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Carico graduale sui polsi, gomiti morbidi, senza dolore acuto.$instr$),
  ('Warm-up · Wrist Rotations On Fists', $instr$Muovi l’articolazione in modo ampio e controllato, senza forzare il range.
Carico graduale sui polsi, gomiti morbidi, senza dolore acuto.$instr$)
) AS v(name, instructions)
WHERE e.is_public = true
  AND e.name = v.name
  AND (
    e.video_url ILIKE '%exercise-videos%'
    OR e.instructions ILIKE '%Video dimostrativo in arrivo%'
  )
  AND (
    e.instructions ILIKE '%Video dimostrativo in arrivo%'
    OR e.instructions ILIKE '%scapole attive e core chiuso%'
  );
