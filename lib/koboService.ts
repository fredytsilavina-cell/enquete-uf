import axios from 'axios';
import { supabaseAdmin } from './supabaseServer';

interface KoboConfig {
  url1: string;
  url2: string;
  koboToken?: string;
  koboToken2?: string;
}

interface KoboSubmission {
  id: string;
  form_id: 'genre_inclusion' | 'vie_etudiants';
  data: any;
  received_at: string;
}

function parseConfigRows(rows: any[]): KoboConfig {
  const config: KoboConfig = { url1: '', url2: '', koboToken: '', koboToken2: '' };
  rows.forEach((row) => {
    if (!row || !row.id) return;
    if (row.id === 'url_data1') config.url1 = row.value || config.url1;
    if (row.id === 'url_data2') config.url2 = row.value || config.url2;
    if (row.id === 'url1' && !config.url1) config.url1 = row.value || '';
    if (row.id === 'url2' && !config.url2) config.url2 = row.value || '';
    if (row.id === 'kobo_token') config.koboToken = row.value || '';
    if (row.id === 'kobo_token2') config.koboToken2 = row.value || '';
  });
  return config;
}

function parseDataValue(value: any): any {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export function toKoboApiUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.includes('/api/v2/assets/') && parsed.pathname.includes('/data')) {
      return trimmed;
    }
    const hashFormMatch = trimmed.match(/#\/?forms\/([a-zA-Z0-9_-]{5,})/);
    if (hashFormMatch) {
      const uid = hashFormMatch[1];
      const origin = `${parsed.protocol}//${parsed.hostname}`;
      return `${origin}/api/v2/assets/${uid}/data/?format=json`;
    }
    const pathFormMatch = parsed.pathname.match(/\/forms\/([a-zA-Z0-9_-]{5,})/);
    if (pathFormMatch) {
      const uid = pathFormMatch[1];
      return `${parsed.origin}/api/v2/assets/${uid}/data/?format=json`;
    }
    if (parsed.hostname.startsWith('ee.')) {
      console.warn(
        '[KoboService] URL Enketo détectée (ee.kobotoolbox.org) — impossible de récupérer les données depuis cette URL.\n' +
        '  → Utilisez une URL "kf.kobotoolbox.org/#/forms/<uid>/data/table" dans Paramètres > URL Data.'
      );
      return null;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function extractAssetUid(url: string): { origin: string; uid: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    const origin = `${parsed.protocol}//${parsed.hostname}`;
    const hashFormMatch = url.match(/#\/?forms\/([a-zA-Z0-9]{5,})/);
    if (hashFormMatch) return { origin, uid: hashFormMatch[1] };
    const apiMatch = parsed.pathname.match(/\/api\/v2\/assets\/([a-zA-Z0-9]{5,})/);
    if (apiMatch) return { origin, uid: apiMatch[1] };
    const pathFormMatch = parsed.pathname.match(/\/forms\/([a-zA-Z0-9]{5,})/);
    if (pathFormMatch) return { origin, uid: pathFormMatch[1] };
    return null;
  } catch {
    return null;
  }
}

// ─── Types de schéma ──────────────────────────────────────────────────────
// choiceMap  : { [questionAutoname]: { [choiceValue]: "Label avec accents" } }
// questionMap: { [questionAutoname]: "Label de la question avec accents" }
export type KoboChoiceMap = Record<string, Record<string, string>>;
export type KoboQuestionMap = Record<string, string>;

export interface KoboSchema {
  choiceMap: KoboChoiceMap;
  questionMap: KoboQuestionMap;
}

/**
 * Récupère le schéma complet du formulaire (survey + choices) depuis l'API
 * KoboToolbox et retourne :
 *   - choiceMap  : code → libellé pour chaque question select_* (valeurs)
 *   - questionMap: autoname → libellé pour toutes les questions (en-têtes)
 *
 * Ces deux cartes sont la source de vérité : elles reflètent automatiquement
 * tout renommage fait dans KoboToolbox, sans intervention manuelle dans le code.
 */
export async function fetchKoboSchema(url: string, token?: string): Promise<KoboSchema> {
  const ref = extractAssetUid(url);
  if (!ref) return { choiceMap: {}, questionMap: {} };

  const authToken = token || process.env.KOBO_TOKEN || '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers['Authorization'] = `Token ${authToken}`;

  const metaUrl = `${ref.origin}/api/v2/assets/${ref.uid}/?format=json`;

  try {
    const res = await axios.get<any>(metaUrl, { timeout: 30000, headers });
    const content = res.data?.content;
    if (!content) return { choiceMap: {}, questionMap: {} };

    const survey: any[] = content.survey || [];
    const choices: any[] = content.choices || [];

    // Préférer le libellé français si plusieurs langues sont définies
    const langs: string[] = content.translations || [];
    let langIndex = 0;
    const frIndex = langs.findIndex((l: string) => /fran|french|^fr/i.test(l || ''));
    if (frIndex >= 0) langIndex = frIndex;

    const labelOf = (entry: any): string => {
      if (Array.isArray(entry?.label)) {
        return entry.label[langIndex] ?? entry.label[0] ?? '';
      }
      return entry?.label ?? '';
    };

    // ── questionMap : autoname → libellé de la question ───────────────────
    const questionMap: KoboQuestionMap = {};
    for (const q of survey) {
      const type = String(q.type || '');
      // Ignorer les balises de structure
      if (['begin_group', 'end_group', 'begin_repeat', 'end_repeat', 'note'].includes(type)) continue;
      const autoname = q.$autoname || q.name;
      const label = labelOf(q);
      if (autoname && label) {
        questionMap[autoname] = label;
      }
    }

    // ── choiceMap : regrouper par list_name puis associer aux questions ────
    const choicesByList: Record<string, Record<string, string>> = {};
    for (const c of choices) {
      const listName = c.list_name;
      const value = c.name ?? c.value ?? c.$autovalue;
      const label = labelOf(c);
      if (!listName || value === undefined || !label) continue;
      (choicesByList[listName] ||= {})[String(value)] = String(label);
    }

    const choiceMap: KoboChoiceMap = {};
    for (const q of survey) {
      const type = String(q.type || '');
      if (!type.startsWith('select_one') && !type.startsWith('select_multiple')) continue;
      const listName = type.split(' ')[1];
      const questionName = q.$autoname || q.name;
      if (!listName || !questionName || !choicesByList[listName]) continue;
      choiceMap[questionName] = choicesByList[listName];
    }
    console.log(`[KoboSchema] survey=${survey.length} choices=${choices.length} choicesByList=${Object.keys(choicesByList).length} choiceMap=${Object.keys(choiceMap).length} questionMap=${Object.keys(questionMap).length}`);
    return { choiceMap, questionMap };
  } catch (error: any) {
    console.error('[KoboService] Erreur récupération schéma:', error?.response?.status || error?.message);
    return { choiceMap: {}, questionMap: {} };
  }
}

// Compat ascendante — retourne uniquement le choiceMap
export async function fetchKoboChoiceMap(url: string, token?: string): Promise<KoboChoiceMap> {
  const schema = await fetchKoboSchema(url, token);
  return schema.choiceMap;
}

export async function getKoboConfig(): Promise<KoboConfig | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('id,value');
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [data];
    const config = parseConfigRows(rows as any[]);
    if (!config.koboToken) config.koboToken = process.env.KOBO_TOKEN || '';
    if (!config.koboToken2) config.koboToken2 = process.env.KOBO_TOKEN2 || config.koboToken;
    return config;
  } catch (error) {
    console.error('[KoboService] Erreur récupération config depuis DB, fallback fichier:', error);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const file = path.join(process.cwd(), 'config', 'kobo_urls.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          url1: parsed.url_data1 || parsed.url1 || '',
          url2: parsed.url_data2 || parsed.url2 || '',
          koboToken: parsed.koboToken || process.env.KOBO_TOKEN || '',
        };
      }
    } catch (e) {
      console.error('[KoboService] Fallback file read error:', e);
    }
    return null;
  }
}

