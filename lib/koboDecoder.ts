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
export const KOBO_LABEL_MAP: Record<string, string> = {
  // ── Satisfaction / Qualite ──────────────────────────────────────────────
  'tr_s_satisfait_e':         'Très satisfait(e)',
  'satisfait_e':              'Satisfait(e)',
  'peu_satisfait_e':          'Peu satisfait(e)',
  'pas_du_tout_satisfait_e':  'Pas du tout satisfait(e)',
  'tr_s_insatisfait_e':       'Très insatisfait(e)',

  // ── Frequence ───────────────────────────────────────────────────────────
  'tr_s_souvent':             'Très souvent',
  'souvent':                  'Souvent',
  'parfois':                  'Parfois',
  'rarement':                 'Rarement',
  'jamais':                   'Jamais',

  // ── Qualite de vie / Services ────────────────────────────────────────────
  'tr_s_bonne':               'Très bonne',
  'bonne':                    'Bonne',
  'moyenne':                  'Moyenne',
  'mauvaise':                 'Mauvaise',
  'tr_s_mauvaise':            'Très mauvaise',

  // ── Adaptation / Handicap ───────────────────────────────────────────────
  'tr_s_adapt_es':            'Très adaptées',
  'tr_s_adapt_e':             'Très adapté(e)',
  'moyennement_adapt_es':     'Moyennement adaptées',
  'moyennement_adapt_e':      'Moyennement adapté(e)',
  'peu_adapt_es':             'Peu adaptées',
  'peu_adapt_e':              'Peu adapté(e)',
  'pas_adapt_es':             'Pas adaptées',
  'pas_adapt_e':              'Pas adapté(e)',
  'pas_du_tout_adapt_e':      'Pas du tout adapté(e)',

  // ── Oui / Non ────────────────────────────────────────────────────────────
  'oui':                      'Oui',
  'non':                      'Non',
  'ne_sait_pas':              'Ne sait pas',
  'sans_opinion':             'Sans opinion',
  'autre':                    'Autre',
  'aucun':                    'Aucun',

  // ── Genre / Identite ────────────────────────────────────────────────────
  'homme':                    'Homme',
  'femme':                    'Femme',
  'non_binaire':              'Non binaire',
  'pr_f_re_ne_pas_r_pondre':  'Préfère ne pas répondre',
  'prefer_not_to_say':        'Préfère ne pas répondre',

  // ── Niveaux d'accord ────────────────────────────────────────────────────
  'tout_fait_d_accord':       "Tout à fait d'accord",
  'd_accord':                 "D'accord",
  'neutre':                   'Neutre',
  'pas_d_accord':             "Pas d'accord",
  'pas_du_tout_d_accord':     "Pas du tout d'accord",

  // ── Logement type ────────────────────────────────────────────────────────
  'r_sidence_universitaire':              'Résidence universitaire',
  'cit_universitaire':                    'Cité universitaire',
  'logement_priv_':                       'Logement privé',
  'logement_lou_mis_disposition':         'Logement loué / mis à disposition',
  'logement_lou_mis_disposi':             'Logement loué / mis à disposition',
  'chez_les_parents':                     'Chez les parents',
  'colocation':                           'Colocation',
  'chez_d_autres_membres_de_la_fa':       "Chez d'autres membres de la famille",
  'chez_d_autres_membres_de_la_famille':  "Chez d'autres membres de la famille",
  'autre_h_bergement':                    'Autre hébergement',
  'une_maison_familiale':                 'Une maison familiale',
  'une_location':                         'Une location',
  'une_propri_t_personnelle_acqu':        'Une propriété personnelle acquise',

  // ── Annees / Niveaux d'etudes ────────────────────────────────────────────
  '1_re_ann_e':               '1ère année',
  '2_me_ann_e':               '2ème année',
  '3_me_ann_e':               '3ème année',
  'master':                   'Master',
  'doctorat':                 'Doctorat',
  'secondaire_lyc_e':         'Secondaire — Lycée',
  'secondaire_coll_ge':       'Secondaire — Collège',
  'primaire_epp':             'Primaire (EPP)',
  'sup_rieur':                'Supérieur',
  'aucun_e':                  'Aucun(e)',

  // ── Electricite / Acces reseau ───────────────────────────────────────────
  'acc_s_au_r_seau_public':                   'Accès au réseau public (JIRAMA)',
  'acc_s_au_r_seau_public_jirama_':           'Accès au réseau public (JIRAMA)',
  'acc_s_un_r_seau_priv_':                    'Accès à un réseau privé',
  'pas_d_acc_s_r_seau_et_utilisatio':         "Pas d'accès réseau, utilisation de groupe électrogène",
  'pas_d_lectricit_du_tout':                  "Pas d'électricité du tout",

  // ── Situation matrimoniale ───────────────────────────────────────────────
  'c_libataire_sans_enfant':                  'Célibataire sans enfant',
  'c_libataire_avec_enfant':                  'Célibataire avec enfant',
  'mari_concubinage_avec_enfant':             'Marié(e) / Concubinage avec enfant',
  'mari_concubinage_sans_enfant':             'Marié(e) / Concubinage sans enfant',

  // ── Revenus parents ──────────────────────────────────────────────────────
  'activit_informelle':                             'Activité informelle',
  'activit_professionnelle_forme_':                 'Activité professionnelle formelle',
  'activit_profesionnelle_formel':                  'Activité professionnelle formelle',
  'activit_profesionnelle_formel_ac':               'Activité professionnelle formelle (agricole)',
  'activit_professionnelle_forme_r':                'Activité professionnelle formelle (retraité)',
  'rente_ex_issue_de_location':                     'Rente / issue de location',
  'activit_informelle_rente_ex_issue':              'Activité informelle / Rente',
  'maximum_6_000_mga_par_jour':                     'Maximum 6 000 MGA / jour',
  'entre_6_000_et_8_000_mga_par_j':                 'Entre 6 000 et 8 000 MGA / jour',
  'entre_8_000_et_14_000_mga_par':                  'Entre 8 000 et 14 000 MGA / jour',
  'entre_410_000_et_1_000_000_mga':                 'Entre 410 000 et 1 000 000 MGA / mois',
  'je_suis_incapable_d_es':                         "Je suis incapable d'estimer",
  'je_ne_souhaite_pas_r_pondre':                    'Je ne souhaite pas répondre',
  'je_ne_connais_pas_assez_les_re':                 'Je ne connais pas assez les revenus',

  // ── Region d'origine ─────────────────────────────────────────────────────
  'd_autres_r_gions_loign_es_toute':                "D'autres régions éloignées",
  'des_autres_r_gions_limitrophes':                 'Des autres régions limitrophes',
  'de_fianarantsoa_et_ses_alentou':                 'De Fianarantsoa et ses alentours',
  'de_la_campagne_de_la_r_gion':                    'De la campagne de la région',

  // ── Famille / Menage ─────────────────────────────────────────────────────
  'm_nage_biparental_p_re_et_m_re':   'Ménage biparental — Père et Mère',
  'm_nage_monoparental_p_re_ou':      'Ménage monoparental — Père ou Mère',
  'elev_e_par_d_autres_personnes_i':  "Élevé(e) par d'autres personnes",
  'elev_e_par_un_autre_membre_de':    'Élevé(e) par un autre membre de la famille',

  // ── Difficultes logement / eloignement ───────────────────────────────────
  'oui_l_loignement_est_le_plus_gr':  "Oui, l'éloignement est le plus grand problème",
  'oui_l_loignement_est_parfois_pe':  "Oui, l'éloignement est parfois pénible",
  'non_je_n_ai_de_probl_me_cause':    "Non, je n'ai pas de problème causé par la distance",
  'non_au_contraire_je_suis_conte':   "Non, au contraire je suis content(e)",

  // ── Difficulte acces logement ────────────────────────────────────────────
  'oui_c_tait_tr_s_difficile':        "Oui, c'était très difficile",
  'moyennent_difficile':              'Moyennement difficile',
  'moyennement_difficile':            'Moyennement difficile',
  'non_je_n_ai_pas_eu_de_probl_mes':  "Non, je n'ai pas eu de problèmes",

  // ── Loyer mensuel ────────────────────────────────────────────────────────
  'c_est_gratuit':            "C'est gratuit",
  'entre_10_000_et_20_000_mga': 'Entre 10 000 et 20 000 MGA',
  'entre_20_000_et_50_000_mga': 'Entre 20 000 et 50 000 MGA',
  'plus_de_50_000_mga':       'Plus de 50 000 MGA',

  // ── Satisfaction logement ────────────────────────────────────────────────
  'elle_est_probl_matique_mais_je_n': "Elle est problématique mais je n'ai pas le choix",
  'elle_est_correcte':                'Elle est correcte',
  'elle_est_tr_s_satisfaisante':      'Elle est très satisfaisante',
  'elle_est_insupportable':           'Elle est insupportable',

  // ── Problemes logement ───────────────────────────────────────────────────
  'trop_de_personnes_dans_le_m_me':   'Trop de personnes dans le même espace',
  'le_prix_le_manque_de_place_exig':  'Le prix, le manque de place / exiguïté',
  'le_prix_trop_de_personnes_dans':   'Le prix, trop de personnes dans le même espace',
  'le_prix_l_ins_curit_autres':       "Le prix, l'insécurité, autres",
  'le_prix_l_insalubrit_autres':      "Le prix, l'insalubrité, autres",
  'l_ins_curit':                      "L'insécurité",
  'le_prix':                          'Le prix',

  // ── Comment trouve le logement ───────────────────────────────────────────
  'gr_ce_une_association_r_gion':   'Grâce à une association / région',
  'gr_ce_des_amis':                 'Grâce à des amis',
  'gr_ce_une_annonce':              'Grâce à une annonce',
  'gr_ce_un_membre_de_la_famill':   'Grâce à un membre de la famille',

  // ── Bizutage ─────────────────────────────────────────────────────────────
  'c_est_n_cessaire_pour_montrer':  "C'est nécessaire pour montrer son appartenance",
  'c_est_amusant':                  "C'est amusant",

  // Patterns courts generes par Kobo (chiffre seul)
  '1':  'Oui',
  '2':  'Non',
};

