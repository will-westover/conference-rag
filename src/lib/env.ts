// Vite reads this JSON at build time and bakes the values into the bundle.
// The Python scripts read the same file, so there is still one source of truth.
import config from '../../config.public.json';

// Validate config once at startup and fail loudly: a bad value should crash here with a clear
// message, not surface later as a confusing error deep inside some query.
function required(name: keyof typeof config): string {
    const value = config[name];
    if (!value || value.includes('YOUR')) {
        throw new Error(`config.public.json: ${name} is missing. See steps/02_supabase_and_login.md`);
    }
    return value;
}

export const env = {
    supabaseUrl: required('SUPABASE_URL'),
    supabaseAnonKey: required('SUPABASE_ANON_KEY'),
} as const;
