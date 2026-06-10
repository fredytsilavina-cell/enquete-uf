import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRoleFromToken } from '@/lib/userRole';

async function requireAdmin(authHeader: string | null) {
  const auth = await getRoleFromToken(authHeader);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

// DELETE /api/admin/users/[userId] — supprimer un utilisateur
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const auth = await requireAdmin(req.headers.get('authorization'));
    if (!auth) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { userId } = params;

    // Empêcher un admin de se supprimer lui-même
    if (auth.userId === userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
    }

    // Supprimer le rôle (CASCADE le ferait aussi, mais soyons explicites)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);

    // Supprimer le compte auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
