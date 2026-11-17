import { createClient } from '@supabase/supabase-js'

// A conexão com o banco. Só passa a ser usada quando o Supabase entrar
// (USAR_MOCK = false em lib/dados.js). Até lá nenhum arquivo importa este.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = createClient(url, key)
