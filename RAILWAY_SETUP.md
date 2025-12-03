# Railway Deployment Guide

## Što sam popravio:

1. ✅ Dodao `start` script u `package.json`
2. ✅ Dodao `build` script koji instalira i frontend dependencije
3. ✅ Dodao `engines` field za Node.js verziju
4. ✅ Kreirao `railway.json` s build konfigracijom
5. ✅ Kreirao `Procfile` za Railway

## Railway Setup:

### Korak 1: Pushaj promjene na GitHub
```bash
git add .
git commit -m "Fix Railway deployment"
git push
```

### Korak 2: Railway konfiguracija

U Railway dashboardu:

#### Environment Variables:
```
NODE_ENV=production
PORT=5000
```

#### Build Command (Railway će auto-detektirati, ali možeš postaviti):
```
npm install && cd frontend && npm install && npm run build
```

#### Start Command:
```
node server/index.js
```

### Korak 3: Deploy

Railway će automatski deployati nakon pusha na GitHub!

## Ako i dalje ima grešaka:

### Provjeri u Railway logs:
1. Idi na svoj projekt u Railway
2. Klikni na "Deployments"
3. Klikni na zadnji deployment
4. Provjeri "Build Logs" i "Deploy Logs"

### Česte greške:

**Greška: `react-scripts: not found`**
- **Rješenje:** `cd frontend && npm install` u build commandu (već dodano)

**Greška: `Cannot find module 'express'`**
- **Rješenje:** `npm install` prije starta (već dodano)

**Greška: Database locked**
- **Rješenje:** Railway automatski kreira volume za SQLite

## Alternativa: Render.com

Ako Railway ne radi, koristi Render:

1. Idi na https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Postavke:
   - **Build Command:** `npm install && cd frontend && npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Environment:** Node
5. Deploy!

## Test lokalno prije deploya:

```bash
# Test production build
npm run build
NODE_ENV=production node server/index.js
```

Otvori http://localhost:5000 i provjeri radi li sve.

