/**
 * koboDecoder.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Kobo encode ses valeurs de choix en remplacant les caracteres non-ASCII
 * (accents, espaces, ponctuation) par des underscores.
 * Ex : "Tres satisfaite" → stored as "1__Tr_s_satisfait_e"
 *      "Tres bien" → stored as "1__Tr_s_bonne"
 *
 * Ce module fournit :
 *   1. Une table de mapping code → label correct (avec accents)
 *   2. Une fonction decodeKoboValue() qui applique le mapping,
 *      puis une normalisation heuristique si le code est inconnu.
 * ──────────────────────────────────────────────────────────────────────────
 */

// ─── Table de mapping : code Kobo → label français avec accents ───────────
// La cle est la partie APRES les chiffres__ (en minuscules, underscores conserves)
// Ajoutez ici toute nouvelle option rencontree dans vos formulaires.
export const KOBO_LABEL_MAP: Record<string, string> = {
  // ── Satisfaction / Qualite ──────────────────────────────────────────────
  'tr_s_satisfait_e':         'Tres satisfait(e)',
  'satisfait_e':              'Satisfait(e)',
  'peu_satisfait_e':          'Peu satisfait(e)',
  'pas_du_tout_satisfait_e':  'Pas du tout satisfait(e)',
  'tr_s_insatisfait_e':       'Tres insatisfait(e)',

  // ── Frequence ───────────────────────────────────────────────────────────
  'tr_s_souvent':             'Tres souvent',
  'souvent':                  'Souvent',
  'parfois':                  'Parfois',
  'rarement':                 'Rarement',
  'jamais':                   'Jamais',

  // ── Qualite de vie / Services ────────────────────────────────────────────
  'tr_s_bonne':               'Tres bonne',
  'bonne':                    'Bonne',
  'moyenne':                  'Moyenne',
  'mauvaise':                 'Mauvaise',
  'tr_s_mauvaise':            'Tres mauvaise',

  // ── Adaptation / Handicap ───────────────────────────────────────────────
  'tr_s_adapt_es':            'Tres adaptees',
  'tr_s_adapt_e':             'Tres adapte(e)',
  'moyennement_adapt_es':     'Moyennement adaptees',
  'moyennement_adapt_e':      'Moyennement adapte(e)',
  'peu_adapt_es':             'Peu adaptees',
  'peu_adapt_e':              'Peu adapte(e)',
  'pas_adapt_es':             'Pas adaptees',
  'pas_adapt_e':              'Pas adapte(e)',
  'pas_du_tout_adapt_e':      'Pas du tout adapte(e)',

  // ── Oui / Non / Autres reponses simples ─────────────────────────────────
  'oui':                      'Oui',
  'non':                      'Non',
  'ne_sait_pas':              'Ne sait pas',
  'sans_opinion':             'Sans opinion',

  // ── Genre / Identite ────────────────────────────────────────────────────
  'homme':                    'Homme',
  'femme':                    'Femme',
  'non_binaire':              'Non binaire',
  'pr_f_re_ne_pas_r_pondre':  'Prefere ne pas repondre',
  'prefer_not_to_say':        'Prefere ne pas repondre',

  // ── Niveaux d'accord ────────────────────────────────────────────────────
  'tout_fait_d_accord':       'Tout a fait d\'accord',
  'd_accord':                 'D\'accord',
  'neutre':                   'Neutre',
  'pas_d_accord':             'Pas d\'accord',
  'pas_du_tout_d_accord':     'Pas du tout d\'accord',

  // ── Logement ────────────────────────────────────────────────────────────
  'r_sidence_universitaire':  'Residence universitaire',
  'logement_priv_':           'Logement prive',
  'chez_les_parents':         'Chez les parents',
  'colocation':               'Colocation',

  // ── Annees / Niveaux ────────────────────────────────────────────────────
  '1_re_ann_e':               '1ere annee',
  '2_me_ann_e':               '2eme annee',
  '3_me_ann_e':               '3eme annee',
  'master':                   'Master',
  'doctorat':                 'Doctorat',

  // Patterns courts generes par Kobo (chiffre seul)
  '1':  'Oui',
  '2':  'Non',
};

