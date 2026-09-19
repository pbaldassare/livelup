/**
 * Tecnica catalogo Drive: due righe vere, niente «Video dimostrativo in arrivo».
 */

const PLACEHOLDER_RE = /video dimostrativo in arrivo/i;
const GENERIC_SEED_RE = /con controllo, scapole attive e core chiuso/i;

const FAMILY_SETUP: Record<string, string> = {
  'Back lever':
    'Alla sbarra, da appeso, ruota il corpo sotto la sbarra fino alla leva posteriore. Spalle chiuse, scapole attive, bacino in retroversione.',
  'Bar muscle up':
    'Tira il petto sopra la sbarra e transisci in dip in un unico movimento. Core chiuso, polsi sopra la sbarra, non aprire le spalle in transizione.',
  Core: 'Contrai l’addome e muovi con controllo, senza tirare con il collo o inarcare il lombare.',
  Dip: 'Spalle basse e lontane dalle orecchie: scendi con i gomiti indietro e risali senza sprofondare sul petto.',
  'Dragon press':
    'Dal supporto, porta il corpo in avanti fino a sollevare le gambe a braccia tese. Scapole protratte e bacino chiuso.',
  'Front lever':
    'Alla sbarra, porta il corpo in linea orizzontale a pancia in su. Spalle estese, scapole depresse, bacino in retroversione.',
  Handstand: 'Impila polsi, spalle e bacino. Spingi il pavimento, guarda tra le mani e non inarcare la schiena.',
  Hspu: 'In verticale, piega i gomiti e scendi con controllo, poi spingi fino a raddrizzare le braccia. Gomiti a circa 45° e core chiuso.',
  'Human flag':
    'Sul palo, allinea spalle e bacino in laterale. Il braccio alto tira, quello basso spinge: non lasciare crollare le anche.',
  'Iron cross':
    'Agli anelli, apri le braccia fino alla croce tenendo gli anelli vicini al corpo. Spalle basse, gomiti stabili, non aprire all’indietro.',
  'L-sit':
    'Sulle parallele, solleva le gambe tese a 90° e spingi le spalle in basso. Bacino in retroversione e ginocchia bloccate.',
  Legs: 'Appoggia il peso sui talloni, ginocchia in linea con le punte e schiena neutra per tutto il movimento.',
  Maltese:
    'Agli anelli o in lean, porta il corpo orizzontale a braccia tese con le spalle davanti alle mani. Petto alto e core chiuso.',
  Oap: 'In trazione a un braccio tieni la spalla attiva e il corpo il più possibile in linea. L’altro braccio assiste solo quanto serve.',
  Planche:
    'Spalle davanti alle mani, scapole protratte, bacino in retroversione e braccia tese. Non alzare il sedere.',
  'Pull up':
    'Dalla sbarra, tira i gomiti verso le anche fino a portare il mento sopra. Spalle lontane dalle orecchie, senza dondolare.',
  'Push Up':
    'Corpo in plank: scendi col petto verso il pavimento e risali senza crollare il bacino. Gomiti a circa 45°.',
  'Ring muscle up':
    'False grip agli anelli: tira e transisci in dip con gli anelli vicini al corpo. Non aprire le spalle in transizione.',
  Stretching: 'Entra nello stretch con respiro lento e senza rimbalzi. Fermati sulla tensione, non sul dolore.',
  Ted: 'Agli anelli, porta il corpo in linea TED con le spalle davanti e le braccia tese. Core chiuso e anelli stretti.',
  'V-sit': 'Dalle parallele o da seduto, solleva gambe e busto verso la V. Compressione attiva e ginocchia tese.',
  'Victorian assisted':
    'Agli anelli, porta il corpo in victorian con assistenza. Spalle dietro le mani, petto alto, core chiuso.',
  'Warm-up': 'Muovi l’articolazione in modo ampio e controllato, senza forzare il range.',
};

