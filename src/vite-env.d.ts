/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JOB_APPLICATIONS_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
