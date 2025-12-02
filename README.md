# Nalanny Financije

Aplikacija za vođenje prihoda i rashoda za d.o.o. u Hrvatskoj.

## Funkcionalnosti

- ✅ Uvoz bankovnih izvoda u PDF formatu
- ✅ Automatsko prepoznavanje i kategorizacija transakcija
- ✅ Pregled prihoda i rashoda po mjesecima i godinama
- ✅ Tablice i grafovi za vizualizaciju podataka
- ✅ Filtriranje po kategorijama i vremenskim razdobljima
- ✅ Ručno dodavanje i uređivanje transakcija
- ✅ Izvoz podataka u Excel i CSV format

## Instalacija

1. Instaliraj sve dependencies:
```bash
npm run install-all
```

2. Pokreni aplikaciju (backend i frontend):
```bash
npm run dev
```

Aplikacija će biti dostupna na:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Struktura projekta

```
nalanny_financije/
├── server/           # Backend (Express.js)
│   ├── routes/       # API rute
│   ├── utils/        # Pomoćne funkcije (parser)
│   └── database.js   # SQLite baza podataka
├── client/           # Frontend (React)
│   ├── src/
│   │   ├── components/
│   │   └── pages/
└── package.json
```

## Korištenje

### Uvoz PDF bankovnog izvoda

1. Idite na stranicu "Uvoz PDF"
2. Odaberite PDF datoteku bankovnog izvoda
3. Kliknite "Uploadaj i obradi"
4. Aplikacija će automatski prepoznati transakcije i kategorizirati ih

**Napomena:** Parser je prilagođen standardnom formatu bankovnih izvoda. Ako vaš bankovni izvod ima drugačiji format, možete ručno dodati transakcije.

### Ručno dodavanje transakcija

1. Idite na stranicu "Transakcije"
2. Kliknite "Dodaj transakciju"
3. Ispunite formu i spremite

### Pregled i izvještaji

- **Pregled:** Glavna stranica s ukupnim prihodima, rashodima i saldom
- **Transakcije:** Lista svih transakcija s mogućnošću filtriranja
- **Izvještaji:** Detaljni pregledi po godinama i kategorijama, s mogućnošću izvoza

## Baza podataka

Aplikacija koristi SQLite bazu podataka koja se automatski kreira pri prvom pokretanju. Baza se nalazi u `server/financije.db`.

### Tablice:

- `transactions` - Sve transakcije
- `categories` - Kategorije prihoda i rashoda
- `bank_statements` - Uploadani bankovni izvodi

## API Endpoints

- `POST /api/upload` - Upload PDF bankovnog izvoda
- `GET /api/transactions` - Dohvati transakcije (s filtrima)
- `POST /api/transactions` - Kreiraj transakciju
- `PUT /api/transactions/:id` - Ažuriraj transakciju
- `DELETE /api/transactions/:id` - Obriši transakciju
- `GET /api/reports/summary` - Pregled po mjesecima
- `GET /api/reports/yearly` - Pregled po godinama
- `GET /api/reports/export` - Izvoz podataka

## Napomene

- PDF parser je osnovni i možda će trebati prilagodbe za specifične formate bankovnih izvoda
- Kategorizacija se temelji na ključnim riječima u opisu transakcije
- Sve iznose aplikacija prikazuje u HRK (Hrvatska kuna)

