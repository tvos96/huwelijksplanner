# Tim & Ita · Huwelijksplanner

Een persoonlijke huwelijksplanner (React + Vite) met aftelteller, gastenlijst,
locaties met kaart, budget, takenlijst en contacten/leveranciers. Installeerbaar
op je iPhone als app. Je logt in met je Google-account, vult jullie namen in en
nodigt je partner uit — alleen jullie tweeën kunnen bij de gegevens, foto's en
video's. Elk stel dat inlogt start met hun eigen lege project onder hun eigen
namen; er wordt niets vooringevuld van andere gebruikers.

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
Je krijgt het trouwringen-icoon en de app opent schermvullend.

## Inloggen, uitnodigen & wie er bij mag
Bij de eerste keer openen log je in met **Google** via een pop-up-venster (zorg
dat pop-ups voor de site zijn toegestaan — sommige browsers blokkeren dit
standaard en tonen dan zelf een melding in de adresbalk). Heb je nog geen project
gekoppeld, dan kies je: aansluiten met een uitnodigingscode van je partner, of
een nieuw leeg project starten — daarbij vul je meteen jullie beide namen in.
Die namen kun je later altijd nog aanpassen via "Bewerken" bij "Onze gegevens"
op het overzicht.

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

### Foto's & video's
Bovenaan het overzicht staat een langzaam wisselende foto/video-slideshow.
Rechtsboven daarin zit een ✚-knopje om meteen foto's of korte video's toe te
voegen (vanaf je telefoon of laptop, meerdere tegelijk). Tik op de slideshow
zelf om de hele gallerij in een raster te zien; tik daarin op een foto of
video om 'm groter te bekijken — daar zit een sluitknop (✕), vorige/volgende
en een prullenbak om 'm te verwijderen. Sluiten brengt je steeds gewoon terug
naar de vorige weergave. Video's zijn beperkt tot een korte clip van een paar
seconden in lage kwaliteit (ca. 500 KB): de bestanden worden net als foto's
rechtstreeks in Firestore bewaard, en daar geldt een limiet van 1 MB per
document. Grotere of langere video's kun je desgewenst delen via een losse
link (bijv. Google Foto's) in een notitie.

### Leveranciers & contacten
Net als bij locaties kun je een contact toevoegen via een link: plak de
Google Maps-link of de website van de leverancier en naam, rol, telefoon en
e-mail worden waar mogelijk automatisch opgehaald (rol wordt geraden op basis
van het type bedrijf en woorden als "fotografie" of "catering"). Handmatig
toevoegen — met of zonder rol — blijft ook gewoon mogelijk, en elk contact is
te verwijderen. Zodra er contacten met een rol zijn, verschijnt een filterbalk
waarmee je bijvoorbeeld in één tik al je fotografen kunt bekijken.

### Back-up & Excel
Rechtsboven zit een ☁-knopje met de volgende opties:
- **Back-up downloaden/terugzetten** — alle gegevens als `.json`-bestand.
- **Exporteren naar Excel** — een `.xlsx` met vijf tabbladen: **Gasten**,
  **Locaties**, **Budget**, **Taken**, **Contacten**, opgemaakt in het
  kleurenschema van de app (gekleurde kopregel, zebra-rijen, bevroren
  kopregel). Handig om in bulk te bewerken (bijv. de hele gastenlijst in
  Excel bijwerken).
- **Importeren vanuit Excel** — leest zo'n bestand weer in. Tabbladen die
  ontbreken worden overgeslagen; wat er wél in staat vervangt dat onderdeel
  volledig (na een bevestiging). De kolomkoppen moeten overeenkomen met het
  geëxporteerde formaat — begin dus bij het exporteren van je huidige data en
  bewerk dat bestand verder.
- **Koppel met live Google Sheet** — maakt één keer een Google Sheet aan op
  Drive (zelfde vijf tabbladen, met kleur) en werkt die daarna automatisch
  bij zodra er iets verandert in de app — zolang er ergens een browsertab
  open staat die gekoppeld is. De sheet wordt automatisch gedeeld met beide
  partners (kan bewerken). Elke sessie/tab moet zelf eenmaal op **"Verbind
  deze sessie"** klikken om zelf ook te mogen bijwerken — dat hoeft maar
  eens per browser, niet elke keer dat je de app opent (het token blijft
  ongeveer een uur geldig; daarna vraagt de app vanzelf weer om opnieuw te
  koppelen). Dit is een bewust *aparte* toestemmingsstap los van het gewone
  inloggen: alleen wie hierop klikt geeft de app rechten tot Google
  Drive, en dan alleen tot bestanden die de app zélf aanmaakt (niet de rest
  van je Drive). Zie ook "Google Sheets-koppeling" hieronder voor een
  eenmalige instelling die dit mogelijk maakt.

### Google Sheets-koppeling (eenmalige instelling, alleen als je dit gebruikt)
Voor **"Koppel met live Google Sheet"** vraagt de app naast e-mail/naam ook
toegang tot Google Drive/Sheets — een "gevoelig" OAuth-scope. Omdat dit
project waarschijnlijk niet door Google geverifieerd is (dat is alleen nodig
voor apps met veel gebruikers), kan Google bij het koppelen een
"Google heeft deze app niet geverifieerd"-scherm tonen. Voor eigen gebruik is
dat geen probleem — klik op "Geavanceerd" → "Doorgaan naar (project)". Zorg
wel dat jullie beide Google-accounts als **testgebruiker** zijn toegevoegd in
de Google Cloud Console van het Firebase-project
(**APIs & Services → OAuth consent screen → Test users**), anders weigert
Google de toestemming helemaal. Dit hoef je maar één keer in te stellen.

## Structuur
- `src/App.jsx` — de planner zelf (schermen, tabs, foto/video-gallerij, back-up, Excel)
- `src/main.jsx` — startpunt: inloggen → project koppelen → app
- `src/components/AuthGate.jsx` — Google-inlogscherm
- `src/components/WeddingSetup.jsx` — nieuw project starten (met namen) / aansluiten met uitnodigingscode
- `src/components/InviteWidget.jsx` — wie heeft toegang + partner uitnodigen
- `src/lib/firebase.js` — Firebase-config en -initialisatie (auth + Firestore)
- `src/lib/weddingAuth.js` — inloggen, project aanmaken/uitnodigen, Google Sheets-koppeling (toegangstoken)
- `src/lib/plannerStore.js` — live opslag/sync van planner-data, foto's, video's en de sheet-koppeling
- `src/lib/excel.js` — Excel-export/import (vijf tabbladen, met opmaak)
- `src/lib/sheetsSync.js` — live Google Sheet aanmaken/delen/bijwerken via de Sheets- en Drive-API
- `src/data.js` — logo, kaart-hulpdata (venue-coördinaten/adressen); bevat geen
  persoonlijke gegevens meer — elk nieuw project start leeg
- `public/` — app-iconen en manifest
- `firestore.rules` — beveiligingsregels (wie mag wat lezen/schrijven)
- `netlify/functions/place.js` — locatie-autofetch via Google Maps-link
- `netlify/functions/vendor.js` — leverancier-autofetch via Maps-link/website
- `netlify.toml` — deploy-instellingen
