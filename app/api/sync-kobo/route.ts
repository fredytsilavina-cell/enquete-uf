import { syncKoboData } from '@/lib/koboService';
import { NextRequest, NextResponse } from 'next/server';

const SYNC_KOBO_SECRET = process.env.SYNC_KOBO_SECRET;

function verifySyncToken(req: NextRequest) {
  if (!SYNC_KOBO_SECRET) {
    console.error('SYNC_KOBO_SECRET n’est pas configuré.');
    return false;
  }

  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const headerSecret = bearerToken || req.headers.get('x-sync-secret')?.trim();

  return Boolean(headerSecret && headerSecret === SYNC_KOBO_SECRET);
}

async function handleSync(req: NextRequest) {
  if (!verifySyncToken(req)) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  const result = await syncKoboData();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    return await handleSync(req);
  } catch (error) {
    console.error('Erreur sync POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handleSync(req);
  } catch (error) {
    console.error('Erreur sync GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}
