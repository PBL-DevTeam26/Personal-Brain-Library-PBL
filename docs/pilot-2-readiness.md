# ExploreXP M1 · Pilot 2-readiness

**READY til kontrolleret Pilot 2.** Data-audit, isoleret API/DB-flow og hele deltagerforløbet i Expo Go på en Android-emulator er bestået. Indsamlingen er lukket. Gennemfør telefon- og netværkskontrollen nedenfor ved opsætning til de første deltagere.

## 1. Quiz- og feature-audit

Pilot 1 har fire pakker, 20 spørgsmål, 60 svarmuligheder og 15 features. Nedenfor er hvert oprindeligt signal angivet med pakke, spørgsmålsnummer, svarposition og vægt. FS er *Mad og stemning*, FD er *Smag og nysgerrighed*, KA er *Din kunstsmag*, og KD er *Kultur og opdagelser*. De komplette spørgsmål, svar og vægte ligger fortsat i [Pilot 1-definitionerne](../database/seeds/quizzes.json).

Flere spørgsmål tvang et valg mellem forskellige egenskaber. FS2 blandede køkkenvalg og nysgerrighed. FS5 gjorde valg af selskab til et signal om ro. KA5 gav både klassisk og moderne kunst for ét generelt valg af kunstmuseum. KD4 brugte lyst til at lære som signal for både historie og videnskab. De direkte spørgsmål i Pilot 2 adskiller disse egenskaber.

