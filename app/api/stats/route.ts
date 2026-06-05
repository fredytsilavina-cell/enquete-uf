import { NextRequest, NextResponse } from 'next/server';
import { getStats, getTrendData } from '@/lib/koboService';

export async function GET(req: NextRequest) {
  try {
    const stats = await getStats();
    const trends = await getTrendData();
    return NextResponse.json({ stats, trends });
  } catch (error) {
    console.error('Erreur stats route:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