export async function fetchFromKoboAPI(url: string, token?: string): Promise<any[]> {
  if (!url) return [];

  const apiUrl = toKoboApiUrl(url);
  if (!apiUrl) {
    console.error('[KoboService] URL non convertible en API endpoint:', url);
    return [];
  }

  const authToken = token || process.env.KOBO_TOKEN || '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Token ${authToken}`;
  } else {
    console.warn('[KoboService] Aucun token KoboToolbox configuré — les formulaires privés retourneront 401.');
  }

  console.log('[KoboService] Fetching:', apiUrl, authToken ? '(avec token)' : '(sans token)');

  const results: any[] = [];
  let nextUrl: string | null = apiUrl;
  let page = 1;

  try {
    while (nextUrl) {
      const urlToFetch: string = nextUrl;
      const response = await axios.get<any>(urlToFetch, { timeout: 30000, headers });
      const data = response.data;
      if (Array.isArray(data)) {
        results.push(...data);
        nextUrl = null;
      } else if (data && data.results) {
        results.push(...data.results);
        nextUrl = data.next || null;
        console.log(`[KoboService] Page ${page}: ${data.results.length} résultats (total: ${data.count ?? '?'})`);
        page++;
      } else if (data && data.data) {
        results.push(...data.data);
        nextUrl = null;
      } else {
        console.warn('[KoboService] Format de réponse inattendu:', JSON.stringify(data).slice(0, 200));
        nextUrl = null;
      }
    }
    console.log(`[KoboService] Total récupéré: ${results.length} soumissions depuis ${apiUrl}`);
    return results;
  } catch (error: any) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.detail || error?.response?.data || error?.message;
    if (status === 401) {
      console.error(`[KoboService] 401 Unauthorized — token manquant ou invalide.\n  URL: ${apiUrl}`);
    } else if (status === 403) {
      console.error(`[KoboService] 403 Forbidden — votre compte n'a pas accès à ce formulaire.\n  URL: ${apiUrl}`);
    } else if (status === 404) {
      console.error(`[KoboService] 404 Not Found — UID incorrect.\n  URL: ${apiUrl}`);
    } else {
      console.error(`[KoboService] Erreur API [${status ?? 'réseau'}]:`, msg);
    }
    return [];
  }
}