| Feature | Oprindelige positive svar | Oprindelige negative svar | OSM-steder af 50 | Pilotsteder af 24 | Match og dokumentation |
|---|---|---|---:|---:|---|
| `budget_friendly` | FS3.1 Det skal være billigt (+1)<br>FD4.1 Rimelige priser (+1) | — | 0 | 0 | Pris kan måles mod en fast beløbsgrænse. En sådan grænse og ensartede priser mangler. |
| `premium` | FS1.3 En gennemført gourmetoplevelse (+1)<br>FS3.2 Jeg betaler gerne for kvalitet (+0.8)<br>FD3.3 Flere nøje udvalgte serveringer (+1)<br>FD5.2 En særlig luksusaften (+1) | FS3.1 Det skal være billigt (-0.5) | 0 | 0 | Eksklusivitet og oplevet kvalitet er subjektive. Betalingsvillighed alene dokumenterer ingen stedegenskab. |
| `casual` | FS1.1 Et uformelt sted med god stemning (+1)<br>FS1.2 Et lille, roligt sted (+0.3)<br>FS4.1 Streetfood og små retter (+0.7)<br>FD3.1 Madbod og uformelt (+1)<br>FD3.2 Rolig café (+0.6)<br>FD5.1 Helt uformel (+1) | — | 0 | 0 | Oplevet uformalitet er subjektiv. Caféer og boder er formater med forskellig brugssituation. |
| `quiet` | FS1.2 Et lille, roligt sted (+1)<br>FS4.2 Rolig middag ved bordet (+0.8)<br>FS5.2 En enkelt person (+0.7)<br>FS5.3 Jeg går gerne alene (+0.5)<br>FD3.2 Rolig café (+0.8)<br>KA2.1 I mit eget tempo og ro (+1)<br>KA4.1 Stille og fordybende (+1)<br>KD3.3 Jeg vil helst bare kigge (+0.5)<br>KD4.3 Tid til fordybelse (+1) | — | 0 | 0 | Oplevet ro varierer med tidspunkt og belægning. Steder mangler sammenlignelige støjmålinger. |
| `social` | FS1.1 Et uformelt sted med god stemning (+0.6)<br>FS5.1 En større gruppe venner (+1)<br>FD2.2 Hvis nogen anbefaler dem (+0.4)<br>FD4.3 God stemning med venner (+1)<br>KA2.3 Sammen med venner (+0.9)<br>KA4.2 Energisk og levende (+0.6) | — | 0 | 0 | Social stemning og ønsket selskab er forskellige forhold. Steder mangler en dokumenteret matchattribut. |
| `adventurous` | FS1.3 En gennemført gourmetoplevelse (+0.4)<br>FS2.3 Jeg prøver gerne noget nyt (+1)<br>FS3.3 Jeg vælger efter oplevelsen (+0.6)<br>FS4.3 Noget usædvanligt (+1)<br>FS5.3 Jeg går gerne alene (+0.4)<br>FD1.1 Vegetarisk kreativ menu (+0.4)<br>FD2.1 Det elsker jeg (+1)<br>FD2.2 Hvis nogen anbefaler dem (+0.4)<br>FD4.2 Spændende smagskombinationer (+1)<br>FD5.3 Noget overraskende (+1)<br>KA1.1 Ny eksperimenterende kunst (+0.4)<br>KA4.3 Overraskende (+1)<br>KD4.2 At opleve noget overraskende (+1) | FD2.3 Jeg foretrækker det velkendte (-0.8) | 0 | 0 | Nysgerrighed er en brugerpræference. Hvor usædvanligt et sted virker, afhænger af brugeren. |
| `cuisine_asian` | FS2.1 Asiatisk (+1)<br>FD1.2 Ramen eller dim sum (+1) | — | 8 | 6 | Køkkenretning er dokumenterbar. Den brede kategori dækker forskellige køkkener, herunder japansk, vietnamesisk og indisk. |
| `cuisine_italian` | FS2.2 Italiensk (+1)<br>FD1.3 Frisk pasta eller pizza (+1) | — | 4 | 4 | Køkkenretning er dokumenterbar via køkkentag eller menukort. |
| `plant_based` | FD1.1 Vegetarisk kreativ menu (+1) | — | 5 | 5 | Vegetarisk eller vegansk mulighed kan dokumenteres. Feature betyder, at der er et valg. |
| `street_food` | FS4.1 Streetfood og små retter (+1)<br>FD3.1 Madbod og uformelt (+1) | — | 0 | 0 | Madbod kan dokumenteres som format. Små retter alene siger intet om formatet, og pilotsteder mangler dækning. |
| `art_modern` | KA1.1 Ny eksperimenterende kunst (+1)<br>KA3.1 Nye perspektiver (+0.8)<br>KA5.1 Kunstmuseum (+0.5)<br>KD1.1 Interaktiv installation (+0.6)<br>KD2.3 Kunstnerens eksperimenter (+1)<br>KD4.2 At opleve noget overraskende (+0.5)<br>KD5.1 Design og samtidskunst (+1) | — | 0 | 1 | Samtidskunstprogram kan dokumenteres. Nye perspektiver alene er en subjektiv oplevelse. |
| `art_classical` | KA1.2 Klassiske malerier (+1)<br>KA5.1 Kunstmuseum (+0.5) | — | 0 | 1 | Maleriernes periode kan dokumenteres. Pilotspørgsmålet måler specifikt ældre europæiske malerier. |
| `history` | KA1.3 Historiske genstande (+1)<br>KA3.2 Fortællinger fra fortiden (+0.9)<br>KA5.2 Historisk museum (+1)<br>KD1.2 Historisk rundvisning (+1)<br>KD2.2 Fortidens mennesker (+1)<br>KD4.1 At lære noget nyt (+0.6)<br>KD5.2 Arkæologi og historie (+1) | — | 3 | 6 | Et historisk udstillingsemne kan dokumenteres. Bygningens alder alene beskriver ikke udstillingens emne. |
| `interactive` | KA2.2 Med aktiviteter og deltagelse (+1)<br>KA3.3 At prøve noget selv (+1)<br>KA4.2 Energisk og levende (+0.6)<br>KA5.3 Science-center (+0.7)<br>KD1.1 Interaktiv installation (+1)<br>KD3.1 Meget vigtigt (+1)<br>KD3.2 Lidt, hvis relevant (+0.4)<br>KD5.3 Eksperimenter og teknologi (+0.4) | KD3.3 Jeg vil helst bare kigge (-0.8) | 0 | 2 | Konkrete aktiviteter, som gæsten selv prøver, kan dokumenteres. God stemning er subjektiv. |
| `science` | KA5.3 Science-center (+1)<br>KD1.3 Teknologisk udstilling (+1)<br>KD2.1 Fremtidens opfindelser (+1)<br>KD4.1 At lære noget nyt (+0.6)<br>KD5.3 Eksperimenter og teknologi (+1) | — | 0 | 3 | Et dokumenteret tema om videnskab eller teknologi kan matches. At lære noget nyt er bredere. |