const NAME_OVERRIDES: Record<string, [string, string]> = {
  'Back lever · Skin The Cat': [
    'Dalla sbarra, porta le gambe attraverso le braccia e ruota il bacino fino alla posizione inversa, con scapole attive.',
    'Controlla salita e ritorno: non crollare sulle spalle e tieni i gomiti morbidi ma stabili.',
  ],
  'Front lever · Ice Cream Maker': [
    'Dalla sbarra, passa in modo controllato da un chin-up alla front lever e torna su, senza slancio.',
    'Tieni il bacino chiuso e le scapole depresse per tutta la transizione.',
  ],
  'Planche · Elephant Stand': [
    'Appoggia le mani a terra, piega le braccia e porta le ginocchia sulle braccia tenendo i gomiti stretti.',
    'Spingi le spalle in avanti e alza i piedi da terra senza perdere l’equilibrio.',
  ],
  'Planche · Lean': [
    'In plank sulle mani, porta le spalle davanti ai polsi tenendo braccia tese e bacino in retroversione.',
    'Più avanzi con le spalle, più senti il carico su deltoidi e core: non alzare il sedere.',
  ],
  'Planche · Lift Offs': [
    'Dalla posizione tuck o lean, stacca i piedi da terra per un attimo tenendo le braccia tese.',
    'Spalle davanti alle mani e bacino chiuso: atterra piano e ripeti senza slancio.',
  ],
  'Handstand · Frog Stand': [
    'Appoggia le mani, piega i gomiti e porta le ginocchia all’esterno delle braccia.',
    'Sposta il peso in avanti fino a staccare i piedi, guardando tra le mani.',
  ],
  'Handstand · Tripod': [
    'Testa e mani a triangolo, ginocchia sulle braccia, poi estendi le gambe verso l’alto.',
    'Spingi il pavimento con i palmi e tieni il collo stabile, senza crollare sulla testa.',
  ],
  'Bar muscle up · Box Assisted': [
    'Usa il box per aiutare la transizione: tira, porta i polsi sopra la sbarra e finisci in dip.',
    'Meno spinta dalle gambe possibile: il petto deve passare sopra la sbarra, non di lato.',
  ],
  'Bar muscle up · Chest To Bar Pull Ups': [
    'Tira fino a toccare la sbarra col petto, non solo col mento.',
    'Chiudi le scapole in alto e prepara la transizione del muscle-up senza dondolare.',
  ],
  'Bar muscle up · L Sit': [
    'Esegui il muscle-up tenendo le gambe tese in L per tutto il movimento.',
    'Core chiuso e transizione secca: le gambe non devono aiutarti con uno slancio.',
  ],
  'Core · Hollow Position': [
    'Sulla schiena, stacca spalle e gambe da terra tenendo la zona lombare incollata.',
    'Braccia lunghe, bacino in retroversione: se la schiena stacca, accorcia le leve.',
  ],
  'Core · Dragon Flag Full': [
    'Dalla panca o dalla sbarra, solleva il corpo teso in linea dalle spalle ai piedi.',
    'Scendi centimetro per centimetro senza spezzare le anche o il petto.',
  ],
  'Oap · Archer Pull Up': [
    'Tira su un braccio mentre l’altro resta teso e fa da assistenza laterale.',
    'Il petto resta frontale alla sbarra: non ruotare il busto verso il braccio forte.',
  ],
  'Oap · OAC': [
    'Trazione a un braccio in presa pronata, corpo il più possibile in linea.',
    'Spalla attiva e scapola depressa: se perdi la linea, riduci il range o assisti di più.',
  ],
};

function splitCatalogName(name: string): { family: string; variant: string } {
  const idx = name.indexOf(' · ');
  if (idx < 0) return { family: name.trim(), variant: '' };
  return {
    family: name.slice(0, idx).trim(),
    variant: name.slice(idx + 3).trim(),
  };
}

