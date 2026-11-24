# Start på en anden computer

PC og laptop bruger hver sin lokale PostgreSQL-database og Docker-volumen. GitHub indeholder kode og seeddata, ikke personernes svar eller de importerede OSM-steder. En ny laptop får derfor et tomt datasæt. Eksisterende svar skal overføres med en separat databasebackup, hvis de skal bruges dér.

## Første start på laptop (PowerShell)

Installer Git, Node.js 22.13+ og Docker Desktop. Start Docker Desktop.

```powershell
git clone --branch feat/explorexp-m1 https://github.com/PBL-DevTeam26/Personal-Brain-Library-PBL.git
cd Personal-Brain-Library-PBL
docker compose -p explorexp-m1 up -d --wait db
cd services/api
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Brug det samme Compose-projektnavn `explorexp-m1` ved senere opstarter. Laptoppen bruger sin egen volumen, også selv om navnet er det samme som på PC'en. Hvis port 55432 allerede er optaget på laptoppen, stop og undersøg hvilken lokal database der bruger den; slet ikke dens volumen for at frigøre porten.

Kontrollér API'et på `http://localhost:3101/health`. Kør `npm.cmd run places:import` fra `services/api` i en anden terminal for at fylde kortet med OSM-steder. Du kan bruge quizzerne, mens Overpass er utilgængelig.

Importen sender en afgrænset forespørgsel med en `User-Agent`, der angiver projekt, formål og repository. Ved HTTP 406 eller 429 skal du kontrollere udbyderens regler og vente mindst 30 sekunder før et nyt forsøg. Se [regler for den offentlige Overpass-instans](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances).

Åbn en anden terminal i projektmappen:

```powershell
cd apps/mobile
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
ipconfig
```

Ret `EXPO_PUBLIC_API_BASE_URL` i `apps/mobile/.env` til laptopens aktuelle IPv4-adresse, fx `http://192.168.1.42:3101`. Telefon og laptop skal være på samme netværk. Tillad API-port 3101 på det private netværk, hvis Windows Firewall spørger.

```powershell
npm.cmd run start -- --clear
```

Åbn laptopens QR-kode i Expo Go, og genindlæs appen helt. Brug ikke den gamle Expo-session fra PC'en.

### Fejlsøgning på Android

- Kontrollér, at telefonen bruger [Expo Go til SDK 58](https://expo.dev/go). Fra `apps/mobile` kan `npx.cmd expo-doctor` kontrollere projektets Expo-afhængigheder.
- Åbn `http://<laptopens IPv4>:3101/health` i telefonens browser. Hvis det fejler, kontrollér Wi-Fi og Windows Firewall. Skole- og gæstenetværk kan isolere klienter. Prøv et netværk, hvor telefon og laptop kan nå hinanden, og opdatér derefter IP-adressen i `apps/mobile/.env`.
- Metro bruger som standard TCP-port 8081. Hvis API'et kan nås fra telefonen, men QR-koden giver timeout, kontrollér også denne port. Brug kun firewalladgang på et betroet privat netværk.

## Profiler på samme telefon

API'en har en vedvarende databaseidentifikation. Telefonens personregistre gemmes separat for hver database, uafhængigt af computerens IP-adresse. Første gang en eksisterende profil flyttes til denne opsætning, kontrolleres det, at profilen findes i databasen. Kun en faktisk ukendt bruger giver en ny profil; netværksfejl gør ikke.

En tom laptopdatabase starter med Person 1. PC'ens Person 1 bevares i PC'ens database. Numrene er lokale etiketter; de to personer har forskellige UUID'er. Ved skift tilbage til PC'ens API og fuld genindlæsning husker telefonen PC'ens aktive person.

En fuld databasebackup bevarer også databaseidentifikationen. En gendannet kopi behandles derfor som samme datasæt. Hvis begge kopier bruges parallelt, synkroniseres nye svar ikke automatisk. Brug kun én som det aktive fælles datasæt.

## Eksisterende PC efter denne opdatering

Kør `npm run db:migrate` i `services/api`, før den opdaterede app åbnes. Det tilføjer databaseidentifikationen uden at nulstille quizsvar, XP eller stedbedømmelser. Genstart API'en og genindlæs Expo-appen.

Ved senere opstart er det nok at starte Docker-databasen, API'en og Expo igen. Overskriv ikke eksisterende `.env`-filer, og brug ikke `docker compose down -v` eller sletning af volumener som en nulstillingsrutine.
