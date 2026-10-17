import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
    const pathname = request.nextUrl.pathname
    const isApiRoute = pathname.startsWith('/api/')
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set({ name, value, ...options })
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        if (isApiRoute) {
            return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 })
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/login',
        '/api/bulk/:path*',
        '/api/wa/:path*',
    ],
}
