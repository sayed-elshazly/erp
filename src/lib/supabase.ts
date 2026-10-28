/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// 1. Direct static properties so Vite statically inlines them at bundle build time
const viteUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
const viteKey = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined;

// 2. Direct Node process environment fallback for backend CLI scripts
const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
const nodeUrl = g.process?.env?.VITE_SUPABASE_URL;
const nodeKey = g.process?.env?.VITE_SUPABASE_ANON_KEY;

// 3. Fallback defaults
const supabaseUrl =
  viteUrl ||
  nodeUrl ||
  'https://qrskbalcygrlqshjivmv.supabase.co';

const supabaseAnonKey =
  viteKey ||
  nodeKey ||
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
