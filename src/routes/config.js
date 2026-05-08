import { Router } from 'express';
import { supabaseConfig } from '../config/supabase.js';

const router = Router();

// GET /api/config — retorna config pública para o frontend usar Supabase Realtime
router.get('/', (req, res) => {
  res.json({
    supabase: {
      url: supabaseConfig.url,
      anonKey: supabaseConfig.anonKey,
    },
    event: {
      name: process.env.EVENT_NAME || 'Empresa Inquebrável',
      edition: process.env.EVENT_EDITION || '2024',
    },
  });
});

export default router;
