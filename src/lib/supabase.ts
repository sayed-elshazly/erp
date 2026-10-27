/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch (_) {}

  try {
    const g = globalThis as any;
    if (g && g.process && g.process.env) {
      return g.process.env[key];
    }
  } catch (_) {}

  return undefined;
};

const supabaseUrl =
  getEnvVar('VITE_SUPABASE_URL') ||
  'https://qrskbalcygrlqshjivmv.supabase.co';

const supabaseAnonKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyc2tiYWxjeWdybHFzaGppdm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNTQ3MzgsImV4cCI6MjEwODYzMDczOH0.cKMrfkixGpL6lo6bdx-UYnj4YZFkLmtApwaWBY8D8HM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
