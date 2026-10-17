import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const ADMIN_ROLES = new Set(['admin', 'owner', 'operator'])

export async function requireAdmin(request) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: () => {},
            },
        }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        return {
            user: null,
            response: NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 }),
        }
    }

    const role = user.app_metadata?.role || user.user_metadata?.role
    const allowedEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean)
    const isAdmin = ADMIN_ROLES.has(role) || allowedEmails.includes((user.email || '').toLowerCase())

    if (!isAdmin) {
        return {
            user: null,
            response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
        }
    }

    return { user, response: null }
}