function variantCue(family: string, variant: string): string {
  const v = variant.toLowerCase();
  const bits: string[] = [];

  if (/\btuck\b/.test(v)) bits.push('ginocchia raccolte al petto per accorciare la leva');
  if (/\bopen tuck\b/.test(v)) bits.push('tuck più aperto: allunga un po’ senza perdere il bacino chiuso');
  if (/\bstraddle\b/.test(v)) bits.push('gambe aperte in straddle per ridurre il braccio di leva');
  if (/\bone leg\b/.test(v)) bits.push('una gamba tesa e l’altra raccolta, bacino squadrato');
  if (/\badvanced\b/.test(v) && !/\bopen advanced\b/.test(v)) {
    bits.push('posizione intermedia: allunga più del tuck senza arrivare al full');
  }
  if (/\bopen advanced\b/.test(v)) bits.push('advanced più aperto, senza perdere scapole e bacino');
  if (/\bfull\b/.test(v) || /\bcomplete\b/.test(v)) bits.push('corpo completamente teso in linea');
  if (/\bhalf lay\b/.test(v)) bits.push('mezza piega delle gambe, bacino ancora in linea');
  if (/\bbent arm\b/.test(v)) bits.push('gomiti piegati e stretti, spalle comunque davanti alle mani');
  if (/\bshoulder\b/.test(v)) bits.push('spalle extra-protratte, petto verso le mani');
  if (/\bpress\b/.test(v)) bits.push('dalla raccolta, estendi fino alla skill senza slancio');
  if (/\bpush up\b/.test(v) || /\bpush-up\b/.test(v)) {
    bits.push('piega e stendi le braccia restando nella lean della skill');
  }
  if (/\bpulls?\b/.test(v) && !/\bpull up\b/.test(v) && !/\bpull-up\b/.test(v)) {
    bits.push('dal hold tira il corpo verso l’attrezzo e torna senza perdere la linea');
  }
  if (/\bpull up\b/.test(v) || /\bpull-up\b/.test(v)) {
    bits.push('esegui la trazione restando nella posizione della skill');
  }
  if (/\braises?\b/.test(v)) bits.push('solleva il corpo nella posizione e scendi con lo stesso controllo');
  if (/\btouch\b/.test(v)) bits.push('arriva al tocco e torna, senza rimbalzare');
  if (/\bpulses?\b/.test(v)) bits.push('piccole oscillazioni controllate nella posizione, senza perdere la linea');
  if (/\beccentric\b/.test(v)) bits.push('fase negativa lenta: 3–5 secondi, senza crollare');
  if (/\biso\b/.test(v) || /\bisometric\b/.test(v)) bits.push('tieni la posizione ferma, respirando senza spezzare la linea');
  if (/\bassisted\b/.test(v) || /\bfoot assisted\b/.test(v) || /\bbox\b/.test(v)) {
    bits.push('usa l’assistenza il minimo indispensabile e toglila appena tieni la forma');
  }
  if (/\bwall facing\b/.test(v)) bits.push('viso alla parete: talloni vicini al muro, spalle lontane');
  if (/\bback to wall\b/.test(v) || /\bwall l\b/.test(v)) bits.push('schiena o L alla parete per sentire la verticale senza cadere');
  if (/\bwall\b/.test(v) && !/\bwall facing\b/.test(v) && !/\bback to wall\b/.test(v) && !/\bwall l\b/.test(v) && family !== 'Warm-up') {
    bits.push('usa la parete solo come riferimento, non come appoggio passivo');
  }
  if (/\bparallet/.test(v) || /\bprallel/.test(v)) bits.push('sulle parallele, polsi neutri e spalle lontane dalle orecchie');
  if (/\bring\b/.test(v)) bits.push('anelli stretti al corpo, polsi in linea, niente oscillazioni extra');
  if (/\bfalse grip\b/.test(v)) bits.push('polsi sopra l’anello prima di tirare: è la presa della transizione');
  if (/\bwide\b/.test(v)) bits.push('presa o stance più larga: non alzare le spalle');
  if (/\bclose\b/.test(v) || /\bdiamond\b/.test(v)) bits.push('presa stretta: gomiti vicini al corpo');
  if (/\bchin up\b/.test(v) || /\bsupinated\b/.test(v)) bits.push('presa supina: tieni i gomiti davanti e le spalle basse');
  if (/\bneutral\b/.test(v)) bits.push('presa neutra: non chiudere il collo e tieni le scapole giù');
  if (/\bmixed grip\b/.test(v)) bits.push('una mano prona e una supina: cambia lato ad ogni serie');
  if (/\barcher\b/.test(v)) bits.push('un lato lavora, l’altro resta teso e assiste senza ruotare il busto');
  if (/\bdecline\b/.test(v)) bits.push('piedi rialzati: non inarcare la schiena');
  if (/\bknee\b/.test(v) && family === 'Push Up') bits.push('ginocchia a terra, corpo comunque in linea dalle spalle alle ginocchia');
  if (/\bplio\b/.test(v) || /\bjump\b/.test(v)) bits.push('esplosivo in salita, atterraggio morbido e silenzioso');
  if (/\bscapular\b/.test(v)) bits.push('muovi solo le scapole, gomiti tesi, niente piegamento di braccia');
  if (/\bstaggered\b/.test(v)) bits.push('una mano più avanti: tieni il bacino squadrato e cambia lato');
  if (/\brussian\b/.test(v)) bits.push('passa dalla posizione raccolta a quella tesa senza perdere le spalle');
  if (/\btiger\b/.test(v)) bits.push('avambracci a terra, poi stendi i gomiti restando in lean');
  if (/\bfly/.test(v)) bits.push('apri e chiudi le braccia con i gomiti morbidi, core chiuso');
  if (/\baustralian\b/.test(v)) bits.push('corpo in linea sotto la sbarra bassa: tira il petto verso l’attrezzo');
  if (/\bhorizontal\b/.test(v)) bits.push('corpo parallelo al suolo, talloni a terra, scapole attive');
  if (/\bpike\b/.test(v) || /\bpyke\b/.test(v) || /\bv position\b/.test(v) || /\bv push\b/.test(v)) {
    bits.push('bacino alto, spalle sopra le mani: più verticale sei, più lavori le spalle');
  }
  if (/\bkick up/.test(v)) bits.push('slancio controllato: arriva in equilibrio, non oltrepassare');
  if (/\bleg lifts?\b/.test(v)) bits.push('alterna le gambe senza perdere la spinta delle spalle');
  if (/\btoe pulls?\b/.test(v)) bits.push('tira le punte verso il muro restando impilato');
  if (/\bl handstand\b/.test(v) || /\bwall l\b/.test(v)) bits.push('forma una L: piedi al muro, spalle sopra i polsi');
  if (/\bdiagonal\b/.test(v)) bits.push('inclinazione diagonale: senti le spalle senza arrivare in verticale piena');
  if (/\bone arm plank\b/.test(v)) bits.push('un appoggio solo: bacino squadrato, non ruotare le spalle');
  if (/\bside plank\b/.test(v)) bits.push('spalla sopra il gomito o la mano, anche allineate, sguardo avanti');
  if (/\bhigh plank\b/.test(v) || /\b^plank$/.test(v)) bits.push('braccia tese, corpo in linea, non lasciare crollare il bacino');
  if (/\bcrunch\b/.test(v) && !/\breverse\b/.test(v)) bits.push('stacca le scapole da terra arrotolando il busto, non tirando il collo');
  if (/\breverse crunch\b/.test(v)) bits.push('porta le ginocchia verso il petto staccando il sacro, senza slancio');
  if (/\bsit up\b/.test(v)) bits.push('sali vertebra per vertebra e scendi con lo stesso controllo');
  if (/\bv[- ]?ups?\b/.test(v)) bits.push('mani e piedi si cercano in alto: schiena bassa sempre a terra nella partenza');
  if (/\bleg raises?\b/.test(v) || /\btoes to bar\b/.test(v)) {
    bits.push('porta le gambe su col bacino, non con uno slancio di schiena');
  }
  if (/\bsuperman\b/.test(v)) bits.push('stacca petto e gambe insieme, sguardo a terra, niente iperestensione del collo');
  if (/\bdragon flag\b/.test(v)) bits.push('corpo in leva sulle spalle: anche e petto restano in linea');
  if (/\bdynamic\b/.test(v)) bits.push('il movimento è continuo ma lento: niente rimbalzo in fondo');
  if (/\bseated\b/.test(v)) bits.push('da seduto, busto stabile e gambe che lavorano senza inclinarti indietro');
  if (/\blunge/.test(v) || /\bsquat\b/.test(v) || /\bpistol\b/.test(v) || /\bskater\b/.test(v)) {
    bits.push('ginocchio in linea col piede, bacino basso, petto alto');
  }
  if (/\bhyperextension\b/.test(v)) bits.push('estendi i femorali e i glutei senza iperestendere il collo');
  if (/\bcobra\b/.test(v)) bits.push('spingi il petto in alto, bacino a terra, spalle lontane dalle orecchie');
  if (/\bpancake\b/.test(v) || /\bforward fold\b/.test(v)) bits.push('cerniera di anche, schiena lunga, non arrotolare il collo');
  if (/\bfigure four\b/.test(v)) bits.push('caviglia sopra il ginocchio opposto, bacino a terra, respiro nel gluteo');
  if (/\bquad/.test(v)) bits.push('tieni le anche in retroversione mentre allunghi il quadricipite');
  if (/\bneck\b/.test(v)) bits.push('movimento piccolo e lento: non forzare la cervicale');
  if (/\bwrist\b/.test(v) || /\bfinger\b/.test(v)) bits.push('carico graduale sui polsi, gomiti morbidi, senza dolore acuto');
  if (/\bshoulder\b/.test(v) && (family === 'Stretching' || family === 'Warm-up')) {
    bits.push('scapola bassa, petto aperto, non alzare l’orecchio verso la spalla');
  }
  if (/\barm circles?\b/.test(v) || /\barm swings?\b/.test(v)) {
    bits.push('cerchi ampi e morbidi, addome chiuso, non inarcare la schiena');
  }
  if (/\bcat cow\b/.test(v)) bits.push('alterna gibbo e inarcamento vertebra per vertebra, respiro largo');
  if (/\bhops?\b/.test(v) || /\bjumping jack/.test(v)) bits.push('appoggi morbidi, ginocchia elastiche, ritmo costante');
  if (/\bfront block\b/.test(v) || /\blateral block\b/.test(v)) {
    bits.push('il blocco sostiene il corpo: cerca comunque la linea della flag');
  }
  if (/\bhalf\b/.test(v) && (family === 'Iron cross' || family === 'Ted')) {
    bits.push('apri fino a metà range e tieni, senza crollare gli anelli in fuori');
  }
  if (/\bkneeling\b/.test(v)) bits.push('dalle ginocchia senti la lean delle spalle prima di alzare i piedi');
  if (/\bcompression\b/.test(v)) bits.push('avvicina busto e gambe attivamente, non solo in stretch passivo');
  if (/\balternating\b/.test(v)) bits.push('alterna i lati senza perdere la posizione del busto');
  if (/\bdinamic\b/.test(v) || /\bdynamic\b/.test(v) && family === 'L-sit') {
    bits.push('muovi le gambe restando alto sulle spalle, senza poggiare i piedi');
  }

  if (bits.length === 0) {
    if (family === 'Stretching') {
      return 'Tieni 20–40 secondi per lato, respira e non forzare il rimbalzo.';
    }
    if (family === 'Warm-up') {
      return '10–15 ripetizioni fluide per lato, sentendo il calore senza dolore.';
    }
    return 'Guarda il video e ripeti lo stesso setup: controllo prima dell’ampiezza.';
  }

  const unique = [...new Set(bits)].slice(0, 2);
  const sentence = unique.join('; ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

export function isPlaceholderCatalogInstructions(text?: string | null): boolean {
  if (!text?.trim()) return false;
  return PLACEHOLDER_RE.test(text) || GENERIC_SEED_RE.test(text);
}

export function buildCatalogInstructions(name: string, category?: string | null): string {
  const override = NAME_OVERRIDES[name.trim()];
  if (override) return override.join('\n');

  const { family, variant } = splitCatalogName(name);
  const key = FAMILY_SETUP[family] ? family : FAMILY_SETUP[category || ''] ? category! : family;
  const line1 =
    FAMILY_SETUP[key] ||
    `Esegui ${name} con controllo, senza compensare con slancio o spalle alte.`;
  const line2 = variantCue(family || category || '', variant || family);
  return `${line1}\n${line2}`;
}

export function resolveExerciseInstructions(
  name: string | null | undefined,
  category: string | null | undefined,
  instructions?: string | null,
): string {
  const raw = instructions?.trim() ?? '';
  if (raw && !isPlaceholderCatalogInstructions(raw)) return raw;
  if (!name?.trim()) return raw;
  return buildCatalogInstructions(name.trim(), category);
}
