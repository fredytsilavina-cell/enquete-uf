import { NextRequest, NextResponse } from 'next/server';
import { syncKoboData } from '@/lib/koboService';
import { supabaseAdmin } from '@/lib/supabaseServer';

// Admin-authenticated sync route (uses Supabase Bearer token)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const result = await syncKoboData();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur admin sync:', error);
    return NextResponse.json({ error: 'Erreur synchronisation' }, { status: 500 });
  }
}
