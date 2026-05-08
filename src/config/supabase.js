import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// Usa service_role se disponível, senão usa anon key (RLS desabilitado no schema)
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const supabaseConfigError = 'Configuração ausente: defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente (Vercel > Project Settings > Environment Variables)';

function createMissingSupabaseProxy() {
  return new Proxy({}, {
    get() {
      throw new Error(supabaseConfigError);
    },
  });
}

export const supabaseAdmin = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAdminKey)
  : createMissingSupabaseProxy();

export const supabaseConfig = {
  url: supabaseUrl || null,
  anonKey: supabaseAnonKey || null,
  hasConfig: hasSupabaseConfig,
  error: hasSupabaseConfig ? null : supabaseConfigError,
};
