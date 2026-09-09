const deploymentId = process.env.DEPLOYMENT_ID
if (!deploymentId) {
  console.log('No deployment id was supplied; status update skipped.')
  process.exit(0)
}

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const status = process.env.DEPLOYMENT_STATUS
if (!supabaseUrl || !serviceRoleKey || !['building', 'succeeded', 'failed'].includes(status)) {
  throw new Error('Deployment status updater is missing required configuration.')
}

const now = new Date().toISOString()
const body = {
  status,
  workflow_run_url: process.env.WORKFLOW_RUN_URL || null,
  error_message: process.env.DEPLOYMENT_ERROR || null,
  ...(status === 'building' ? { started_at: now, completed_at: null } : { completed_at: now }),
}

const response = await fetch(
  `${supabaseUrl}/rest/v1/website_deployments?id=eq.${encodeURIComponent(deploymentId)}`,
  {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  },
)

if (!response.ok) {
  throw new Error(`Deployment status update failed with ${response.status}: ${(await response.text()).slice(0, 240)}`)
}

console.log(`Deployment ${deploymentId} marked ${status}.`)
