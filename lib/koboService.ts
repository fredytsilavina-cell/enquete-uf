import axios from 'axios';
import { supabaseAdmin } from './supabaseServer';

interface KoboConfig {
  url1: string;
  url2: string;
}

interface KoboSubmission {
  id: string;
  form_id: 'genre_inclusion' | 'vie_etudiants';
  data: any;
  received_at: string;
}

function parseConfigRows(rows: any[]): KoboConfig {
  const config: KoboConfig = { url1: '', url2: '' };
  rows.forEach((row) => {
    if (!row || !row.id) return;
    if (row.id === 'url1') config.url1 = row.value || '';
    if (row.id === 'url2') config.url2 = row.value || '';
  });
  return config;
}

function parseDataValue(value: any): any {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// Récupérer la configuration des URLs depuis Supabase
export async function getKoboConfig(): Promise<KoboConfig | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('id,value');

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [data];
    return parseConfigRows(rows as any[]);
  } catch (error) {
    console.error('Erreur récupération config depuis DB, fallback fichier:', error);
    // Fallback: read local config file if present
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
          url1: parsed.url1 || '',
          url2: parsed.url2 || '',
        };
      }
    } catch (e) {
      console.error('Fallback file read error:', e);
    }

    return null;
  }
}

// Récupérer les données depuis l'API KoboToolbox
export async function fetchFromKoboAPI(url: string): Promise<any[]> {
  try {
    if (!url) return [];
    const originalUrl = url.trim();
    let apiUrl = originalUrl;

    try {
      const parsed = new URL(originalUrl);
      if (parsed.pathname.includes('/api/')) {
        apiUrl = originalUrl;
      } else {
        const hashFormMatch = originalUrl.match(/#\/?forms\/?([^\/\s?#]+)/i);
        const formPathMatch = parsed.pathname.match(/\/forms\/([^\/\s?#]+)/i);
        const xMatch = parsed.pathname.match(/\/x\/(?:#\/)?([^\/\s?#]+)/i) || parsed.pathname.match(/\/x\/([^\/\s?#]+)/i);
        const id = (hashFormMatch && hashFormMatch[1]) || (formPathMatch && formPathMatch[1]) || (xMatch && xMatch[1]);

        if (id) {
          apiUrl = `${parsed.origin}/api/v2/assets/${id}/data`;
        } else if (parsed.pathname.includes('forms')) {
          apiUrl = `${parsed.origin}/api/v2/data`;
        } else {
          apiUrl = originalUrl;
        }
      }
    } catch {
      apiUrl = originalUrl;
    }

    const results: any[] = [];
    let nextUrl: string | null = apiUrl;

    while (nextUrl) {
      const urlToFetch: string = nextUrl;
      const response = await axios.get<any>(urlToFetch, {
        timeout: 15000,
        headers: { Accept: 'application/json' },
      });

      const data = response.data;
      if (Array.isArray(data)) {
        results.push(...data);
        nextUrl = null;
      } else if (data.results) {
        results.push(...data.results);
        nextUrl = data.next || null;
      } else if (data.data) {
        results.push(...data.data);
        nextUrl = null;
      } else {
        nextUrl = null;
      }
    }

    return results;
  } catch (error) {
    console.error('Erreur API KoboToolbox:', error);
    return [];
  }
}

function buildSubmissionId(item: any, fallbackPrefix: string) {
  return (
    item._id?.toString() ||
    item.instanceID?.toString() ||
    item.id?.toString() ||
    `${fallbackPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
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

// Synchroniser les données KoboToolbox avec Supabase
export async function syncKoboData() {
  try {
    const config = await getKoboConfig();
    if (!config) return { success: false, message: 'Configuration manquante' };

    const form1Data = config.url1 ? await fetchFromKoboAPI(config.url1) : [];
    const form2Data = config.url2 ? await fetchFromKoboAPI(config.url2) : [];

    const queriedForms = new Set<'genre_inclusion' | 'vie_etudiants'>();
    if (config.url1) queriedForms.add('genre_inclusion');
    if (config.url2) queriedForms.add('vie_etudiants');

    const allData: KoboSubmission[] = [];
    const fetchedIds = new Set<string>();

    form1Data.forEach((item: any) => {
      const id = buildSubmissionId(item, 'kobo-1');
      const formId = extractFormId(item, 'genre_inclusion');
      allData.push({
        id,
        form_id: formId,
        data: item,
        received_at: extractCreatedAt(item),
      });
      fetchedIds.add(id);
    });

    form2Data.forEach((item: any) => {
      const id = buildSubmissionId(item, 'kobo-2');
      const formId = extractFormId(item, 'vie_etudiants');
      allData.push({
        id,
        form_id: formId,
        data: item,
        received_at: extractCreatedAt(item),
      });
      fetchedIds.add(id);
    });

    if (allData.length > 0) {
      const { error } = await supabaseAdmin
        .from('submissions')
        .upsert(allData, { onConflict: 'id' });

      if (error) throw error;
    }

    if (queriedForms.size > 0) {
      const deleteQuery = supabaseAdmin.from('submissions').delete();
      if (fetchedIds.size > 0) {
        deleteQuery.not('id', 'in', Array.from(fetchedIds));
      }
      deleteQuery.in('form_id', Array.from(queriedForms));

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;
    }

    return {
      success: true,
      message: `${allData.length} soumissions synchronisées`,
      count: allData.length,
    };
  } catch (error) {
    console.error('Erreur sync KoboData:', error);
    return { success: false, message: 'Erreur synchronisation' };
  }
}

export async function getStats() {
  try {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('id,form_id,data,received_at');

    if (error) throw error;

    const today = new Date().toLocaleDateString('fr-FR');
    let total = 0;
    let form1 = 0;
    let form2 = 0;
    let todayCount = 0;

    (data || []).forEach((row: any) => {
      total++;
      const payload = parseDataValue(row.data);
      const created = row.received_at || payload._submission_time || payload.submission_time || null;
      const dateStr = created ? new Date(created).toLocaleDateString('fr-FR') : null;
      const form = row.form_id || payload.form || payload._form_id || payload._xform_id_string || payload.form_id || null;

      if (form && String(form).toLowerCase().includes('genre')) form1++;
      else if (form && String(form).toLowerCase().includes('vie')) form2++;
      else if (payload && typeof payload === 'object' && (payload.hasOwnProperty('genre') || payload.hasOwnProperty('inclusion'))) form1++;
      else form2++;

      if (dateStr === today) todayCount++;
    });

    return { total, form1, form2, today: todayCount };
  } catch (error) {
    console.error('Erreur getStats:', error);
    return { total: 0, form1: 0, form2: 0, today: 0 };
  }
}

export async function getTrendData() {
  try {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('id,form_id,data,received_at');

    if (error) throw error;

    const grouped: { [key: string]: { total: number; form1: number; form2: number } } = {};

    (data || []).forEach((item: any) => {
      const payload = parseDataValue(item.data);
      const created = item.received_at || payload._submission_time || payload.submission_time || null;
      const date = created ? new Date(created).toLocaleDateString('fr-FR') : 'unknown';
      if (!grouped[date]) {
        grouped[date] = { total: 0, form1: 0, form2: 0 };
      }
      grouped[date].total++;
      const form = item.form_id || payload.form || payload._form_id || payload._xform_id_string || null;
      if (form && String(form).toLowerCase().includes('genre')) grouped[date].form1++;
      else if (form && String(form).toLowerCase().includes('vie')) grouped[date].form2++;
      else if (payload && typeof payload === 'object' && (payload.hasOwnProperty('genre') || payload.hasOwnProperty('inclusion'))) grouped[date].form1++;
      else grouped[date].form2++;
    });

    return Object.entries(grouped).map(([date, stats]) => ({ date, ...stats }));
  } catch (error) {
    console.error('Erreur getTrendData:', error);
    return [];
  }
}
