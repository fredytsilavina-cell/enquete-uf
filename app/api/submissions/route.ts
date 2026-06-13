import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRoleFromToken } from '@/lib/userRole';
import * as XLSX from 'xlsx';
import { exportKoboValue } from '@/lib/koboDecoder';

// ─── Mapping des clés Kobo → labels lisibles ───────────────────────────────
// Ces labels apparaissent en en-tête dans l'export XLSX.
// Ajouter ici toute nouvelle question.

const FORM1_LABELS: Record<string, string> = {
  '_id': 'ID Kobo',
  '_submission_time': 'Date de soumission',
  '_submitted_by': 'Soumis par',
  'start': 'Debut',
  'end': 'Fin',
  'device_fp': 'Empreinte appareil',
  'G1_Pensez_vous_que_ns_votre_universit_': 'G1 - Pensez-vous que votre universite prend en compte le genre ?',
  'G2_Avez_vous_d_j_enre_l_universit_': 'G2 - Avez-vous deja ete victime de discrimination a l\'universite ?',
  'G3_Les_infrastructu_tuation_de_handicap_': 'G3 - Les infrastructures sont-elles adaptees aux personnes en situation de handicap ?',
};

const FORM2_LABELS: Record<string, string> = {
  '_id': 'ID Kobo',
  '_submission_time': 'Date de soumission',
  '_submitted_by': 'Soumis par',
  'start': 'Debut',
  'end': 'Fin',
  'device_fp': 'Empreinte appareil',
};

// Colonnes a masquer dans l'export (metadonnees internes Kobo)
const HIDDEN_KEYS = new Set([
  'formhub/uuid', 'meta/instanceID', 'meta/rootUuid',
  '_attachments', '_geolocation', '_tags', '_notes',
  '_validation_status', '_status',
  '__version__', '_xform_id_string', '_uuid',
]);

// Colonnes prioritaires (apparaissent en premier dans l'export)
const PRIORITY_KEYS_FORM1 = [
  '_id', '_submission_time', '_submitted_by', 'start', 'end', 'device_fp',
  'G1_Pensez_vous_que_ns_votre_universit_',
  'G2_Avez_vous_d_j_enre_l_universit_',
  'G3_Les_infrastructu_tuation_de_handicap_',
];
const PRIORITY_KEYS_FORM2 = [
  '_id', '_submission_time', '_submitted_by', 'start', 'end', 'device_fp',
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Feuille';
}

