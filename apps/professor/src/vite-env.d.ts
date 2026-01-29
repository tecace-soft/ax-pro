/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_N8N_BASE_URL: string
  readonly VITE_N8N_WEBHOOK_INDEX: string
  readonly VITE_N8N_WEBHOOK_UNINDEX: string
  readonly VITE_CHATBOT_SERVICE_URL: string
  readonly VITE_OPENAI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

