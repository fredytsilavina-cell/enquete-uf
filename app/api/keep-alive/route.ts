import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * GET /api/keep-alive
 * ──────────────────────────────────────────────────────────────────────────
 * Endpoint pinge par UptimeRobot toutes les 5 minutes.
 * Effectue une requete legere sur Supabase pour empecher la mise en veille
 * du projet Supabase (Free tier : mise en pause apres 7 jours d'inactivite).
 *
 * Configuration UptimeRobot (https://uptimerobot.com) :
 *   Monitor type : HTTP(s)
 *   URL          : https://<votre-app>.onrender.com/api/keep-alive
 *   Interval     : 5 minutes
 *   Keyword      : "ok"  (pour verifier que Supabase repond bien)
 * ──────────────────────────────────────────────────────────────────────────
 */
export async function GET() {
  const start = Date.now();

  try {
    // Requete ultra-legere : COUNT sur config (toujours quelques lignes)
    const { count, error } = await supabaseAdmin
      .from('config')
      .select('*', { count: 'exact', head: true });

    const elapsed = Date.now() - start;

    if (error) {
      console.error('[keep-alive] Erreur Supabase:', error.message);
      return NextResponse.json(
        { status: 'error', message: error.message, elapsed_ms: elapsed },
        { status: 500 }
      );
    }

    console.log(`[keep-alive] OK — ${count} config rows — ${elapsed}ms`);
    return NextResponse.json({
      status: 'ok',
      db_rows: count,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error('[keep-alive] Exception:', err?.message);
    return NextResponse.json(
      { status: 'error', message: err?.message ?? 'Unknown error', elapsed_ms: elapsed },
      { status: 500 }
    );
  }
}