// ─── Restauration heuristique des accents francais ────────────────────────
// Kobo remplace les caracteres accentues par des underscores lors de la
// generation des noms de choix. On ne peut pas deviner a 100% l'accent
// d'origine (e/e/e, a/a, etc.), mais on peut corriger les mots francais les
// plus frequents dans les enquetes (tres, etre, etudiant, a l'aise, etc.)
// via une table de mots -> mots accentues, appliquee apres la capitalisation.
const ACCENT_WORD_FIXES: Record<string, string> = {
  'tres':        'très',
  'tr s':        'très',
  'etre':        'être',
  'etudiant':    'étudiant',
  'etudiants':   'étudiants',
  'etudiante':   'étudiante',
  'etudiantes':  'étudiantes',
  'etudiantine': 'étudiantine',
  'universite':  'université',
  'universit':   'université',
  'preparer':    'préparer',
  'prepare':     'préparé',
  'prepares':    'préparés',
  'preparee':    'préparée',
  'preparees':   'préparées',
  'emporte':     'emporté',
  'emportes':    'emportés',
  'difficile':   'difficile',
  'comprendre':  'comprendre',
  'redige':      'rédigé',
  'rediger':     'rédiger',
  'redig':       'rédig',
  'eleve':       'élevé',
  'eleves':      'élevés',
  'donnees':     'données',
  'credits':     'crédits',
  'credit':      'crédit',
  'cr dits':     'crédits',
  'a':           'à',
  'aise':        'aise',
  'maison':      'maison',
  'soi':         'soi',
  'meme':        'même',
  'cybercafe':   'cybercafé',
  'francais':    'français',
  'francaise':   'française',
  'fran ai':     'français',
  'fran aise':   'française',
  'artificielle':'artificielle',
  'artif':       'artificielle',
  'utilise':     'utilise',
  'cours':       'cours',
  'gargotes':    'gargotes',
  'repas':       'repas',
  'klsmd':       'klsmd',
};

// ─── Phrases completes courantes (formulaires "satisfaction" / "aisance") ──
// Cle = version normalisee (espaces, minuscules, sans accents) du libelle
// produit par heuristicDecode AVANT correction d'accents.
const PHRASE_FIXES: Record<string, string> = {
  // ── Niveau d'aisance ────────────────────────────────────────────────────
  'je suis tr s l aise pour suivre d':        "Je suis très à l'aise pour suivre des cours",
  'je suis tr s l aise pour suivre des cours': "Je suis très à l'aise pour suivre des cours",
  'je suis tr s l aise pour compre':          "Je suis très à l'aise pour comprendre",
  'je suis tr s l aise pour comprendre':      "Je suis très à l'aise pour comprendre",
  'je suis tr s l aise pour r diger':         "Je suis très à l'aise pour rédiger",
  'je suis tr s l aise pour rediger':         "Je suis très à l'aise pour rédiger",
  'je suis peu pr s l aise pour sui':         "Je suis peu à l'aise pour suivre des cours",
  'je suis peu pr s l aise pour suivre':      "Je suis peu à l'aise pour suivre des cours",
  'je suis peu pr s l aise pour co':          "Je suis peu à l'aise pour comprendre",
  'je suis peu pr s l aise pour comprendre':  "Je suis peu à l'aise pour comprendre",
  'je suis peu pr s l aise pour r di':        "Je suis peu à l'aise pour rédiger",
  'je suis peu pr s l aise pour rediger':     "Je suis peu à l'aise pour rédiger",
  'je me d brouille tant bien que':           "Je me débrouille tant bien que mal",
  'je me debrouille tant bien que':           "Je me débrouille tant bien que mal",
  'il m est difficile de suivre les c':       "Il m'est difficile de suivre les cours",
  'il m est difficile de suivre les cours':   "Il m'est difficile de suivre les cours",
  'il m est difficile de comprendre':         "Il m'est difficile de comprendre",
  'il m est difficile de r diger des t':      "Il m'est difficile de rédiger des textes",
  'il m est difficile de rediger des textes': "Il m'est difficile de rédiger des textes",

  // ── Soutien / outils ────────────────────────────────────────────────────
  'je compte sur le soutien de me':           "Je compte sur le soutien de mes proches",
  'je compte sur le soutien de mes proches':  "Je compte sur le soutien de mes proches",
  'j utilise l intelligence artif':           "J'utilise l'intelligence artificielle",
  'j utilise l intelligence artificielle':    "J'utilise l'intelligence artificielle",
  'je prends des cours de fran ai':           "Je prends des cours de français",
  'je prends des cours de francais':          "Je prends des cours de français",

  // ── Lieux de connexion / acces internet ────────────────────────────────
  'dans un cybercaf':                         "Dans un cybercafé",
  'dans un cybercafe':                        "Dans un cybercafé",
  'chez vous wifi':                           "Chez vous (wifi)",
  'partout par des cr dits de do':            "Partout, par des crédits de données",
  'partout par des credits de don':           "Partout, par des crédits de données",
  'a l universit l ext rieur d':              "À l'université, à l'extérieur des salles de cours",
  'a l universite l exterieur d':             "À l'université, à l'extérieur des salles de cours",

  // ── Repas ────────────────────────────────────────────────────────────────
  'repas emport s pr par s de l':             "Repas emporté, préparé soi-même de la maison",
  'repas emportes prepares de la maison':     "Repas emporté, préparé soi-même de la maison",
  'repas la maison':                          "Repas à la maison",
  'pas de repas entre les repas d':           "Pas de repas entre les repas principaux",
  'pas de repas entre les repas principaux':  "Pas de repas entre les repas principaux",
  'dans les gargotes':                        "Dans les gargotes",

  // ── Options generiques de formulaire (codes Kobo non renommes) ──────────
  'option 1':                                 "Option 1",
  'option 2':                                 "Option 2",
  'option 1 option 2':                        "Option 1, Option 2",
  'option 1 dehors':                          "Option 1, Dehors",
  'option 1 option 2 dehors':                 "Option 1, Option 2, Dehors",
  'option 1 option 2 la kslmd':               "Option 1, Option 2, autre (saisie libre)",
  'option 1 option 2 dans un espace d':       "Option 1, Option 2, dans un espace de discussion",
  'la kslmd':                                 "Autre (saisie libre)",
};

