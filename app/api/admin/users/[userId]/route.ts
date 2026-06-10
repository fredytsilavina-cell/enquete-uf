import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRoleFromToken } from '@/lib/userRole';

async function requireAdmin(authHeader: string | null) {
  const auth = await getRoleFromToken(authHeader);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin(req.headers.get('authorization'));
    if (!auth) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { userId } = await params;

    if (auth.userId === userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
    }

    // Protection super-admin : ce compte ne peut jamais être supprimé
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetUser?.user?.email === 'tsilavinajeanfredy@gmail.com') {
      return NextResponse.json({ error: 'Ce compte est protégé et ne peut pas être supprimé' }, { status: 403 });
    }

    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}