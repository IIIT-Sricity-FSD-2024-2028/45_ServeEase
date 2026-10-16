// The backend API origin + prefix; `import.meta.env` is absent outside Vite (plain Node tests), so it is optional.
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/api'
