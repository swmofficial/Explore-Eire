if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Note: SUPABASE_SERVICE_ROLE_KEY must NOT have a VITE_ prefix to avoid client exposure.')
  process.exit(1)
}