function parseJsonValue(value: any): any {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

function normalizeSubmission(row: any) {
  const data = parseJsonValue(row.data);
  const createdAt = row.received_at || data?._submission_time || data?.submission_time || null;
  const formId = row.form_id || data?.form || data?._form_id || data?._xform_id_string || '';
  return { id: row.id, created_at: createdAt, form: formId, payload: data || {} };
}

function labelFor(key: string, labels: Record<string, string>): string {
  if (labels[key]) return labels[key];
  // Humanise les clés Kobo automatiquement : remplace _ par espace, coupe à 80 chars
  return key.replace(/_+/g, ' ').replace(/^\s+|\s+$/g, '').substring(0, 80);
}

function formatAnswer(value: any): string {
  return exportKoboValue(value);
}

function collectAllKeys(submissions: any[], priorityKeys: string[]): string[] {
  const keySet = new Set<string>(priorityKeys);
  for (const s of submissions) {
    for (const k of Object.keys(s.payload || {})) {
      if (!HIDDEN_KEYS.has(k)) keySet.add(k);
    }
  }
  // Priority first, then the rest alphabetically
  const rest = [...keySet].filter(k => !priorityKeys.includes(k)).sort();
  return [...priorityKeys.filter(k => keySet.has(k)), ...rest];
}

// ─── Palette de couleurs professionnelles ──────────────────────────────────
const PALETTE = {
  // En-tetes
  headerBg:        '1E3A5F',  // Bleu marine fonce
  headerFg:        'FFFFFF',
  headerBorder:    'C9A84C',  // Or
  // Titre de feuille
  titleBg:         '0D1B2A',  // Bleu tres fonce
  titleFg:         'F5C842',  // Or lumineux
  // Lignes de donnees
  rowEven:         'EEF4FB',  // Bleu tres pale
  rowOdd:          'FFFFFF',
  rowFg:           '1A2B3C',
  rowBorder:       'C8D8E8',
  // Cellules vides (—)
  emptyFg:         'A0B4C8',
  // Mise en valeur : valeurs positives / negatives
  positive:        'E8F5E9',  // Vert pale
  positiveFg:      '1B5E20',
  negative:        'FFF3E0',  // Orange pale
  negativeFg:      'E65100',
  // Ligne de total / statistiques
  statBg:          'FFF8E7',
  statFg:          '7B5200',
};

// Valeurs considerees "positives" → fond vert pale dans Excel
const POSITIVE_VALUES = new Set([
  'oui', 'yes', 'satisfait', 'tres satisfait', 'satisfaite', 'tres satisfaite',
  'tres bonne', 'bonne', 'tres souvent', 'souvent', 'tres adaptees',
  'tout a fait d\'accord', 'd\'accord',
]);
// Valeurs considerees "negatives" → fond orange pale dans Excel
const NEGATIVE_VALUES = new Set([
  'non', 'no', 'pas du tout satisfait', 'pas du tout satisfaite',
  'peu satisfait', 'peu satisfaite', 'mauvaise', 'tres mauvaise',
  'jamais', 'rarement', 'pas adaptees', 'pas du tout adapte',
  'pas d\'accord', 'pas du tout d\'accord',
]);

function getCellAccent(val: string): { bg: string; fg: string } | null {
  const lower = val.toLowerCase().trim();
  if (POSITIVE_VALUES.has(lower)) return { bg: PALETTE.positive, fg: PALETTE.positiveFg };
  if (NEGATIVE_VALUES.has(lower)) return { bg: PALETTE.negative, fg: PALETTE.negativeFg };
  return null;
}

// ─── XLSX builder : une feuille stylisee professionnelle ───────────────────

function buildStyledSheet(
  submissions: any[],
  labels: Record<string, string>,
  priorityKeys: string[],
  sheetTitle: string,
): XLSX.WorkSheet {
  if (submissions.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([[`Aucune soumission pour : ${sheetTitle}`]]);
    const cell = ws['A1'];
    if (cell) cell.s = {
      font: { bold: true, sz: 12, color: { rgb: PALETTE.headerFg } },
      fill: { fgColor: { rgb: PALETTE.headerBg } },
      alignment: { horizontal: 'center' },
    };
    return ws;
  }

  const allKeys = collectAllKeys(submissions, priorityKeys);

  // Ligne 1 : titre de la feuille
  const titleRow = [sheetTitle, ...Array(allKeys.length - 1).fill('')];

  // Ligne 2 : en-tetes (labels lisibles)
  const headerRow = allKeys.map(k => labelFor(k, labels));

  // Lignes de donnees
  const dataRows = submissions.map(s =>
    allKeys.map(k => {
      if (k === '_id') return s.payload._id ?? '';
      if (k === '_submission_time') {
        const v = s.payload._submission_time || s.created_at;
        return v ? new Date(v).toLocaleString('fr-FR') : '';
      }
      return formatAnswer(s.payload[k]);
    })
  );

  const aoa = [titleRow, headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const nc = allKeys.length;
  const nr = aoa.length;

  // ── Fusion titre ───────────────────────────────────────────────────────
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: nc - 1 } }];

  // ── Style titre ────────────────────────────────────────────────────────
  const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 14, color: { rgb: PALETTE.titleFg }, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: PALETTE.titleBg } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        bottom: { style: 'medium', color: { rgb: PALETTE.headerBorder } },
        top:    { style: 'thin',   color: { rgb: '000000' } },
        left:   { style: 'thin',   color: { rgb: '000000' } },
        right:  { style: 'thin',   color: { rgb: '000000' } },
      },
    };
  }

  // ── Styles en-tetes ────────────────────────────────────────────────────
  for (let c = 0; c < nc; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
    if (cell) {
      cell.s = {
        font: { bold: true, sz: 10, color: { rgb: PALETTE.headerFg }, name: 'Calibri' },
        fill: { patternType: 'solid', fgColor: { rgb: PALETTE.headerBg } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          bottom: { style: 'medium', color: { rgb: PALETTE.headerBorder } },
          top:    { style: 'thin',   color: { rgb: '4A6A8A' } },
          left:   { style: 'thin',   color: { rgb: '2A4A6A' } },
          right:  { style: 'thin',   color: { rgb: '2A4A6A' } },
        },
      };
    }
  }

  // ── Styles lignes de donnees ────────────────────────────────────────────
  for (let r = 2; r < nr; r++) {
    const isEven = (r - 2) % 2 === 0;
    const rowBg = isEven ? PALETTE.rowEven : PALETTE.rowOdd;

    for (let c = 0; c < nc; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      const cellVal = String(ws[addr].v || '');
      const isEmpty = !cellVal || cellVal === '—' || cellVal === '';
      const accent = isEmpty ? null : getCellAccent(cellVal);

      ws[addr].s = {
        font: {
          sz: 10,
          color: { rgb: isEmpty ? PALETTE.emptyFg : (accent ? accent.fg : PALETTE.rowFg) },
          name: 'Calibri',
          italic: isEmpty,
        },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: accent ? accent.bg : rowBg },
        },
        alignment: {
          vertical: 'center',
          horizontal: c === 0 ? 'center' : 'left',
          wrapText: false,
        },
        border: {
          bottom: { style: 'hair', color: { rgb: PALETTE.rowBorder } },
          top:    { style: 'hair', color: { rgb: PALETTE.rowBorder } },
          left:   { style: 'hair', color: { rgb: PALETTE.rowBorder } },
          right:  { style: 'hair', color: { rgb: PALETTE.rowBorder } },
        },
      };
    }
  }

  // ── Largeurs de colonnes adaptatives ──────────────────────────────────
  ws['!cols'] = allKeys.map((k, i) => {
    const headerLen = headerRow[i].length;
    const dataLen = Math.max(...dataRows.map(row => String(row[i] || '').length), 0);
    const w = Math.min(Math.max(headerLen, dataLen, 12), 45);
    return { wch: w };
  });

  // ── Hauteurs de lignes ─────────────────────────────────────────────────
  ws['!rows'] = [
    { hpt: 32 },                          // titre
    { hpt: 38 },                          // en-tetes
    ...Array(nr - 2).fill({ hpt: 18 }),   // donnees
  ];

  return ws;
}

