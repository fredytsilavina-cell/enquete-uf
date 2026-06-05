import { NextRequest, NextResponse } from 'next/server';
import { fetchFromKoboAPI } from '@/lib/koboService';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get('url');
    if (!target) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

    const data = await fetchFromKoboAPI(target);
    return NextResponse.json({ count: data.length, sample: data.slice(0, 20) });
  } catch (error) {
    console.error('Erreur debug fetch-kobo:', error);
    return NextResponse.json({ error: 'Erreur fetch' }, { status: 500 });
  }
}
