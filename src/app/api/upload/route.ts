import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserFromClerkId } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { withApiLogging } from '@/lib/logging/api'
import { getStorageProvider, getStorageProviderName } from '@/lib/storage'

export const runtime = 'nodejs'

async function handleUpload(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo' }, { status: 400 })

    const maxMb = Number(process.env.BLOB_MAX_SIZE_MB || '25')
    const maxBytes = Math.max(1, maxMb) * 1024 * 1024 // default 25MB (configurable)
    if (file.size > maxBytes) {
      return NextResponse.json({ error: `Arquivo muito grande (máx ${maxMb}MB)` }, { status: 413 })
    }

    const ext = file.name?.split('.').pop()?.toLowerCase() || 'bin'
    const safeName = file.name?.replace(/[^a-z0-9._-]/gi, '_') || `upload.${ext}`
    const key = `uploads/${userId}/${Date.now()}-${safeName}`

    const storage = getStorageProvider()
    const uploaded = await storage.upload(key, file, { access: 'public' })

    // Persist record for admin management
    try {
      const user = await getUserFromClerkId(userId)
      const providerName = getStorageProviderName()
      await db.storageObject.create({
        data: {
          userId: user.id,
          clerkUserId: userId,
          provider: providerName,
          url: uploaded.url,
          pathname: uploaded.pathname,
          name: file.name || safeName,
          contentType: file.type || null,
          size: file.size,
        },
      })
    } catch (e) {
      console.error('Failed to persist StorageObject:', e)
    }

    return NextResponse.json({
      url: uploaded.url,
      pathname: uploaded.pathname,
      contentType: file.type,
      size: file.size,
      name: file.name,
    })
  } catch (err) {
    console.error('Upload failed:', err)
    return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
  }
}

export const POST = withApiLogging(handleUpload, {
  method: 'POST',
  route: '/api/upload',
  feature: 'storage',
})
