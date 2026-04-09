import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/webhooks/(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

const isRecruiterRoute = createRouteMatcher([
  '/recruiter(.*)',
  '/company(.*)',
  '/api/recruiter(.*)',
  '/api/company(.*)',
])

const isCandidateOnlyRoute = createRouteMatcher([
  '/applications(.*)',
  '/scenarios(.*)',
  '/interview-prep(.*)',
  '/onboarding(.*)',
  '/api/job-application(.*)',
  '/api/scenarios(.*)',
  '/api/resume(.*)',
  '/api/cover-letter(.*)',
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
  const userRole = (authResult.sessionClaims?.publicMetadata as { role?: string } | undefined)?.role ?? null

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
  }

  if (!authResult.userId) {
    return NextResponse.next()
  }

  if (isRecruiterRoute(request)) {
    const isOnboarding = request.nextUrl.pathname.startsWith('/company/onboarding')
    if (!isOnboarding && userRole !== 'RECRUITER') {
      const url = new URL('/dashboard', request.url)
      return NextResponse.redirect(url)
    }
  }

  if (isCandidateOnlyRoute(request) && userRole === 'RECRUITER') {
    const url = new URL('/dashboard', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