function buildSubmissionId(item: any, fallbackPrefix: string): string {
  const realUuid: string | undefined = item._uuid || item.instanceID || item['meta/instanceID'];
  if (realUuid) return realUuid.replace(/^uuid:/, '');
  const numericId: number | undefined = item._id;
  if (numericId) {
    const hex = numericId.toString(16).padStart(12, '0');
    return `00000000-0000-0000-0000-${hex}`;
  }
  return `00000000-0000-0000-${fallbackPrefix.slice(0, 4).padEnd(4, '0')}-${Date.now().toString(16).slice(-12)}`;
}

function extractCreatedAt(item: any) {
  return (
    item._submission_time ||
    item.submission_time ||
    item.received_at ||
    item.created_at ||
    new Date().toISOString()
  );
}

function extractFormId(item: any, fallback: 'genre_inclusion' | 'vie_etudiants') {
  const formValue = item?.form || item?._form_id || item?._xform_id_string || item?.form_id || item?.asset_name;
  if (typeof formValue === 'string') {
    if (formValue.toLowerCase().includes('genre')) return 'genre_inclusion';
    if (formValue.toLowerCase().includes('vie')) return 'vie_etudiants';
  }
  return fallback;
}

export async function syncKoboData({ onlyForm1 = false }: { onlyForm1?: boolean } = {}) {
  try {
    const config = await getKoboConfig();
    if (!config) return { success: false, message: 'Configuration manquante' };

    const token = config.koboToken || process.env.KOBO_TOKEN || '';
    const token2 = config.koboToken2 || process.env.KOBO_TOKEN2 || token;

    const warnings: string[] = [];
    if (!token) warnings.push('Token KoboToolbox (formulaire 1) manquant — les formulaires prives echoueront (401).');
    if (!token2) warnings.push('Token KoboToolbox (formulaire 2) manquant — les formulaires prives echoueront (401).');
    if (!config.url1 && !config.url2) {
      return { success: false, message: 'Aucune URL de synchronisation configuree. Ajoutez au moins une URL dans Parametres.' };
    }

    const synced: { formId: 'genre_inclusion' | 'vie_etudiants'; data: any[] }[] = [];

    if (config.url1) {
      console.log('[KoboService] Sync formulaire 1 (genre_inclusion)...');
      const data = await fetchFromKoboAPI(config.url1, token);
      synced.push({ formId: 'genre_inclusion', data });

      // ── Schéma complet : choiceMap + questionMap ───────────────────────
      const schema1 = await fetchKoboSchema(config.url1, token);
      const configUpserts1: { id: string; value: string }[] = [];
      if (Object.keys(schema1.choiceMap).length > 0) {
        configUpserts1.push({ id: 'kobo_choice_map1', value: JSON.stringify(schema1.choiceMap) });
      }
      if (Object.keys(schema1.questionMap).length > 0) {
        configUpserts1.push({ id: 'kobo_question_map1', value: JSON.stringify(schema1.questionMap) });
      }
      if (configUpserts1.length > 0) {
        await supabaseAdmin.from('config').upsert(configUpserts1, { onConflict: 'id' });
        console.log(`[KoboService] Schéma formulaire 1 sauvegardé (${Object.keys(schema1.choiceMap).length} questions choix, ${Object.keys(schema1.questionMap).length} libellés).`);
      }
    } else {
      console.log('[KoboService] Formulaire 1 ignoré — URL non configurée.');
    }

    if (config.url2 && !onlyForm1) {
      console.log('[KoboService] Sync formulaire 2 (vie_etudiants)...');
      const data = await fetchFromKoboAPI(config.url2, token2);
      synced.push({ formId: 'vie_etudiants', data });

      // ── Schéma complet : choiceMap + questionMap ───────────────────────
      const schema2 = await fetchKoboSchema(config.url2, token2);
      const configUpserts2: { id: string; value: string }[] = [];
      if (Object.keys(schema2.choiceMap).length > 0) {
        configUpserts2.push({ id: 'kobo_choice_map2', value: JSON.stringify(schema2.choiceMap) });
      }
      if (Object.keys(schema2.questionMap).length > 0) {
        configUpserts2.push({ id: 'kobo_question_map2', value: JSON.stringify(schema2.questionMap) });
      }
      if (configUpserts2.length > 0) {
        await supabaseAdmin.from('config').upsert(configUpserts2, { onConflict: 'id' });
        console.log(`[KoboService] Schéma formulaire 2 sauvegardé (${Object.keys(schema2.choiceMap).length} questions choix, ${Object.keys(schema2.questionMap).length} libellés).`);
      }
    } else if (onlyForm1) {
      console.log('[KoboService] Formulaire 2 ignoré — accès restreint au formulaire 1.');
    } else {
      console.log('[KoboService] Formulaire 2 ignoré — URL non configurée.');
    }

    const allData: KoboSubmission[] = [];
    synced.forEach(({ formId, data }, i) => {
      data.forEach((item: any) => {
        const id = buildSubmissionId(item, `kobo-${i + 1}`);
        const resolvedFormId = extractFormId(item, formId);
        allData.push({ id, form_id: resolvedFormId, data: item, received_at: extractCreatedAt(item) });
      });
    });

    if (allData.length > 0) {
      const { error } = await supabaseAdmin
        .from('submissions')
        .upsert(allData, { onConflict: 'id' });
      if (error) throw error;

      const deviceRows: { fp: string; form_id: string; submitted_at: string }[] = [];
      allData.forEach(({ form_id, data, received_at }) => {
        const fp: string | undefined = data?.device_fp;
        if (!fp || typeof fp !== 'string' || !fp.trim()) return;
        const formShort =
          form_id === 'genre_inclusion' ? 'f1'
          : form_id === 'vie_etudiants' ? 'f2'
          : null;
        if (!formShort) return;
        deviceRows.push({ fp: fp.trim(), form_id: formShort, submitted_at: received_at });
      });

      if (deviceRows.length > 0) {
        const BATCH = 100;
        for (let i = 0; i < deviceRows.length; i += BATCH) {
          const batch = deviceRows.slice(i, i + BATCH);
          const { error: dsError } = await supabaseAdmin
            .from('device_statuses')
            .upsert(batch, { onConflict: 'fp,form_id' });
          if (dsError) console.error('[KoboService] Erreur upsert device_statuses:', dsError.message);
        }
        console.log(`[KoboService] ${deviceRows.length} statut(s) appareil synchronisé(s).`);
      }
    }

    let deletedCount = 0;
    const syncedFormIds = synced.map(s => s.formId);

    if (syncedFormIds.length > 0) {
      const existingRows: any[] = [];
      let off = 0;
      while (true) {
        const { data: chunk, error: fetchErr } = await supabaseAdmin
          .from('submissions')
          .select('id, form_id')
          .in('form_id', syncedFormIds)
          .range(off, off + 999);
        if (fetchErr) throw fetchErr;
        if (!chunk || chunk.length === 0) break;
        existingRows.push(...chunk);
        if (chunk.length < 1000) break;
        off += 1000;
      }

      const koboIds = new Set(allData.map(r => r.id));
      const toDelete = existingRows
        .filter(row => !koboIds.has(row.id))
        .map(row => row.id);

      if (toDelete.length > 0) {
        const BATCH = 100;
        for (let i = 0; i < toDelete.length; i += BATCH) {
          const batch = toDelete.slice(i, i + BATCH);
          const { error: delErr } = await supabaseAdmin.from('submissions').delete().in('id', batch);
          if (delErr) throw delErr;
        }
        deletedCount = toDelete.length;
        console.log(`[KoboService] ${deletedCount} soumission(s) supprimée(s).`);
      }
    }

    const syncedLabels = synced.map(s =>
      s.formId === 'genre_inclusion' ? `Formulaire 1 (${s.data.length})` : `Formulaire 2 (${s.data.length})`
    ).join(', ');

    const baseMessage = allData.length === 0 && deletedCount === 0
      ? `Sync terminée — aucune soumission. (${syncedLabels || 'aucun formulaire configuré'})`
      : `${allData.length} soumission${allData.length !== 1 ? 's' : ''} synchronisée${allData.length !== 1 ? 's' : ''} — ${syncedLabels}${deletedCount > 0 ? ` — ${deletedCount} supprimée${deletedCount > 1 ? 's' : ''}` : ''}`;

    return {
      success: true,
      message: baseMessage,
      count: allData.length,
      deleted: deletedCount,
      form1: synced.find(s => s.formId === 'genre_inclusion')?.data.length ?? null,
      form2: synced.find(s => s.formId === 'vie_etudiants')?.data.length ?? null,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('[KoboService] Erreur syncKoboData:', error);
    return { success: false, message: 'Erreur synchronisation' };
  }
}

export async function getStats() {
  try {
    const allRows: any[] = [];
    let off2 = 0;
    while (true) {
      const { data: chunk, error } = await supabaseAdmin
        .from('submissions').select('id,form_id,data,received_at').range(off2, off2 + 999);
      if (error) throw error;
      if (!chunk || chunk.length === 0) break;
      allRows.push(...chunk);
      if (chunk.length < 1000) break;
      off2 += 1000;
    }

    const today = new Date().toLocaleDateString('fr-FR');
    let total = 0, form1 = 0, form2 = 0, todayCount = 0;

    allRows.forEach((row: any) => {
      total++;
      const payload = parseDataValue(row.data);
      const created = row.received_at || payload._submission_time || payload.submission_time || null;
      const dateStr = created ? new Date(created).toLocaleDateString('fr-FR') : null;
      const form = row.form_id || payload.form || payload._form_id || payload._xform_id_string || null;
      if (form && String(form).toLowerCase().includes('genre')) form1++;
      else if (form && String(form).toLowerCase().includes('vie')) form2++;
      else if (payload && typeof payload === 'object' && (Object.prototype.hasOwnProperty.call(payload, 'genre') || Object.prototype.hasOwnProperty.call(payload, 'inclusion'))) form1++;
      else form2++;
      if (dateStr === today) todayCount++;
    });

    return { total, form1, form2, today: todayCount };
  } catch (error) {
    console.error('[KoboService] Erreur getStats:', error);
    return { total: 0, form1: 0, form2: 0, today: 0 };
  }
}

export async function getTrendData() {
  try {
    const allRows2: any[] = [];
    let off3 = 0;
    while (true) {
      const { data: chunk, error } = await supabaseAdmin
        .from('submissions').select('id,form_id,data,received_at').range(off3, off3 + 999);
      if (error) throw error;
      if (!chunk || chunk.length === 0) break;
      allRows2.push(...chunk);
      if (chunk.length < 1000) break;
      off3 += 1000;
    }

    const grouped: { [key: string]: { total: number; form1: number; form2: number } } = {};
    allRows2.forEach((item: any) => {
      const payload = parseDataValue(item.data);
      const created = item.received_at || payload._submission_time || payload.submission_time || null;
      const date = created ? new Date(created).toLocaleDateString('fr-FR') : 'unknown';
      if (!grouped[date]) grouped[date] = { total: 0, form1: 0, form2: 0 };
      grouped[date].total++;
      const form = item.form_id || payload.form || payload._form_id || payload._xform_id_string || null;
      if (form && String(form).toLowerCase().includes('genre')) grouped[date].form1++;
      else if (form && String(form).toLowerCase().includes('vie')) grouped[date].form2++;
      else if (payload && typeof payload === 'object' && (Object.prototype.hasOwnProperty.call(payload, 'genre') || Object.prototype.hasOwnProperty.call(payload, 'inclusion'))) grouped[date].form1++;
      else grouped[date].form2++;
    });

    return Object.entries(grouped).map(([date, stats]) => ({ date, ...stats }));
  } catch (error) {
    console.error('[KoboService] Erreur getTrendData:', error);
    return [];
  }
}
