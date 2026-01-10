import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuración de Supabase incompleta' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Service client for admin operations
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify requester and role
    const { data: userData, error: userError } = await adminSupabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }
    const requesterId = userData.user.id;

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', requesterId)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden crear usuarios' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, fullName, role } = body || {};
    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Campos requeridos: email, password, fullName, role' }, { status: 400 });
    }
    if (!String(email).toLowerCase().endsWith('@timbal.com.mx')) {
      return NextResponse.json({ error: 'Solo correos @timbal.com.mx permitidos' }, { status: 400 });
    }

    // Create auth user with metadata; trigger will insert into public.profiles
    const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Usuario creado', userId: created.user?.id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
