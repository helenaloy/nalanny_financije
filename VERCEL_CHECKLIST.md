# Vercel Deployment Checklist

## ✅ Provjere koje su napravljene

### 1. Homepage u package.json
- [x] Dodano `"homepage": "."` u `frontend/package.json`
- [x] Osigurava relativne putanje za CSS/JS datoteke
- [x] Potrebno za pravilno serviranje na Vercelu

### 2. React Router fallback u vercel.json
- [x] Dodano `rewrites` u `vercel.json`
- [x] Sve rute vraćaju `index.html` za client-side routing
- [x] Omogućava React Router da radi ispravno

### 3. Build komande
- [x] Build Command: `cd frontend && npm install && npm run build`
- [x] Output Directory: `frontend/build`
- [x] **Ne koristi se** `serve -s build` - Vercel automatski servira

### 4. Struktura projekta
- [x] React projekt je u `frontend/` folderu
- [x] `src/` i `public/` folderi postoje
- [x] `package.json` ima sve potrebne dependencies

## Vercel Dashboard Postavke

### Preporučene postavke:

| Postavka | Vrijednost | Objašnjenje |
|----------|------------|-------------|
| **Root Directory** | `frontend` | React projekt je u frontend folderu |
| **Framework Preset** | `Create React App` | Automatska detekcija |
| **Build Command** | *(prazno - koristi vercel.json)* | Ili: `npm run build` |
| **Output Directory** | *(prazno - koristi vercel.json)* | Ili: `build` |
| **Install Command** | *(prazno - koristi vercel.json)* | Ili: `npm install` |

### Alternativno (bez vercel.json):

Ako ne koristite `vercel.json`, postavite:

- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

## Provjera nakon deploymenta

### 1. Otvorite Developer Tools (F12)
- Idite na **Console** tab
- Provjerite ima li grešaka

### 2. Provjerite Network tab
- Provjerite da se CSS/JS datoteke učitavaju (status 200)
- Ako vidite 404, provjerite `homepage` u package.json

### 3. Testirajte React Router rute
- Idite na `/transactions`
- Idite na `/upload`
- Idite na `/reports`
- Sve bi trebalo raditi bez 404 grešaka

### 4. Provjerite environment varijable
- Ako koristite API endpoint, provjerite da je postavljen u Vercel Environment Variables
- Backend URL možda treba biti apsolutan umjesto relativnog

## Česti problemi i rješenja

### Bijela stranica
1. Otvorite Console (F12)
2. Provjerite greške
3. Provjerite da je `homepage: "."` u package.json
4. Rebuildajte: `cd frontend && npm run build`

### 404 za CSS/JS
- Provjerite `homepage: "."` u frontend/package.json
- Rebuildajte projekt

### React Router rute ne rade
- Provjerite da je `rewrites` u vercel.json
- Provjerite da je Output Directory `build` (ne `frontend/build`)

### Environment varijable ne rade
- Provjerite Vercel Environment Variables u dashboardu
- Možda trebate koristiti `process.env.REACT_APP_*` prefiks

## Finalna provjera

Prije deploymenta, provjerite lokalno:

```bash
cd frontend
npm install
npm run build
```

Ako build uspije, projekt je spreman za Vercel!

