# Tim & Ita · Huwelijksplanner

Een persoonlijke huwelijksplanner (React + Vite) met aftelteller, gastenlijst,
locaties met kaart, budget en takenlijst. Installeerbaar op je iPhone als app.

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
Nu worden gegevens op je eigen toestel opgeslagen (localStorage), dus per telefoon.
Wil je dat jij én Ita dezelfde lijst live delen? Dan koppelen we later een gratis
database (Supabase of Firebase). Dat is een losse stap bovenop dit project.

## Structuur
- `src/App.jsx` — de hele app (hier pas je alles aan)
- `src/main.jsx` — startpunt
- `public/` — app-iconen en manifest
- `netlify.toml` — deploy-instellingen
