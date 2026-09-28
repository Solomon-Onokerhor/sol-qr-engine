import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  const { alias } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('qrcodes')
    .select('*')
    .eq('alias', alias)
    .single()

  if (error || !data) {
    return new Response('QR Code not found. Contact Sol Agency.', { status: 404 })
  }

  // Increment scan count (fire and forget — don't slow down the redirect)
  supabase
    .from('qrcodes')
    .update({ scans: data.scans + 1 })
    .eq('alias', alias)
    .then(() => {})

  return Response.redirect(data.target_url, 302)
}
