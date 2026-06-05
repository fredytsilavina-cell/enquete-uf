import { NextRequest, NextResponse } from 'next/server';
import { fetchFromKoboAPI, toKoboApiUrl } from '@/lib/koboService';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get('url');
    if (!target) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

    // Fetch token from DB (same as syncKoboData does)
    const { data: rows } = await supabaseAdmin
      .from('config')
      .select('id,value')
      .eq('id', 'kobo_token')
      .maybeSingle();

    const token = (rows as any)?.value || process.env.KOBO_TOKEN || '';

    const convertedUrl = toKoboApiUrl(target);

    if (!convertedUrl) {
      return NextResponse.json({
        error: 'URL non convertible',
        originalUrl: target,
        hint: 'Utilisez une URL kf.kobotoolbox.org/#/forms/<uid>/data/table',
      }, { status: 400 });
    }

    const data = await fetchFromKoboAPI(target, token);

    return NextResponse.json({
      originalUrl: target,
      convertedUrl,
      hasToken: Boolean(token),
      count: data.length,
      sample: data.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Erreur debug fetch-kobo:', error);
    return NextResponse.json({ error: error.message || 'Erreur fetch' }, { status: 500 });
  }
}