// ─── XLSX builder : feuille de couplage (Form1 + Form2 sur même ligne) ────
//
// Logique :
//   - On groupe form1 et form2 par device_fp
//   - Seuls les device_fp présents dans LES DEUX formulaires apparaissent
//   - Colonnes : [device_fp] | [toutes colonnes Form1] | [toutes colonnes Form2]
//   - En-tête sur 2 niveaux : ligne 1 = titre fusionné par section, ligne 2 = labels

function buildCouplingSheet(form1: any[], form2: any[], title1: string, title2: string): XLSX.WorkSheet {
  // Index form1 et form2 par device_fp
  const map1 = new Map<string, any>();
  const map2 = new Map<string, any>();

  for (const r of form1) {
    const fp = String(r.payload?.device_fp || '').trim();
    if (fp) map1.set(fp, r);
  }
  for (const r of form2) {
    const fp = String(r.payload?.device_fp || '').trim();
    if (fp) map2.set(fp, r);
  }

  // Intersection : device_fp présents dans les deux
  const pairedFps = [...map1.keys()].filter(fp => map2.has(fp));

  if (pairedFps.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['Aucun couplage trouvé — aucun appareil n\'a soumis les deux formulaires.']]);
    const cell = ws['A1'];
    if (cell) cell.s = {
      font: { bold: true, sz: 12, color: { rgb: PALETTE.headerFg } },
      fill: { patternType: 'solid', fgColor: { rgb: PALETTE.headerBg } },
      alignment: { horizontal: 'center' },
    };
    return ws;
  }

  // Collecter les colonnes de chaque formulaire (hors device_fp, hors clés cachées)
  const COUPLING_HIDDEN = new Set([...HIDDEN_KEYS, 'device_fp', 'instanceID']);
  const PRIORITY_F1 = PRIORITY_KEYS_FORM1.filter(k => k !== 'device_fp');
  const PRIORITY_F2 = PRIORITY_KEYS_FORM2.filter(k => k !== 'device_fp');

  const keys1Set = new Set<string>(PRIORITY_F1);
  const keys2Set = new Set<string>(PRIORITY_F2);
  for (const fp of pairedFps) {
    for (const k of Object.keys(map1.get(fp)!.payload || {})) {
      if (!COUPLING_HIDDEN.has(k)) keys1Set.add(k);
    }
    for (const k of Object.keys(map2.get(fp)!.payload || {})) {
      if (!COUPLING_HIDDEN.has(k)) keys2Set.add(k);
    }
  }
  const rest1 = [...keys1Set].filter(k => !PRIORITY_F1.includes(k)).sort();
  const rest2 = [...keys2Set].filter(k => !PRIORITY_F2.includes(k)).sort();
  const cols1 = [...PRIORITY_F1.filter(k => keys1Set.has(k)), ...rest1];
  const cols2 = [...PRIORITY_F2.filter(k => keys2Set.has(k)), ...rest2];

  // Structure colonnes : [Code appareil] | [cols Form1...] | [cols Form2...]
  const totalCols = 1 + cols1.length + cols2.length;

  // Ligne 1 : Titre global fusionné
  const titleRow = [`Couplage ${title1} × ${title2}`, ...Array(totalCols - 1).fill('')];

  // Ligne 2 : Sections fusionnées (Code appareil | Genre & Inclusion | Vie des Étudiants)
  const sectionRow = [
    'Code appareil',
    title1, ...Array(cols1.length - 1).fill(''),
    title2, ...Array(cols2.length - 1).fill(''),
  ];

  // Ligne 3 : En-têtes détaillés
  const headerRow = [
    'Code appareil (device_fp)',
    ...cols1.map(k => labelFor(k, FORM1_LABELS)),
    ...cols2.map(k => labelFor(k, FORM2_LABELS)),
  ];

  // Lignes de données
  function extractVal(payload: any, key: string, createdAt: string): string {
    if (key === '_id') return String(payload._id ?? '');
    if (key === '_submission_time') {
      const v = payload._submission_time || createdAt;
      return v ? new Date(v).toLocaleString('fr-FR') : '';
    }
    return formatAnswer(payload[key]);
  }

  const dataRows = pairedFps.map(fp => {
    const r1 = map1.get(fp)!;
    const r2 = map2.get(fp)!;
    return [
      fp,
      ...cols1.map(k => extractVal(r1.payload, k, r1.created_at)),
      ...cols2.map(k => extractVal(r2.payload, k, r2.created_at)),
    ];
  });

  const aoa = [titleRow, sectionRow, headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const nc = totalCols;
  const nr = aoa.length;

  // ── Fusions ────────────────────────────────────────────────────────────
  ws['!merges'] = [
    // Titre : toute la largeur
    { s: { r: 0, c: 0 }, e: { r: 0, c: nc - 1 } },
    // Section "Code appareil" (1 seule colonne, pas de fusion)
    // Section "Genre & Inclusion"
    { s: { r: 1, c: 1 }, e: { r: 1, c: cols1.length } },
    // Section "Vie des Étudiants"
    { s: { r: 1, c: 1 + cols1.length }, e: { r: 1, c: nc - 1 } },
  ];

  // ── Style titre ────────────────────────────────────────────────────────
  const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })];
  if (titleCell) titleCell.s = {
    font: { bold: true, sz: 14, color: { rgb: PALETTE.titleFg }, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: PALETTE.titleBg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { bottom: { style: 'medium', color: { rgb: PALETTE.headerBorder } } },
  };

  // ── Style sections (ligne 2) ───────────────────────────────────────────
  const SECTION_COLORS = [
    { bg: '0F3460', fg: 'FFFFFF' }, // Code appareil — bleu nuit
    { bg: '155835', fg: 'FFFFFF' }, // Genre & Inclusion — vert foncé
    { bg: '4A1A7C', fg: 'FFFFFF' }, // Vie des Étudiants — violet foncé
  ];
  const sectionDefs = [
    { start: 0, end: 0, ci: 0 },
    { start: 1, end: cols1.length, ci: 1 },
    { start: 1 + cols1.length, end: nc - 1, ci: 2 },
  ];
  for (const { start, end, ci } of sectionDefs) {
    for (let c = start; c <= end; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        font: { bold: true, sz: 11, color: { rgb: SECTION_COLORS[ci].fg }, name: 'Calibri' },
        fill: { patternType: 'solid', fgColor: { rgb: SECTION_COLORS[ci].bg } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          bottom: { style: 'medium', color: { rgb: PALETTE.headerBorder } },
          left:   { style: 'thin',   color: { rgb: 'FFFFFF' } },
          right:  { style: 'thin',   color: { rgb: 'FFFFFF' } },
        },
      };
    }
  }

  // ── Style en-têtes détaillés (ligne 3) ────────────────────────────────
  const COL_SECTION: number[] = [
    0,                                          // Code appareil
    ...Array(cols1.length).fill(1),             // Form1
    ...Array(cols2.length).fill(2),             // Form2
  ];
  const HEADER_BG = ['0F3460', '1E3A5F', '3B1A6A'];
  for (let c = 0; c < nc; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 2, c })];
    if (cell) cell.s = {
      font: { bold: true, sz: 9, color: { rgb: PALETTE.headerFg }, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG[COL_SECTION[c]] } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        bottom: { style: 'medium', color: { rgb: PALETTE.headerBorder } },
        left:   { style: 'thin',   color: { rgb: '2A4A6A' } },
        right:  { style: 'thin',   color: { rgb: '2A4A6A' } },
      },
    };
  }

  // ── Style lignes de données ────────────────────────────────────────────
  // Fond alterné : même teinte mais légèrement différente par section
  const SECTION_EVEN = ['E8F0FF', 'E8F5EE', 'F0E8FF'];
  const SECTION_ODD  = ['F5F8FF', 'F5FBF7', 'FAF5FF'];

  for (let r = 3; r < nr; r++) {
    const isEven = (r - 3) % 2 === 0;
    for (let c = 0; c < nc; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      const cellVal = String(ws[addr].v || '');
      const isEmpty = !cellVal || cellVal === '—';
      const accent = isEmpty ? null : getCellAccent(cellVal);
      const sec = COL_SECTION[c];

      ws[addr].s = {
        font: {
          sz: 9, name: 'Calibri', italic: isEmpty,
          color: { rgb: isEmpty ? PALETTE.emptyFg : (accent ? accent.fg : PALETTE.rowFg) },
          bold: c === 0, // device_fp en gras
        },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: accent ? accent.bg : (isEven ? SECTION_EVEN[sec] : SECTION_ODD[sec]) },
        },
        alignment: {
          vertical: 'center',
          horizontal: c === 0 ? 'center' : 'left',
          wrapText: false,
        },
        border: {
          bottom: { style: 'hair', color: { rgb: PALETTE.rowBorder } },
          top:    { style: 'hair', color: { rgb: PALETTE.rowBorder } },
          // Séparateur visuel entre les sections
          left:   { style: c === 0 || c === 1 || c === 1 + cols1.length ? 'thin' : 'hair',
                    color: { rgb: c === 1 + cols1.length ? '9B59B6' : PALETTE.rowBorder } },
          right:  { style: 'hair', color: { rgb: PALETTE.rowBorder } },
        },
      };
    }
  }

  // ── Largeurs de colonnes ───────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 16 }, // device_fp
    ...cols1.map((k, i) => {
      const hLen = headerRow[1 + i].length;
      const dLen = Math.max(...dataRows.map(row => String(row[1 + i] || '').length), 0);
      return { wch: Math.min(Math.max(hLen, dLen, 10), 40) };
    }),
    ...cols2.map((k, i) => {
      const hLen = headerRow[1 + cols1.length + i].length;
      const dLen = Math.max(...dataRows.map(row => String(row[1 + cols1.length + i] || '').length), 0);
      return { wch: Math.min(Math.max(hLen, dLen, 10), 40) };
    }),
  ];

  // ── Hauteurs de lignes ─────────────────────────────────────────────────
  ws['!rows'] = [
    { hpt: 32 }, // titre
    { hpt: 28 }, // sections
    { hpt: 36 }, // en-têtes
    ...Array(nr - 3).fill({ hpt: 18 }),
  ];

  return ws;
}