function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Normalisation heuristique pour les codes inconnus ────────────────────
// Appliquee seulement si le code n'est pas dans KOBO_LABEL_MAP.
// Strategie :
//   1. Tente une correspondance de phrase complete (PHRASE_FIXES)
//   2. Sinon, decoupe en mots, corrige les mots francais connus
//      (ACCENT_WORD_FIXES), puis capitalise.
function heuristicDecode(raw: string): string {
  const normalized = normalizeKey(raw);

  // 1. Phrase complete connue (avec ou sans troncature "...")
  // Retire une éventuelle ellipse d'affichage ("...") et le mot partiel
  // qui la précède (ex: "compre..." -> "compre" -> retiré)
  let cleaned = normalized.replace(/\.{2,}$/, '').trim();
  // Retire le dernier mot s'il fait moins de 4 caractères (probable troncature)
  const lastWordMatch = cleaned.match(/^(.*)\s(\S{1,4})$/);
  const withoutShortTail = lastWordMatch ? lastWordMatch[1] : cleaned;

  if (PHRASE_FIXES[normalized]) return PHRASE_FIXES[normalized];
  if (PHRASE_FIXES[cleaned]) return PHRASE_FIXES[cleaned];
  if (PHRASE_FIXES[withoutShortTail]) return PHRASE_FIXES[withoutShortTail];

  const trimmed = cleaned.replace(/\s*(d|de|du|des|l|la|le|les|s)$/, '$1').trim();
  if (PHRASE_FIXES[normalized]) return PHRASE_FIXES[normalized];
  if (PHRASE_FIXES[trimmed]) return PHRASE_FIXES[trimmed];

  // 2. Recherche par prefixe : si une phrase connue commence comme le code
  //    (utile pour les valeurs tronquees a l'affichage)
  for (const [key, value] of Object.entries(PHRASE_FIXES)) {
    if (key.startsWith(cleaned) || cleaned.startsWith(key)
      || key.startsWith(withoutShortTail) || withoutShortTail.startsWith(key)) {
      return value;
    }
  }

  // 3. Mot par mot : corrige les mots francais connus, puis capitalise
  const words = normalized.split(' ');
  const fixedWords = words.map(w => ACCENT_WORD_FIXES[w] || w);
  let result = fixedWords.join(' ');

  // Gestion des contractions ("l aise" -> "l'aise", "j utilise" -> "j'utilise")
  result = result
    .replace(/\bl aise\b/g, "l'aise")
    .replace(/\bj utilise\b/g, "j'utilise")
    .replace(/\bm est\b/g, "m'est")
    .replace(/\bd accord\b/g, "d'accord")
    .replace(/\bqu il\b/g, "qu'il")
    .replace(/\bqu elle\b/g, "qu'elle");

  // Capitalise chaque mot (sauf apres une apostrophe)
  result = result.replace(/(^|\s)([a-zàâéèêîïôûü])/g, (_m, sep, c) => sep + c.toUpperCase());

  return result.trim();
}

