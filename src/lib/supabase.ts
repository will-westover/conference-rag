import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from './env';

// One shared client for the whole app. The <Database> type (generated from your real schema by
// `npm run gen:types`) makes every .from() and .rpc() call type-checked: wrong table or column names
// become compile errors instead of runtime surprises.
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
