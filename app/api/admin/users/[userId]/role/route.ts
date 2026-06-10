import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRoleFromToken } from '@/lib/userRole';

async function requireAdmin(authHeader: string | null) {
  const auth = await getRoleFromToken(authHeader);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin(req.headers.get('authorization'));
    if (!auth) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { userId } = await params;
    const { role } = await req.json();

    // Protection super-admin : son rôle ne peut pas être modifié
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetUser?.user?.email === 'tsilavinajeanfredy@gmail.com') {
      return NextResponse.json({ error: 'Le rôle de ce compte ne peut pas être modifié' }, { status: 403 });
    }

    const validRole = role === 'form1_only' ? 'form1_only' : 'admin';

    const { error } = await supabaseAdmin.from('user_roles').upsert(
      { user_id: userId, role: validRole },
      { onConflict: 'user_id' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}