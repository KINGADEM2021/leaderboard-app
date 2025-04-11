/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
    readonly SSR: boolean;
    [key: string]: string | boolean | undefined;
  };
} 