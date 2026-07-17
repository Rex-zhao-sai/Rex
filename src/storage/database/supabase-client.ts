import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  // Always try to load .env first
  try {
    require('dotenv').config();
  } catch {
    // dotenv not available
  }

  // Priority 1: Custom Supabase instance from .env - always override if present
  if (process.env.SUPABASE_URL_CUSTOM && process.env.SUPABASE_ANON_KEY_CUSTOM) {
    process.env.COZE_SUPABASE_URL = process.env.SUPABASE_URL_CUSTOM;
    process.env.COZE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY_CUSTOM;
    envLoaded = true;
    return;
  }

  if (envLoaded) {
    return;
  }

  // Priority 2: Platform-injected sandbox instance
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    envLoaded = true;
    return;
  }

  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    envLoaded = true;
  } catch {
    // Silently fail
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  // Always prefer custom instance if available
  const url = process.env.SUPABASE_URL_CUSTOM || process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY_CUSTOM || process.env.COZE_SUPABASE_ANON_KEY;

  console.log('[Supabase] URL:', url?.substring(0, 40));
  console.log('[Supabase] Key source:', process.env.SUPABASE_URL_CUSTOM ? 'CUSTOM' : 'SANDBOX');

  if (!url) {
    throw new Error('COZE_SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('COZE_SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  // Debug: log which URL is being used
  console.log('[Supabase] Connecting to:', url.substring(0, 40) + '...');

  // Always use anon key - service_role key from sandbox won't work with custom instance
  const key = anonKey;

  const globalOptions: Record<string, any> = {};
  if (token) {
    globalOptions.headers = { Authorization: `Bearer ${token}` };
  }

  return createClient(url, key, {
    global: globalOptions,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
