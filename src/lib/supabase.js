import { createClient } from '@supabase/supabase-js'

// A conexão com o banco. Só lib/dados.js usa este arquivo (e só no navegador).
// Chave PUBLICÁVEL (sb_publishable_...), nunca a secreta nem a service_role.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = createClient(url, key)
