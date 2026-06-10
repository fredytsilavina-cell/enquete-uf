import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRoleFromToken } from '@/lib/userRole';

// Vérifie que l'appelant est admin
async function requireAdmin(authHeader: string | null) {
  const auth = await getRoleFromToken(authHeader);
  if (!auth) return null;
  if (auth.role !== 'admin') return null;
  return auth;
}

// GET /api/admin/users — liste tous les utilisateurs avec leur rôle
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req.headers.get('authorization'));
    if (!auth) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    // Récupérer tous les utilisateurs Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Récupérer tous les rôles
    const { data: roles } = await supabaseAdmin.from('user_roles').select('user_id,role');
    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      role: (roleMap.get(u.id) as string) || 'admin',
    }));

    return NextResponse.json({ users: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/admin/users — créer un utilisateur
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req.headers.get('authorization'));
    if (!auth) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { email, password, role } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });

    const validRole = role === 'form1_only' ? 'form1_only' : 'admin';

    // Créer le compte dans Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // pas besoin de confirmation email
    });
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

    // Assigner le rôle
    await supabaseAdmin.from('user_roles').upsert(
      { user_id: newUser.user.id, role: validRole },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({ success: true, id: newUser.user.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
