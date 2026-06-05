import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import * as XLSX from 'xlsx';

function parseJsonValue(value: any): any {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function normalizeSubmission(row: any) {
  const data = parseJsonValue(row.data);
  const createdAt = row.received_at || data?._submission_time || data?.submission_time || null;
  const formId = row.form_id || data?.form || data?._form_id || data?._xform_id_string || data?.form_id || '';

  return {
    id: row.id,
    created_at: createdAt,
    form: formId,
    payload: data || {},
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '50', 10);
    const form = params.get('form') || undefined;
    const search = params.get('search') || undefined;
    const dateRange = params.get('dateRange') || undefined;
    const sort = params.get('sort') || 'created_at.desc';
    const format = params.get('format') || undefined;

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id,form_id,data,received_at');

    if (fetchError) {
      console.error('Erreur fetch submissions (initial):', fetchError);
      return NextResponse.json({ error: 'Erreur lecture submissions' }, { status: 500 });
    }

    let all = (rows || []).map(normalizeSubmission);

    if (search) {
      const q = String(search).toLowerCase();
      all = all.filter((r: any) => r.id?.toLowerCase().includes(q) || JSON.stringify(r.payload).toLowerCase().includes(q));
    }

    if (dateRange) {
      const now = new Date();
      let threshold = new Date(now);

      if (dateRange === 'today') {
        threshold.setHours(0, 0, 0, 0);
      } else if (dateRange === 'week') {
        const day = threshold.getDay();
        threshold.setDate(threshold.getDate() - day);
        threshold.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        threshold.setDate(1);
        threshold.setHours(0, 0, 0, 0);
      }

      all = all.filter((r: any) => {
        const createdAt = r.created_at ? new Date(r.created_at) : null;
        return createdAt ? createdAt >= threshold : false;
      });
    }

    if (form) {
      all = all.filter((r: any) =>
        String(r.form || '').includes(form) ||
        (form === 'genre_inclusion' && (r.payload?.genre || r.payload?.inclusion)) ||
        (form === 'vie_etudiants' && !r.payload?.genre)
      );
    }

    const [sortField, sortDir] = sort.split('.');
    if (sortField === 'created_at') {
      all.sort((a: any, b: any) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortDir === 'asc' ? ta - tb : tb - ta;
      });
    } else if (sortField === 'form') {
      all.sort((a: any, b: any) => String(a.form || '').localeCompare(String(b.form || '')));
    }

    if (format === 'csv' || format === 'xlsx') {
      const exportRows = all.map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        form: r.form,
        payload: JSON.stringify(r.payload),
      }));

      if (format === 'csv') {
        const header = ['id', 'created_at', 'form', 'payload'];
        const csv = [header.join(',')]
          .concat(exportRows.map((row: any) => header.map(h => `"${(row as any)[h] || ''}"`).join(',')))
          .join('\n');

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="submissions.csv"',
          },
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(Buffer.from(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="submissions.xlsx"',
        },
      });
    }

    const total = all.length;
    const from = (page - 1) * pageSize;
    const pageData = all.slice(from, from + pageSize);

    return NextResponse.json({ data: pageData || [], count: total || 0, page, pageSize });
  } catch (error) {
    console.error('Erreur submissions route:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
