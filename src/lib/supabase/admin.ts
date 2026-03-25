import { createClient } from '@supabase/supabase-js'

// This client bypasses RLS and should ONLY be used in server environments
// for operations that require elevated privileges, like looking up emails
// during login before the user is authenticated.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
