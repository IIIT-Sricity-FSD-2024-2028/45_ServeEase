# ServeEase — React Single Page Application (SPA)

The React Single Page Application for ServeEase, built with React 19, Vite, React Router 7, and Context API.

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
From the `react-frontend/` directory:
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
The application runs locally on Vite's default dev server (typically `http://localhost:5173`).

### Quality & Build Verification
```bash
npm run lint    # Run ESLint checks
npm run build   # Build production bundle
npm run preview # Preview production build locally
```

---

## Environment Variables

Configure via `.env` or `.env.local` inside `react-frontend/`:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | NestJS backend API endpoint | `http://localhost:3000/api` |
| `VITE_LEGACY_FRONTEND_URL` | Origin for legacy static pages (login, registration) | `http://localhost:5500` |

---

## Architecture & Project Structure

The project follows a feature-oriented React architecture:

```
src/
├── app/                  # Application root (App.jsx, routes.jsx)
├── assets/               # Static image and vector assets
├── components/
│   └── common/           # Shared cross-cutting UI (Navbar, Footer, FeedbackStates)
├── context/              # Global state (AuthContext, useAuth)
├── features/             # Feature slices: colocated pages, sub-components, and styles
│   ├── customer/
│   │   └── bookings/     # Customer bookings dashboard, cards, modal, tabs, CSS
│   └── provider/
│       └── services/     # Provider services management, card, modal, CSS
├── layouts/              # Shell wrappers (AppShell, CustomerLayout, ProviderLayout, etc.)
├── services/             # HTTP infrastructure (apiClient.js) and API endpoint facade (api.js)
├── styles/               # Global styles and design tokens (foundation.css)
└── main.jsx              # Application DOM entry point
```