## 2. Den aktive quizstruktur

Piloten bevarer de fire pakker og bruger otte direkte spørgsmål, ét pr. dokumenteret feature. Den oprindelige 15-kode-taksonomi og Pilot 1-quizzerne ligger fortsat i projektet. Samtykke, quizdefinition og mapping er låst i `pilot-2-v1` sammen med et fast stedkatalog.

| Pakke | Spørgsmål om |
|---|---|
| Din madstil | Asiatisk mad, italiensk mad |
| Smag og nysgerrighed | Mulighed for vegetarisk eller vegansk mad |
| Din kunstsmag | Samtidskunst, ældre europæiske malerier |
| Kultur og opdagelser | Historie, aktiviteter man selv kan prøve, videnskab eller teknologi |

Hvert spørgsmål kan besvares med *mere attraktivt* (+1), *mindre attraktivt* (−1) eller *ingen præference / ved ikke* (ingen observation). Et helt neutralt svarforløb kan afsluttes ved at springe steder over. En label kræver fire gemte quizzer og mindst ét brugbart signal.

## 3. Pilotsteder og kilder

Alle 24 steder har en neutral beskrivelse og mindst én dokumenteret feature. Tabellen viser kilden til hver feature. ★ angiver de tre fælles steder pr. kategori. De fulde beskrivelser og den konkrete dokumentation er versionsstyret i [stedmanifestet](../database/seeds/pilot-2-places.json). OSM-matches kontrolleres mod de gemte rå tags ved klargøring.

