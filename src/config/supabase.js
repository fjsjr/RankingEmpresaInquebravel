import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// Usa service_role se disponível, senão usa anon key (RLS desabilitado no schema)
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
let supabaseAdmin = null;
let supabaseConfigError = null;

function createMissingSupabaseProxy() {
  return new Proxy({}, {
    get() {
      throw new Error(supabaseConfigError);
    },
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseConfigError = 'Configuração ausente: defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente (Vercel > Project Settings > Environment Variables)';
} else {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);
  } catch (err) {
    supabaseConfigError = `Configuração inválida do Supabase: ${err.message}`;
  }
}

const hasSupabaseConfig = Boolean(supabaseAdmin);
export { supabaseAdmin };
if (!supabaseAdmin) {
  supabaseAdmin = createMissingSupabaseProxy();
}

export const supabaseConfig = {
  url: supabaseUrl || null,
  anonKey: supabaseAnonKey || null,
  hasConfig: hasSupabaseConfig,
  error: hasSupabaseConfig ? null : supabaseConfigError,
};
