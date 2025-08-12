/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_JAPANPOST_CLIENT_ID?: string
  readonly VITE_JAPANPOST_CLIENT_SECRET?: string
  readonly VITE_JAPANPOST_API_HOST?: string
  readonly VITE_JAPANPOST_CLIENT_IP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}