// ─── Route GET ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Vérification du rôle — restreint Form 2 pour form1_only
    const authHeader = req.headers.get('authorization');
    const auth = await getRoleFromToken(authHeader);
    const restrictToForm1 = auth?.role === 'form1_only';

    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '50', 10);
    const form = params.get('form') || undefined;
    const search = params.get('search') || undefined;
    const dateRange = params.get('dateRange') || undefined;
    const sort = params.get('sort') || 'created_at.desc';
    const format = params.get('format') || undefined;

    // Titres dynamiques depuis la table config (modifiables dans Paramètres)
    const { data: cfgRows } = await supabaseAdmin
      .from('config').select('key, value').in('key', ['title1', 'title2']);
    const cfgMap = Object.fromEntries((cfgRows || []).map((r: any) => [r.key, r.value]));
    const TITLE1 = cfgMap['title1'] || 'Genre & Inclusion';
    const TITLE2 = cfgMap['title2'] || 'Vie des Étudiants';


    const allRows: any[] = [];
    const CHUNK = 1000;
    let offset = 0;
    while (true) {
      const { data: chunk, error: fetchError } = await supabaseAdmin
        .from('submissions')
        .select('id,form_id,data,received_at')
        .range(offset, offset + CHUNK - 1);
      if (fetchError) {
        console.error('Erreur fetch submissions:', fetchError);
        return NextResponse.json({ error: 'Erreur lecture submissions' }, { status: 500 });
      }
      if (!chunk || chunk.length === 0) break;
      allRows.push(...chunk);
      if (chunk.length < CHUNK) break;
      offset += CHUNK;
    }

    let all = allRows.map(normalizeSubmission);

    // Restriction rôle : form1_only ne voit pas les données du formulaire 2
    if (restrictToForm1) {
      all = all.filter(r => {
        const f = String(r.form || '').toLowerCase();
        return f.includes('genre') || f === 'genre_inclusion';
      });
    }

    // Filtres
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(r => r.id?.toLowerCase().includes(q) || JSON.stringify(r.payload).toLowerCase().includes(q));
    }

    if (dateRange) {
      const now = new Date();
      const threshold = new Date(now);
      if (dateRange === 'today') threshold.setHours(0, 0, 0, 0);
      else if (dateRange === 'week') { threshold.setDate(threshold.getDate() - threshold.getDay()); threshold.setHours(0, 0, 0, 0); }
      else if (dateRange === 'month') { threshold.setDate(1); threshold.setHours(0, 0, 0, 0); }
      all = all.filter(r => r.created_at ? new Date(r.created_at) >= threshold : false);
    }

    if (form) {
      all = all.filter(r => {
        const f = String(r.form || '').toLowerCase();
        if (form === 'genre_inclusion') return f.includes('genre');
        if (form === 'vie_etudiants')   return f.includes('vie') || f.includes('etudiant');
        return f.includes(form.toLowerCase());
      });
    }

    // Tri
    const [sortField, sortDir] = sort.split('.');
    if (sortField === 'created_at') {
      all.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortDir === 'asc' ? ta - tb : tb - ta;
      });
    } else if (sortField === 'form') {
      all.sort((a, b) => String(a.form || '').localeCompare(String(b.form || '')));
    }

    // ── Export XLSX : 2 feuilles séparées + 1 feuille de couplage ──────────
    if (format === 'xlsx') {
      const form1 = all.filter(r => String(r.form).toLowerCase().includes('genre'));
      const form2 = all.filter(r => { const f = String(r.form).toLowerCase(); return f.includes('vie') || f.includes('etudiant'); });

      const wb = XLSX.utils.book_new();

      const ws1 = buildStyledSheet(form1, FORM1_LABELS, PRIORITY_KEYS_FORM1, TITLE1);
      XLSX.utils.book_append_sheet(wb, ws1, safeSheetName(TITLE1));

      // form1_only : pas de feuille Form2 ni Couplage
      if (!restrictToForm1) {
        const ws2 = buildStyledSheet(form2, FORM2_LABELS, PRIORITY_KEYS_FORM2, TITLE2);
        XLSX.utils.book_append_sheet(wb, ws2, safeSheetName(TITLE2));

        // Feuille de couplage : uniquement les appareils ayant soumis les deux formulaires
        const wsCoupling = buildCouplingSheet(form1, form2, TITLE1, TITLE2);
        XLSX.utils.book_append_sheet(wb, wsCoupling, 'Couplage');
      }

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
      const today = new Date().toISOString().split('T')[0];

      return new NextResponse(Buffer.from(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="enquete-uf-${today}.xlsx"`,
        },
      });
    }

    // ── Export CSV (simple, toutes soumissions) ───────────────────────────
    if (format === 'csv') {
      const allKeys = collectAllKeys(all, PRIORITY_KEYS_FORM1);
      const header = allKeys.map(k => `"${labelFor(k, FORM1_LABELS)}"`).join(',');
      const csvRows = all.map(r =>
        allKeys.map(k => {
          const v = k === '_submission_time'
            ? (r.payload._submission_time || r.created_at || '')
            : formatAnswer(r.payload[k]);
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(',')
      );
      const csv = [header, ...csvRows].join('\n');
      const today = new Date().toISOString().split('T')[0];
      return new NextResponse('\uFEFF' + csv, { // BOM pour Excel
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="enquete-uf-${today}.csv"`,
        },
      });
    }

    // ── JSON paginé (usage interface) ─────────────────────────────────────
    const total = all.length;
    const from = (page - 1) * pageSize;
    const pageData = all.slice(from, from + pageSize);

    return NextResponse.json({ data: pageData, count: total, page, pageSize });
  } catch (error) {
    console.error('Erreur submissions route:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
