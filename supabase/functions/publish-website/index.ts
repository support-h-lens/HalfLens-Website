import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://h-lens.co',
  'https://www.h-lens.co',
  'https://1.h-lens.co',
  'http://localhost:5173',
])

const corsHeaders = (origin: string | null) => {
  const isAllowed = Boolean(
    origin && (allowedOrigins.has(origin) || /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pages\.dev$/i.test(origin)),
  )
  return {
    ...(isAllowed && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const json = (body: Record<string, unknown>, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })

Deno.serve(async (request) => {
  const headers = corsHeaders(request.headers.get('Origin'))
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Authentication required.' }, 401, headers)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const githubToken = Deno.env.get('GITHUB_DISPATCH_TOKEN')
  const githubRepository = Deno.env.get('GITHUB_REPOSITORY') || 'support-h-lens/HalfLens-Website'
  const gitRef = Deno.env.get('GITHUB_PUBLISH_REF') || 'main'

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !githubToken) {
    return json({ error: 'Publishing service is not configured.' }, 503, headers)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Invalid session.' }, 401, headers)

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: member, error: memberError } = await serviceClient
    .from('website_cms_members')
    .select('cms_role,is_active')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (memberError || !member || !['owner', 'editor'].includes(member.cms_role)) {
    return json({ error: 'You do not have publishing permission.' }, 403, headers)
  }

  const { data: deployment, error: deploymentError } = await serviceClient
    .from('website_deployments')
    .insert({ requested_by: userData.user.id, status: 'queued', git_ref: gitRef })
    .select('*')
    .single()

  if (deploymentError || !deployment) {
    console.error('Could not create deployment row:', deploymentError?.message)
    return json({ error: 'Could not create the publishing request.' }, 500, headers)
  }

  try {
    const dispatchResponse = await fetch(`https://api.github.com/repos/${githubRepository}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'h-lens-publishing-function',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        event_type: 'publish-website',
        client_payload: { deployment_id: deployment.id, ref: gitRef },
      }),
    })

    if (!dispatchResponse.ok) {
      throw new Error(`GitHub dispatch returned ${dispatchResponse.status}`)
    }

    return json({ deployment }, 202, headers)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub dispatch failed.'
    console.error('Publishing dispatch failed:', message)
    await serviceClient
      .from('website_deployments')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', deployment.id)
    return json({ error: 'Could not start the deployment workflow.' }, 502, headers)
  }
})
