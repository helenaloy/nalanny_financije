# Vercel Deployment za Nalanny Financije

## Problem s deploymentom

Vercel ne podržava puni Node.js server kao tradicionalni hosting. Trebate koristiti **serverless funkcije**.

## Trenutna arhitektura

Ova aplikacija koristi:
- **Frontend**: React (frontend folder)
- **Backend**: Express.js server sa SQLite bazom
- **Upload**: Multer za PDF upload
- **Database**: SQLite (lokalna datoteka)

## Problemi za Vercel

1. **SQLite ne radi na Vercelu** - Vercel serverless funkcije su read-only, ne mogu pisati u datoteke
2. **Multer (file upload) ne radi** - nema trajnog storage-a
3. **Express server ne može raditi 24/7** - Vercel ima timeout

## Rješenja

### Opcija 1: Koristi drugačiji hosting (PREPORUČENO)
- **Railway.app** - potpuno besplatno, podržava Node.js + SQLite
- **Render.com** - besplatan tier, podržava full-stack
- **Fly.io** - besplatan tier, odličan za Node.js
- **Heroku** - plaćeni ali jednostavan

### Opcija 2: Prilagodi za Vercel (kompleksno)
Trebalo bi:
1. Zamijeniti SQLite s **Vercel Postgres** ili **PlanetScale**
2. Zamijeniti file upload s **Vercel Blob** ili **AWS S3**
3. Pretvoriti sve rute u serverless funkcije
4. Significant kod refactoring

## Railway Deployment (NAJLAKŠE)

1. Napravi account na railway.app
2. Klikni "New Project" → "Deploy from GitHub repo"
3. Odaberi svoj repo
4. Railway automatski detektira Node.js app
5. Dodaj environment variable: `NODE_ENV=production`
6. Deploy! ✅

### Railway config (nije potreban, ali moguće)

Ako želiš, možeš dodati `railway.json`:

\`\`\`json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run install-all && npm run build && node server/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
\`\`\`

## Render.com Deployment

1. Napravi account na render.com
2. Klikni "New" → "Web Service"
3. Connect GitHub repo
4. Postavke:
   - **Build Command**: `npm run install-all && npm run build`
   - **Start Command**: `node server/index.js`
5. Deploy! ✅

## Zaključak

**Za tvoju aplikaciju, NE korisiti Vercel.** Koristi Railway ili Render umjesto toga.

Vercel je odličan za statičke sajtove i Jamstack, ali ne za full-stack aplikacije s bazom podataka i file uploadom.