// ─── Restauration heuristique des accents francais ────────────────────────
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
  // Ajouts
  'acces':       'accès',
  'acc s':       'accès',
  'reseau':      'réseau',
  'r seau':      'réseau',
  'electricite': 'électricité',
  'lectricit':   'électricité',
  'secondaire':  'Secondaire',
  'primaire':    'Primaire',
  'superieur':   'Supérieur',
  'celibataire': 'célibataire',
  'menage':      'ménage',
  'm nage':      'ménage',
  'biparental':  'biparental',
  'monoparental':'monoparental',
  'region':      'région',
  'r gion':      'région',
  'eloignement': 'éloignement',
  'gratuit':     'gratuit',
  'problema':    'problèma',
  'probleme':    'problème',
  'probl me':    'problème',
  'cite':        'cité',
  'loge':        'logé',
  'loyer':       'loyer',
};

// ─── Phrases completes courantes ──────────────────────────────────────────
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

  // ── Lieux de connexion ───────────────────────────────────────────────────
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

  // ── Options generiques ───────────────────────────────────────────────────
  'option 1':                                 "Option 1",
  'option 2':                                 "Option 2",
  'option 1 option 2':                        "Option 1, Option 2",
  'option 1 dehors':                          "Option 1, Dehors",
  'option 1 option 2 dehors':                 "Option 1, Option 2, Dehors",
  'option 1 option 2 la kslmd':               "Option 1, Option 2, autre (saisie libre)",
  'option 1 option 2 dans un espace d':       "Option 1, Option 2, dans un espace de discussion",
  'la kslmd':                                 "Autre (saisie libre)",

  // ── Electricite / Acces ──────────────────────────────────────────────────
  'acc s au r seau public':                   "Accès au réseau public (JIRAMA)",
  'acc s un r seau priv':                     "Accès à un réseau privé",
  'pas d acc s r seau et utilisatio':         "Pas d'accès réseau, groupe électrogène",
  'pas d lectricit du tout':                  "Pas d'électricité du tout",

  // ── Niveau d'etudes ──────────────────────────────────────────────────────
  'secondaire lyc e':                         "Secondaire — Lycée",
  'secondaire coll ge':                       "Secondaire — Collège",
  'primaire epp':                             "Primaire (EPP)",

  // ── Logement ─────────────────────────────────────────────────────────────
  'cit universitaire':                        "Cité universitaire",
  'logement lou mis disposi':                 "Logement loué / mis à disposition",
  'logement lou mis disposition':             "Logement loué / mis à disposition",
  'chez d autres membres de la fa':           "Chez d'autres membres de la famille",
  'autre h bergement':                        "Autre hébergement",
  'une maison familiale':                     "Une maison familiale",
  'une location':                             "Une location",
  'une propri t personnelle acqu':            "Une propriété personnelle acquise",

  // ── Situation matrimoniale ───────────────────────────────────────────────
  'c libataire sans enfant':                  "Célibataire sans enfant",
  'c libataire avec enfant':                  "Célibataire avec enfant",
  'mari concubinage avec enfant':             "Marié(e) / Concubinage avec enfant",
  'mari concubinage sans enfant':             "Marié(e) / Concubinage sans enfant",

  // ── Revenus ──────────────────────────────────────────────────────────────
  'activit informelle':                       "Activité informelle",
  'activit professionnelle forme':            "Activité professionnelle formelle",
  'activit profesionnelle formel':            "Activité professionnelle formelle",
  'activit profesionnelle formel ac':         "Activité professionnelle formelle (agricole)",
  'activit professionnelle forme r':          "Activité professionnelle formelle (retraité)",
  'rente ex issue de location':               "Rente / issue de location",
  'activit informelle rente ex issue':        "Activité informelle / Rente",
  'maximum 6 000 mga par jour':               "Maximum 6 000 MGA / jour",
  'entre 6 000 et 8 000 mga par j':           "Entre 6 000 et 8 000 MGA / jour",
  'entre 8 000 et 14 000 mga par':            "Entre 8 000 et 14 000 MGA / jour",
  'entre 410 000 et 1 000 000 mga':           "Entre 410 000 et 1 000 000 MGA / mois",
  'je suis incapable d es':                   "Je suis incapable d'estimer",
  'je ne souhaite pas r pondre':              "Je ne souhaite pas répondre",
  'je ne connais pas assez les re':           "Je ne connais pas assez les revenus",

  // ── Region ───────────────────────────────────────────────────────────────
  'd autres r gions loign es toute':          "D'autres régions éloignées",
  'des autres r gions limitrophes':           "Des autres régions limitrophes",
  'de fianarantsoa et ses alentou':           "De Fianarantsoa et ses alentours",
  'de la campagne de la r gion':              "De la campagne de la région",

  // ── Famille / Menage ─────────────────────────────────────────────────────
  'm nage biparental p re et m re':           "Ménage biparental — Père et Mère",
  'm nage monoparental p re ou':              "Ménage monoparental — Père ou Mère",
  'elev e par d autres personnes i':          "Élevé(e) par d'autres personnes",
  'elev e par un autre membre de':            "Élevé(e) par un autre membre de la famille",

  // ── Eloignement ──────────────────────────────────────────────────────────
  'oui l loignement est le plus gr':          "Oui, l'éloignement est le plus grand problème",
  'oui l loignement est parfois pe':          "Oui, l'éloignement est parfois pénible",
  'non je n ai de probl me cause':            "Non, je n'ai pas de problème causé par la distance",
  'non au contraire je suis conte':           "Non, au contraire je suis content(e)",

  // ── Difficulte acces logement ────────────────────────────────────────────
  'oui c tait tr s difficile':                "Oui, c'était très difficile",
  'moyennent difficile':                      "Moyennement difficile",
  'non je n ai pas eu de probl mes':          "Non, je n'ai pas eu de problèmes",

  // ── Loyer ────────────────────────────────────────────────────────────────
  'c est gratuit':            "C'est gratuit",
  'entre 10 000 et 20 000 mga': "Entre 10 000 et 20 000 MGA",
  'entre 20 000 et 50 000 mga': "Entre 20 000 et 50 000 MGA",
  'plus de 50 000 mga':       "Plus de 50 000 MGA",

  // ── Satisfaction logement ────────────────────────────────────────────────
  'elle est probl matique mais je n': "Elle est problématique mais je n'ai pas le choix",
  'elle est correcte':                "Elle est correcte",
  'elle est tr s satisfaisante':      "Elle est très satisfaisante",
  'elle est insupportable':           "Elle est insupportable",

  // ── Problemes logement ───────────────────────────────────────────────────
  'trop de personnes dans le m me':   "Trop de personnes dans le même espace",
  'le prix le manque de place exig':  "Le prix, le manque de place / exiguïté",
  'le prix trop de personnes dans':   "Le prix, trop de personnes dans le même espace",
  'le prix l ins curit autres':       "Le prix, l'insécurité, autres",
  'le prix l insalubrit autres':      "Le prix, l'insalubrité, autres",
  'l ins curit':                      "L'insécurité",

  // ── Comment trouve logement ──────────────────────────────────────────────
  'gr ce une association r gion':     "Grâce à une association / région",
  'gr ce des amis':                   "Grâce à des amis",
  'gr ce une annonce':                "Grâce à une annonce",
  'gr ce un membre de la famill':     "Grâce à un membre de la famille",

  // ── Bizutage ─────────────────────────────────────────────────────────────
  'c est n cessaire pour montrer':    "C'est nécessaire pour montrer son appartenance",
  'c est amusant':                    "C'est amusant",
};

