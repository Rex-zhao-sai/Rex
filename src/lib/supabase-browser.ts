import { createClient } from '@supabase/supabase-js';

// Supabase 永久实例配置（anon key 是设计给前端使用的，安全）
const SUPABASE_URL = 'https://cpkqoubbwjvchbmdsish.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwa3FvdWJid2p2Y2hibWRzaXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODkyMjksImV4cCI6MjA5OTc2NTIyOX0.pzXxbNq_sHa7JQOXYBGPf5KXUH3m7hj8l3QUwIaASU8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});

export default supabase;
