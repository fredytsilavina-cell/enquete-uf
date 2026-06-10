import { supabaseAdmin } from './supabaseServer';

export type UserRole = 'admin' | 'form1_only';

/**
 * Retourne le rôle d'un utilisateur depuis la table user_roles.
 * Par défaut : 'admin' si aucun rôle trouvé (rétrocompatibilité pour les comptes existants).
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return 'admin'; // défaut = admin (rétrocompatibilité)
  return (data.role as UserRole) || 'admin';
}

/**
 * Extrait le user_id depuis un Bearer token Supabase et retourne {userId, role}.
 * Retourne null si le token est invalide.
 */
export async function getRoleFromToken(authHeader: string | null): Promise<{ userId: string; role: UserRole } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const role = await getUserRole(data.user.id);
  return { userId: data.user.id, role };
}
