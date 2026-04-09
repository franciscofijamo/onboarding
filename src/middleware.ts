import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/jobs(.*)',
  '/api/health',
  '/api/jobs(.*)',
  '/api/webhooks/(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

const isRecruiterPageRoute = createRouteMatcher([
  '/recruiter(.*)',
  '/company(.*)',
])

const isCandidateOnlyPageRoute = createRouteMatcher([
  '/applications(.*)',
  '/scenarios(.*)',
  '/interview-prep(.*)',
  '/onboarding(.*)',
])

const E2E_BYPASS = process.env.E2E_AUTH_BYPASS === '1'

export default E2E_BYPASS
  ? function middleware() {
      return NextResponse.next()
    }
  : clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    const authResult = await auth()
    if (authResult.userId && request.nextUrl.pathname === '/') {
      const url = new URL('/dashboard', request.url)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  const authResult = await auth()

  if (isAdminRoute(request)) {
    if (!authResult.userId) {
      const url = new URL('/sign-in', request.url)
      return NextResponse.redirect(url)
    }
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').filter(Boolean) || []
    if (adminUserIds.length > 0 && !adminUserIds.includes(authResult.userId)) {
      const url = new URL('/dashboard', request.url)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (!authResult.userId) {
    return NextResponse.next()
  }

  const userRole = (authResult.sessionClaims?.publicMetadata as { role?: string } | undefined)?.role ?? null

  if (isRecruiterPageRoute(request)) {
    const isOnboarding = request.nextUrl.pathname.startsWith('/company/onboarding')
    if (!isOnboarding && userRole !== 'RECRUITER') {
      const url = new URL('/dashboard', request.url)
      return NextResponse.redirect(url)
    }
  }

  if (isCandidateOnlyPageRoute(request) && userRole === 'RECRUITER') {
    const url = new URL('/dashboard', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
