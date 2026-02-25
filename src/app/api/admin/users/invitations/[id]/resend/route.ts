import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-utils"
import { withApiLogging } from "@/lib/logging/api"

export const runtime = 'nodejs'

async function handleAdminInvitationResend(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    try {
      const token = process.env.CLERK_SECRET_KEY
      if (!token) return NextResponse.json({ error: 'CLERK_SECRET_KEY not configured' }, { status: 501 })
      const url = `https://api.clerk.com/v1/invitations/${encodeURIComponent(id)}/resend`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const text = await res.text()
      if (!res.ok) {
        let msg = text
        try { const j = JSON.parse(text); msg = j?.message || j?.error || text } catch {}
        return NextResponse.json({ error: msg || 'Failed to resend' }, { status: res.status })
      }
      return NextResponse.json({ status: 'resent' })
    } catch (err) {
      const message = (err as { errors?: Array<{ message?: string }>; message?: string; status?: number })?.errors?.[0]?.message || (err as { message?: string })?.message || 'Failed to resend invitation'
      return NextResponse.json({ error: message }, { status: (err as { status?: number })?.status || 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: (error as { message?: string })?.message || 'Unexpected error' }, { status: 500 })
  }
}

export const POST = withApiLogging(handleAdminInvitationResend, {
  method: "POST",
  route: "/api/admin/users/invitations/[id]/resend",
  feature: "admin_users",
})