function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function heuristicDecode(raw: string): string {
  const normalized = normalizeKey(raw);

  let cleaned = normalized.replace(/\.{2,}$/, '').trim();
  const lastWordMatch = cleaned.match(/^(.*)\s(\S{1,4})$/);
  const withoutShortTail = lastWordMatch ? lastWordMatch[1] : cleaned;

  if (PHRASE_FIXES[normalized]) return PHRASE_FIXES[normalized];
  if (PHRASE_FIXES[cleaned]) return PHRASE_FIXES[cleaned];
  if (PHRASE_FIXES[withoutShortTail]) return PHRASE_FIXES[withoutShortTail];

  const trimmed = cleaned.replace(/\s*(d|de|du|des|l|la|le|les|s)$/, '$1').trim();
  if (PHRASE_FIXES[trimmed]) return PHRASE_FIXES[trimmed];

  for (const [key, value] of Object.entries(PHRASE_FIXES)) {
    if (key.startsWith(cleaned) || cleaned.startsWith(key)
      || key.startsWith(withoutShortTail) || withoutShortTail.startsWith(key)) {
      return value;
    }
  }

  const words = normalized.split(' ');
  const fixedWords = words.map(w => ACCENT_WORD_FIXES[w] || w);
  let result = fixedWords.join(' ');

  result = result
    .replace(/\bl aise\b/g, "l'aise")
    .replace(/\bj utilise\b/g, "j'utilise")
    .replace(/\bm est\b/g, "m'est")
    .replace(/\bd accord\b/g, "d'accord")
    .replace(/\bqu il\b/g, "qu'il")
    .replace(/\bqu elle\b/g, "qu'elle");

  result = result.replace(/(^|\s)([a-zàâéèêîïôûü])/g, (_m, sep, c) => sep + c.toUpperCase());

  return result.trim();
}

