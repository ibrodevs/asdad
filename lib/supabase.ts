import { createBrowserClient } from '@supabase/ssr'

const fallbackUrl = ['https://zohzihthrwrntkaqbbal', 'supabase.co'].join('.')
const fallbackKey = ['sb_publishable_3i6T0kWWV3C7Ve2Dcaf8Cg_20V', '_3yZN'].join('')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  fallbackKey

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
