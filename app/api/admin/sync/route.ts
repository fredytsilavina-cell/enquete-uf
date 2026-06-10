import { NextRequest, NextResponse } from 'next/server';
import { syncKoboData } from '@/lib/koboService';
import { getRoleFromToken } from '@/lib/userRole';

// Admin-authenticated sync route (uses Supabase Bearer token)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const auth = await getRoleFromToken(authHeader);

    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // form1_only : sync uniquement le formulaire 1
    const onlyForm1 = auth.role === 'form1_only';
    const result = await syncKoboData({ onlyForm1 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur admin sync:', error);
    return NextResponse.json({ error: 'Erreur synchronisation' }, { status: 500 });
  }
}
