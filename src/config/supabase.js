import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// Usa service_role se disponível, senão usa anon key (RLS desabilitado no schema)
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};
