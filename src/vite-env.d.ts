/// <reference types="vite/client" />

declare const __COURSE_API_PORT__: string;

interface ImportMetaEnv {
  /** Optional. Leave empty in dev to use same-origin `/api` (Vite proxy → API on port 4000). */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
