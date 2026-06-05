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

// ─── Normalisation heuristique pour les codes inconnus ────────────────────
// Appliquee seulement si le code n'est pas dans KOBO_LABEL_MAP.
// Strategle : remplace underscores multiples par un seul espace,
// capitalise la premiere lettre de chaque mot, gere les cas courants.
function heuristicDecode(raw: string): string {
  return raw
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
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
export function decodeKoboValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  // Tableaux : decoder chaque element
  if (Array.isArray(value)) {
    return value.map(decodeKoboValue).filter(Boolean).join(', ');
  }

  // Objets : serialiser (cas rare)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const str = String(value).trim();
  if (!str) return '';

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
  // Decode seulement si ca ressemble a un code Kobo (contient des underscores
  // et pas d'espaces) — evite de modifier les textes libres.
  if (str.includes('_') && !str.includes(' ')) {
    return heuristicDecode(str);
  }

  return str;
}

// ─── Decodage d'une valeur pour l'affichage UI (avec fallback "—") ─────────
export function displayKoboValue(value: unknown): string {
  const decoded = decodeKoboValue(value);
  return decoded || '—';
}

// ─── Decodage d'une valeur pour l'export (vide = chaine vide) ─────────────
export function exportKoboValue(value: unknown): string {
  return decodeKoboValue(value);
}
