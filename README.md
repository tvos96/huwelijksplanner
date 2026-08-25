# Tim & Ita · Huwelijksplanner

Een persoonlijke huwelijksplanner (React + Vite) met aftelteller, gastenlijst,
locaties met kaart, budget, takenlijst en contacten/leveranciers. Installeerbaar
op je iPhone als app. Gegevens worden live gedeeld tussen jullie twee toestellen
via Firebase, en er staat een aanzoeksfoto-slideshow + galerij bovenaan.

## 1. Lokaal draaien
Je hebt Node.js 18+ nodig (check met `node -v`).

```bash
npm install        # eenmalig: pakketten ophalen
npm run dev        # start lokaal op http://localhost:5173
```

Open het adres in je browser om te testen. Wijzigingen zie je meteen.

## 2. In Git zetten (eenmalig)
```bash
git init
git add .
git commit -m "Eerste versie huwelijksplanner"
# Maak een lege repo aan op github.com en plak de URL hieronder:
git branch -M main
git remote add origin https://github.com/JOUW-NAAM/huwelijksplanner.git
git push -u origin main
```

## 3. Online zetten (Netlify)
Twee opties.

**A. Automatisch bij elke push (aanbevolen)**
1. Ga naar netlify.com → "Add new site" → "Import an existing project".
2. Koppel je GitHub-repo. Netlify leest `netlify.toml` en weet zo:
   - build command: `npm run build`
   - publish map: `dist`
3. Klik deploy. Vanaf nu is elke `git push` automatisch live.

**B. Direct vanuit de terminal (Netlify CLI)**
```bash
npm i -g netlify-cli
netlify login
netlify deploy --build --prod
```

(Vercel kan ook: `npm i -g vercel` → `vercel --prod`.)

## 4. Updaten en pushen (de dagelijkse flow)
```bash
# pas de code aan in src/App.jsx ...
git add .
git commit -m "Beschrijf je wijziging"
git push
```
Bij optie 3A bouwt Netlify automatisch de nieuwe versie. Bij 3B draai je
opnieuw `netlify deploy --build --prod`.

## 5. Op je iPhone zetten
Open de Netlify-URL in Safari → deelknop → "Zet op beginscherm".
Je krijgt het T+I-monogram als icoon en de app opent schermvullend.

## Opslag & delen
Bij de eerste keer openen vraagt de app om een **gedeelde code** (bijv.
`tim-ita-2027`). Vul op beide telefoons exact dezelfde code in — vanaf dan
delen jullie via Firebase dezelfde lijst en zie je elkaars wijzigingen binnen
een paar seconden. Lukt de verbinding met Firebase een keer niet (bijv. geen
internet), dan valt de app terug op de laatst bekende lokale kopie in plaats
van vast te lopen.

Rechtsboven in de app zit een ☁-knopje voor een back-up: **downloaden** slaat
alle gegevens op als `.json`-bestand, **terugzetten** vervangt de huidige
(gedeelde) lijst door een eerdere back-up.

## Structuur
- `src/App.jsx` — de hele app (schermen, tabs, foto-galerij, back-up)
- `src/main.jsx` — startpunt + de gedeelde-code-poort
- `src/components/Gate.jsx` — scherm om de gedeelde code in te vullen
- `src/lib/firebase.js` — Firebase-config en -initialisatie
- `src/lib/plannerStore.js` — live opslag/sync van planner-data en foto's
- `src/data.js` — seed-data (gasten, locaties) en aanzoeksfoto's
- `public/photos/` — de aanzoeksfoto's (seed van de galerij)
- `public/` — app-iconen en manifest
- `netlify.toml` — deploy-instellingen
