# Vercel Deployment Setup

## Struktura projekta

Projekt je organiziran na sljedeći način:

```
nalanny_financije/
├── frontend/          # React aplikacija (Create React App)
│   ├── src/          # React source kod
│   ├── public/       # Public datoteke (index.html, manifest.json)
│   └── package.json  # Frontend dependencies
├── server/           # Backend (Express.js)
│   ├── routes/       # API rute
│   ├── utils/        # Pomoćne funkcije
│   └── database.js   # SQLite baza
├── package.json      # Root package.json
└── vercel.json       # Vercel konfiguracija
```

## Provjera React projekta

### ✅ Package.json
- `react-scripts` (5.0.1) je u `dependencies` (ne u devDependencies)
- Skripte su ispravno postavljene:
  - `start`: `react-scripts start`
  - `build`: `react-scripts build`
  - `test`: `react-scripts test`
  - `eject`: `react-scripts eject`

### ✅ Struktura foldera
- ✅ `frontend/src/` - postoji sa svim komponentama
- ✅ `frontend/public/` - postoji s `index.html` i `manifest.json`
- ✅ `frontend/src/index.js` - entry point postoji
- ✅ `frontend/src/App.js` - glavna komponenta postoji

### ✅ Build test
Projekt se može buildati komandom:
```bash
cd frontend && npm install && npm run build
```

## Vercel Postavke

### Opcija 1: Automatska konfiguracija (preporučeno)

Ako koristite `vercel.json` (koji je već kreiran), Vercel će automatski koristiti postavke iz te datoteke.

**U Vercel dashboardu:**
- **Root Directory**: `frontend` (ili ostavite prazno)
- **Build Command**: (ostavite prazno - koristi se iz vercel.json)
- **Output Directory**: (ostavite prazno - koristi se iz vercel.json)
- **Install Command**: (ostavite prazno - koristi se iz vercel.json)

### Opcija 2: Ručna konfiguracija

Ako želite ručno postaviti (bez vercel.json):

**U Vercel dashboardu postavite:**

1. **Root Directory**: `frontend`
   - Ovo govori Vercelu da je React projekt u `frontend` folderu

2. **Build Command**: `npm run build`
   - Ovo pokreće `react-scripts build` koji je definiran u `frontend/package.json`

3. **Output Directory**: `build`
   - Create React App automatski kreira `build` folder nakon builda
   - Vercel će servirati statičke datoteke iz ovog foldera

4. **Install Command**: `npm install`
   - Vercel automatski pokreće `npm install` u root direktoriju projekta
   - Ako je Root Directory postavljen na `frontend`, instalira se u tom folderu

## Detaljne Vercel postavke

### Framework Preset
- **Framework Preset**: `Create React App` (ili `Other`)

### Environment Variables
Ako koristite environment varijable, dodajte ih u Vercel dashboardu:
- Settings → Environment Variables

### Build & Development Settings

```
Root Directory: frontend
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

## Provjera deploymenta

Nakon postavljanja, Vercel će:
1. Detektirati da je to React projekt
2. Instalirati dependencies (`npm install` u `frontend` folderu)
3. Pokrenuti build (`npm run build`)
4. Servirati statičke datoteke iz `frontend/build` foldera

## Važne provjere

### ✅ 1. Homepage u package.json
**Status**: ✅ DODANO
- `"homepage": "."` je dodano u `frontend/package.json`
- Ovo osigurava da se putanje generiraju relativno, što je potrebno za Vercel

### ✅ 2. React Router fallback u vercel.json
**Status**: ✅ DODANO
- `rewrites` je dodano u `vercel.json` za client-side routing
- Sve rute sada vraćaju `index.html`, što omogućava React Router da radi

### ✅ 3. Build komande
**Status**: ✅ ISPRAVNO
- Build Command: `cd frontend && npm install && npm run build`
- Output Directory: `frontend/build`
- **Ne koristi se** `serve -s build` - Vercel automatski servira statičke datoteke

### ✅ 4. Provjera konzole
**Za provjeru u pregledniku:**
1. Otvorite Developer Tools (F12)
2. Idite na Console tab
3. Provjerite greške:
   - 404 za CSS/JS datoteke → provjerite homepage u package.json
   - React Router greške → provjerite rewrites u vercel.json
   - Environment varijable → provjerite Vercel Environment Variables

## Troubleshooting

### Problem: "react-scripts: command not found"
**Rješenje**: Provjerite da je `react-scripts` u `dependencies` (ne `devDependencies`) u `frontend/package.json`

### Problem: "Cannot find module"
**Rješenje**: Provjerite da je Root Directory postavljen na `frontend`

### Problem: Build uspije ali stranica ne radi
**Rješenje**: Provjerite da je Output Directory postavljen na `build` (ne `frontend/build`)

### Problem: Bijela stranica nakon deploymenta
**Rješenje**: 
1. Provjerite konzolu u pregledniku (F12 → Console)
2. Provjerite da je `homepage: "."` u package.json
3. Provjerite da su rewrites dodani u vercel.json

### Problem: React Router rute ne rade (404)
**Rješenje**: Provjerite da je `rewrites` dodano u vercel.json:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Problem: CSS/JS datoteke se ne učitavaju (404)
**Rješenje**: 
1. Provjerite da je `homepage: "."` u frontend/package.json
2. Rebuildajte projekt: `cd frontend && npm run build`
3. Provjerite da su sve putanje relativne u build folderu

## Napomene

- `vercel.json` je već konfiguriran i automatski će se koristiti
- Ako želite koristiti ručne postavke, možete obrisati `vercel.json`
- Backend (server/) trenutno nije konfiguriran za Vercel - samo frontend se deploya

