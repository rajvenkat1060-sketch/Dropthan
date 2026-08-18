# Dropthan - Global B2B Wholesale & Supplier Marketplace

Dropthan is a modern full-stack B2B mobile and web application connecting verified wholesalers, manufacturers, exporters, and dropshippers worldwide.

---

## 🚀 Quick Start (VS Code / Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **bun** / **yarn** / **pnpm**

### 2. Clone and Install Dependencies
```bash
git clone <your-repository-url>
cd <project-folder>
npm install
```

### 3. Environment Variables Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in any optional or required API keys in `.env`:
- `GEMINI_API_KEY` (Optional: for AI Sourcing Assistant features)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Pre-configured for cloud sync)
- `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` (Pre-configured for image CDN uploads)
- `GOOGLE_MAPS_PLATFORM_KEY` (Optional: for Google Maps autocomplete and interactive cards)

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Available Scripts

- `npm run dev`: Starts the local Express + Vite dev server on port `3000` with TypeScript execution (`tsx`).
- `npm run build`: Builds the production bundle for Vite and bundles the Node server to `dist/server.cjs`.
- `npm start`: Runs the built production server from `dist/server.cjs`.
- `npm run lint`: Runs TypeScript validation without emitting files to verify types.

---

## 📂 Project Architecture

```
├── server.ts                 # Express backend API & Vite server integration
├── vite.config.ts            # Vite configuration with Tailwind CSS v4 and path aliases
├── tsconfig.json             # TypeScript compiler settings and module resolution
├── index.html                # Main HTML entry point with SEO and Open Graph tags
├── src/
│   ├── main.tsx              # React client entry point
│   ├── App.tsx               # Root application shell and tab routing
│   ├── index.css             # Tailwind CSS entry styles
│   ├── types.ts              # Global TypeScript interfaces and data models
│   ├── components/           # UI modules & modals
│   ├── data/                 # Initial mock & seed data
│   ├── lib/                  # Supabase & Cloudinary client integrations
│   └── utils/                # Avatar and media utilities
└── public/                   # Static assets & public storage fallback
```