export function decodeKoboValue(value: unknown, choices?: Record<string, string>): string {
  if (value === null || value === undefined || value === '') return '';

  if (Array.isArray(value)) {
    return value.map(v => decodeKoboValue(v, choices)).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const str = String(value).trim();
  if (!str) return '';

  // ── Carte dynamique (depuis le schema KoboToolbox) ────────────────────
  if (choices) {
    if (choices[str]) return choices[str];
    if (str.includes(' ')) {
      const parts = str.split(' ').filter(Boolean);
      if (parts.every(p => choices[p])) {
        return parts.map(p => choices[p]).join(', ');
      }
    }
  }

  // ── Dates ISO ─────────────────────────────────────────────────────────
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    try {
      return new Date(str).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return str; }
  }

  // ── Numeros seuls ─────────────────────────────────────────────────────
  if (/^\d+$/.test(str)) return str;

  // ── Pattern Kobo : "123__code_label" ──────────────────────────────────
  const koboMatch = str.match(/^\d+__(.+)$/);
  if (koboMatch) {
    const codePart = koboMatch[1].toLowerCase();
    if (KOBO_LABEL_MAP[codePart]) return KOBO_LABEL_MAP[codePart];
    return heuristicDecode(koboMatch[1]);
  }

  // ── Code direct (underscore) ──────────────────────────────────────────
  const lower = str.toLowerCase();
  if (KOBO_LABEL_MAP[lower]) return KOBO_LABEL_MAP[lower];

  // ── Heuristique si code Kobo ──────────────────────────────────────────
  const looksLikeMangledKobo =
    str.includes('_') ||
    (/^[A-Z][a-zàâéèêîïôûü]*(\s[A-Za-z][a-zàâéèêîïôûü]*)*(\s?\.{2,})?$/.test(str) && PHRASE_FIXES_HAS_MATCH(str));

  if (looksLikeMangledKobo) {
    return heuristicDecode(str);
  }

  return str;
}

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

export function displayKoboValue(value: unknown, choices?: Record<string, string>): string {
  const decoded = decodeKoboValue(value, choices);
  return decoded || '—';
}

export function exportKoboValue(value: unknown, choices?: Record<string, string>): string {
  return decodeKoboValue(value, choices);
}
