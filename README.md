# Tim & Ita · Huwelijksplanner

Een persoonlijke huwelijksplanner (React + Vite) met aftelteller, gastenlijst,
locaties met kaart, budget, takenlijst en contacten/leveranciers. Installeerbaar
op je iPhone als app. Je logt in met je Google-account en nodigt je partner uit
— alleen jullie tweeën kunnen bij de gegevens en foto's. Er staat een
aanzoeksfoto-slideshow + galerij bovenaan.

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

## Inloggen, uitnodigen & wie er bij mag
Bij de eerste keer openen log je in met **Google** via een pop-up-venster (zorg
dat pop-ups voor de site zijn toegestaan — sommige browsers blokkeren dit
standaard en tonen dan zelf een melding in de adresbalk). Heb je nog geen project
gekoppeld, dan kies je: aansluiten met een uitnodigingscode van je partner, of
een nieuw leeg project starten.

Eenmaal binnen zit linksboven een 👥-knopje: daar zie je wie er toegang heeft
en kun je een **uitnodigingscode** genereren om je partner toe te voegen. Die
logt zelf ook in met Google en vult de code in bij "Ik heb een
uitnodigingscode". Een code is eenmalig te gebruiken. Alleen wie zo is
toegevoegd kan bij jullie gegevens en foto's — dat wordt afgedwongen door de
Firestore-beveiligingsregels in `firestore.rules` (zie hieronder), niet alleen
door de app zelf.

Wijzigingen worden live gedeeld tussen alle uitgenodigde leden. Lukt de
verbinding met Firebase een keer niet (bijv. geen internet), dan valt de app
terug op de laatst bekende lokale kopie in plaats van vast te lopen.

### Eenmalige instellingen in Firebase (kan alleen jij doen)
Voor het inloggen met Google moet je twee dingen eenmalig aanzetten in de
[Firebase-console](https://console.firebase.google.com) van het project
`tim-en-ita-wedding-planner`:

1. **Authentication → Sign-in method → Google** → inschakelen.
2. **Authentication → Settings → Authorized domains** → voeg je Netlify-domein
   toe (bijv. `jouw-site.netlify.app`) — `localhost` staat er meestal al in
   voor lokaal testen.
3. **Firestore Database → Rules** → plak de inhoud van `firestore.rules` uit
   deze repo → **Publish**. Test 'm gerust eerst in het tabblad
   "Rules playground" ernaast (bijv.: kan gebruiker A zonder lidmaatschap een
   `weddings/{id}`-document lezen? Moet "nee" zijn).

Zonder deze drie stappen werkt inloggen niet en/of blijven de oude, open regels
gelden.

### Back-up & Excel
Rechtsboven zit een ☁-knopje met vier opties:
- **Back-up downloaden/terugzetten** — alle gegevens als `.json`-bestand.
- **Exporteren naar Excel** — een `.xlsx` met vijf tabbladen: **Gasten**,
  **Locaties**, **Budget**, **Taken**, **Contacten**. Handig om in bulk te
  bewerken (bijv. de hele gastenlijst in Excel bijwerken).
- **Importeren vanuit Excel** — leest zo'n bestand weer in. Tabbladen die
  ontbreken worden overgeslagen; wat er wél in staat vervangt dat onderdeel
  volledig (na een bevestiging). De kolomkoppen moeten overeenkomen met het
  geëxporteerde formaat — begin dus bij het exporteren van je huidige data en
  bewerk dat bestand verder.

## Structuur
- `src/App.jsx` — de planner zelf (schermen, tabs, foto-galerij, back-up, Excel)
- `src/main.jsx` — startpunt: inloggen → project koppelen → app
- `src/components/AuthGate.jsx` — Google-inlogscherm
- `src/components/WeddingSetup.jsx` — nieuw project starten / aansluiten met uitnodigingscode
- `src/components/InviteWidget.jsx` — wie heeft toegang + partner uitnodigen
- `src/lib/firebase.js` — Firebase-config en -initialisatie (auth + Firestore)
- `src/lib/weddingAuth.js` — inloggen, project aanmaken/uitnodigen
- `src/lib/plannerStore.js` — live opslag/sync van planner-data en foto's
- `src/lib/excel.js` — Excel-export/import (vijf tabbladen)
- `src/data.js` — seed-data (gasten, locaties) en aanzoeksfoto's
- `public/photos/` — de aanzoeksfoto's (seed van de galerij)
- `public/` — app-iconen en manifest
- `firestore.rules` — beveiligingsregels (wie mag wat lezen/schrijven)
- `netlify.toml` — deploy-instellingen