| Sted | Kategori | Verificerede features |
|---|---|---|
| Deep | Restaurant | [`cuisine_asian`](https://www.openstreetmap.org/node/280679726), [`plant_based`](https://www.openstreetmap.org/node/280679726) |
| Il Ponte ★ | Restaurant | [`cuisine_italian`](https://www.openstreetmap.org/node/279472282) |
| Jensens Bøfhus, Vesterbrogade | Restaurant | [`plant_based`](https://www.openstreetmap.org/node/280530930) |
| Juma ★ | Restaurant | [`cuisine_asian`](https://www.openstreetmap.org/node/24971137) |
| Kafe Kapers ★ | Restaurant | [`plant_based`](https://www.kafekapers.dk/CustomerData/Files/Folders/7-pdf/147_kapers-ny-menu-2025.pdf) |
| La Vecchia Signora | Restaurant | [`cuisine_italian`](https://www.openstreetmap.org/node/279474458) |
| Rimini | Restaurant | [`cuisine_italian`](https://www.openstreetmap.org/node/280679787) |
| Ristorante Amalfi | Restaurant | [`cuisine_italian`](https://www.openstreetmap.org/node/279472775), [`plant_based`](https://www.openstreetmap.org/node/279472775) |
| Shahi | Restaurant | [`cuisine_asian`](https://www.openstreetmap.org/node/280790408) |
| Sticks’n’Sushi, Vesterbro | Restaurant | [`cuisine_asian`](https://www.sticksnsushi.com/dk/da/restaurants/istedgade/) |
| Viet Nam Nam | Restaurant | [`cuisine_asian`](https://www.openstreetmap.org/node/279143638) |
| Wagamama, Tivoli | Restaurant | [`cuisine_asian`](https://www.tivoli.dk/mad-og-drikke/wagamama), [`plant_based`](https://www.wagamama.dk/en/vegansk) |
| Amalienborgmuseet | Museum | [`history`](https://denkongeligesamling.dk/amalienborg/) |
| Rosenborg Slot | Museum | [`history`](https://denkongeligesamling.dk/rosenborg-slot/slottets-historie/kronjuvelerne/) |
| Magasin du Nord Museum | Museum | [`history`](https://magasinmuseum.dk/om-museet/) |
| Dansk Jødisk Museum | Museum | [`history`](https://www.jewmus.dk/om-museet) |
| Politimuseet | Museum | [`history`](https://politi.dk/politimuseet/besoeg/faste-udstillinger) |
| Nyboders Mindestuer | Museum | [`history`](https://nybodersmindestuer.dk/nyboders-historie/) |
| Experimentarium ★ | Museum | [`science`](https://www.experimentarium.dk/plan-your-visit), [`interactive`](https://www.experimentarium.dk/biodiversitet/oplev-naturriget-paa-experimentarium/) |
| Medicinsk Museion | Museum | [`science`](https://www.museion.ku.dk/det-indsamlede-menneske/) |
| VILLUM Window Collection | Museum | [`science`](https://en.villumwindowcollection.com/exhibitions/the-history-of-the-window/) |
| O–Overgaden ★ | Museum | [`art_modern`](https://www.overgaden.org/da/exhibitions) |
| Davids Samling ★ | Museum | [`art_classical`](https://www.davidmus.dk/aeldre-europaeisk-kunst) |
| Børnemuseet | Museum | [`interactive`](https://boernemuseet.dk/vaerksteder/) |

Hver deltager får 8 restauranter og 7 museer. Seks fælles steder giver sammenlignelige vurderinger på tværs af deltagere. Resten udvælges og ordnes med en deterministisk hash af pilotversion, profil-ID og sted-ID. Den faktiske rækkefølge gemmes ved samtykke. Historie dækker 6 af 12 museer, og kataloget omfatter også samtidskunst, ældre malerier, videnskab og interaktive aktiviteter. Kunstkategorierne har én fælles reference hver, så de muligheder indgår i alle sessioner.

## 4. Data og databeskyttelse

- Flowet viser stednavn, stedtype og beskrivelse. API'ets svar for det aktuelle sted indeholder ingen score eller rangering.
- Samtykke, quizsvar og stedkø er knyttet til et tilfældigt profil-ID. Der indsamles ingen navne, mailadresser eller fritekst. Kør demo-API'et på et betroet lokalt netværk. Det eksisterende profil-ID er en lokal demoidentitet, som skal holdes privat.
- Positive og negative labels gemmes med præferencesnapshot og reference til det låste stedkatalog. Kataloget bevarer stedtype, beskrivelse, featureværdier og kilder. En senere OSM-berigelse ændrer de almindelige steddatasæt, mens eksporten bruger pilotversionens stedkatalog.
- Skip gemmes som fremdrift og er udeladt af træningseksporten. Gentagelse af samme svar er idempotent. Et andet svar på samme sted giver en synlig konflikt, så tidligere målinger bevares. Kontakt forsøgslederen ved fejl eller ønske om at trække deltagelsen tilbage.
- Gemte quizpakker og vurderinger genindlæses efter appstart. En quizpakke gemmes, når deltageren trykker *Gem quiz*.
- Pilot 1 er frosset i en særskilt eksport med de 75 originale præferencesnapshots og stedfeatures fra den verificerede baseline. Brug de to eksportkommandoer hver for sig. Hold eksportfiler, profil-ID'er og eventuelle manuelle notater privat.

## 5. Klargøring og audit

Kør fra `services/api` med Docker PostgreSQL og stederne fra ExploreXP. På en database med historiske vurderinger skal den eksisterende OSM-backfill være udført **før** migrationen, så Pilot 1-arkivet bruger baseline-dækningen.

```powershell
npm.cmd run places:backfill-osm-features
npm.cmd run db:migrate
npm.cmd run pilot:prepare
npm.cmd run pilot:audit
npm.cmd run pilot:test:e2e
npm.cmd run ml:export -- ../ml/artifacts/pilot-1-archive.json
npm.cmd run ml:export -- --pilot2 ../ml/artifacts/pilot-2-feedback.json
```

`pilot:audit` kontrollerer stedkatalog, quizversion, vurderingsgating, snapshots og eksport. Den viser featurefordeling, gennemførte quizzer og signaler pr. deltager, labels og skip fordelt på stedtype, klasseskævhed, tomme profiler, dubletter og historik. Tekniske fejl giver `BLOCKED` og en fejlkode. På den faktiske database gav auditten `READY` med 24/24 dokumenterede steder, 75/75 historiske vurderinger, nul Pilot 2-deltagere og nul labels. Den historiske eksport var byte-identisk med ML Baseline v1. Indsamling er fortsat lukket.

## 6. Test og Android-kontrol

Det isolerede E2E-forløb brugte to testprofiler i en midlertidig PostgreSQL-database. Det verificerede samtykke, quizvalidering, neutral profil, gating i API og database, seks fælles steder via separat regressionstest, genoptagelse, dobbeltkald, konflikter, skip, afslutning, stabil eksport efter ændringer i levende steddata og afvisning af audit ved deaktiveret databasetrigger.

De 18 API-tests, 10 mobiltests og 6 Python-tests for preprocessing og målinger bestod. Den eksisterende Python-test, der fitter modeller, blev sprunget over i den lokale readiness-kørsel. Android-bundlet blev bygget, og Expo Go med SDK 58 blev prøvet på en Android API 35-emulator med isoleret testdata. En testprofil gennemførte samtykke, alle quizzer, præferencevisning, alle tre svarmuligheder og slutskærmen efter 15 steder. Efter en tvangslukning fortsatte appen på det samme fjerde sted. På en ny testprofil rykkede et hurtigt dobbelttryk præcis ét sted frem. Den fysiske deltagertelefon var ikke tilsluttet.

På den fysiske testtelefon skal forsøgslederen gennemføre følgende på en **isoleret testdatabase** før rekruttering:

1. Kør `$env:PILOT_PREVIEW_HOST='0.0.0.0'` og `npm.cmd run pilot:test:e2e -- --preview` fra `services/api` på et betroet netværk. Kommandoen åbner Pilot 2 på port 3312 i en midlertidig testdatabase. Sæt `EXPO_PUBLIC_PILOT2=1` og `EXPO_PUBLIC_API_BASE_URL=http://<laptop-IP>:3312` i separat Expo-terminal, og åbn appen i Expo Go på samme netværk. [Expo Go til SDK 58](https://expo.dev/go?device=true&platform=android&sdkVersion=58)
2. Opret en ny person. Kontrollér samtykket, gem mindst ét neutralt svar og ét eksplicit fravalg, og bekræft profilen efter alle fire quizzer.
3. Gem *Interesseret*, *Ikke interesseret* og *Ved ikke / spring over*. Kontrollér, at visningen er læsbar og viser stedets beskrivelse uden score. Prøv et dobbelttryk og luk appen undervejs. Genåbn og kontrollér næste position. Gennemfør alle 15 steder og se slutskærmen.
4. Tryk Enter i test-API-terminalen for at få audit-resumé og automatisk oprydning. Kontrollér, at oversprungne steder kun tæller som skip. Kør audit igen på den faktiske database. Sæt først `PILOT2_OPEN=1` og genstart det faktiske API, når telefonprøven og auditten er bestået. Skift derefter Expo tilbage til det faktiske API's LAN-adresse.

## 7. Kort vejledning til deltagerne

1. Åbn *Pilot 2* på en frisk profil. Læs informationen, og vælg kun at deltage, hvis du har lyst.
2. Besvar de fire korte quizzer ud fra egne interesser. Brug *Ingen præference / ved ikke*, når det passer. Læs din præferenceprofil.
3. Vurdér hvert af de 15 steder. Brug *Interesseret*, *Ikke interesseret* eller *Ved ikke / spring over*. Alle svarmuligheder er lige acceptable. Du kan holde pause eller stoppe.
4. Når du ser *Tak for din deltagelse*, er sessionen afsluttet. Fortæl forsøgslederen, hvis der opstod en fejl.

Forsøgslederen opretter én frisk profil til hver af mindst ti nye, uafhængige deltagere. På en delt telefon opretter forsøgslederen den næste profil efter afslutning eller afbrydelse af den foregående session. Kør audit igen efter indsamlingen, og vurder klasseskævhed uden at forsøge at styre deltagernes svar.