// ─── Fonction principale de decodage ──────────────────────────────────────
/**
 * Decode une valeur Kobo en label lisible.
 *
 * Formats geres :
 *   "1__Tr_s_satisfait_e"  → "Tres satisfait(e)"  (via table de mapping)
 *   "oui"                  → "Oui"                (via table directe)
 *   "2024-01-15T10:30:00Z" → "15/01/2024 10:30"   (dates ISO)
 *   ["a", "b"]             → "a, b"               (tableaux)
 *   null / undefined       → ""                   (vide)
 */
export function decodeKoboValue(value: unknown, choices?: Record<string, string>): string {
  if (value === null || value === undefined || value === '') return '';

  // Tableaux : decoder chaque element
  if (Array.isArray(value)) {
    return value.map(v => decodeKoboValue(v, choices)).filter(Boolean).join(', ');
  }

  // Objets : serialiser (cas rare)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const str = String(value).trim();
  if (!str) return '';

  // ── Carte dynamique (depuis le schema KoboToolbox) ───────────────────────
  // Source de verite : reflete automatiquement les libelles definis dans le
  // formulaire Kobo (avec accents), y compris pour les valeurs select_multiple
  // qui contiennent plusieurs codes separes par des espaces.
  if (choices) {
    if (choices[str]) return choices[str];
    if (str.includes(' ')) {
      const parts = str.split(' ').filter(Boolean);
      if (parts.every(p => choices[p])) {
        return parts.map(p => choices[p]).join(', ');
      }
    }
  }

  // ── Dates ISO ────────────────────────────────────────────────────────────
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    try {
      return new Date(str).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return str; }
  }

  // ── Numeros seuls (IDs Kobo) ─────────────────────────────────────────────
  if (/^\d+$/.test(str)) return str;

  // ── Pattern Kobo : "123__code_label" ou "1__label" ──────────────────────
  const koboMatch = str.match(/^\d+__(.+)$/);
  if (koboMatch) {
    const codePart = koboMatch[1].toLowerCase();
    if (KOBO_LABEL_MAP[codePart]) return KOBO_LABEL_MAP[codePart];
    return heuristicDecode(koboMatch[1]);
  }

  // ── Code direct sans prefixe numerique ──────────────────────────────────
  const lower = str.toLowerCase();
  if (KOBO_LABEL_MAP[lower]) return KOBO_LABEL_MAP[lower];

  // ── Heuristique generique ────────────────────────────────────────────────
  // Decode si ca ressemble a un code Kobo mal formate :
  //  - contient un underscore (avec ou sans espace), ex: "option_1 option_2"
  //  - OU ressemble a un libelle Kobo deja partiellement "humanise" mais sans
  //    accents (mots Capitalises separes par des espaces, sans ponctuation),
  //    ex: "Je Suis Tr S L Aise Pour Suivre D"
  const looksLikeMangledKobo =
    str.includes('_') ||
    (/^[A-Z][a-zàâéèêîïôûü]*(\s[A-Za-z][a-zàâéèêîïôûü]*)*(\s?\.{2,})?$/.test(str) && PHRASE_FIXES_HAS_MATCH(str));

  if (looksLikeMangledKobo) {
    return heuristicDecode(str);
  }

  return str;
}

// Verifie si une chaine (normalisee) correspond a une entree connue de
// PHRASE_FIXES (exacte, tronquee, ou par prefixe) — evite de toucher au
// texte libre qui ne correspond a aucun motif connu.
function PHRASE_FIXES_HAS_MATCH(str: string): boolean {
  const normalized = normalizeKey(str);
  const cleaned = normalized.replace(/\.{2,}$/, '').trim();
  const lastWordMatch = cleaned.match(/^(.*)\s(\S{1,4})$/);
  const withoutShortTail = lastWordMatch ? lastWordMatch[1] : cleaned;
  if (PHRASE_FIXES[normalized] || PHRASE_FIXES[cleaned] || PHRASE_FIXES[withoutShortTail]) return true;
  for (const key of Object.keys(PHRASE_FIXES)) {
    if (key.startsWith(cleaned) || cleaned.startsWith(key)
      || key.startsWith(withoutShortTail) || withoutShortTail.startsWith(key)) return true;
  }
  return false;
}

// ─── Decodage d'une valeur pour l'affichage UI (avec fallback "—") ─────────
export function displayKoboValue(value: unknown, choices?: Record<string, string>): string {
  const decoded = decodeKoboValue(value, choices);
  return decoded || '—';
}

// ─── Decodage d'une valeur pour l'export (vide = chaine vide) ─────────────
export function exportKoboValue(value: unknown, choices?: Record<string, string>): string {
  return decodeKoboValue(value, choices);
}
