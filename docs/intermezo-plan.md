# Intermezo – plan aplikacije za praćenje faktura

Oct 7, 2026 · @Elmedin

## Cilj i kontekst

Pravimo aplikaciju za praćenje faktura prema dobavljačima za restoran mog prijatelja. Nakon mjesec dana testiranja potpuno zamjenjuje notes u kojem sada vode fakture.

- **Glavni cilj:** aplikacija koju pravi restoran koristi svaki dan, pouzdano i bez papira.
- **Portfolio:** projekat sa stvarnim korisnikom, feedbackom i izjavom klijenta.
- **Moguća prodaja:** ako bude interesa, nudim je drugim ugostiteljskim objektima preko prijateljevih poznanstava. Ako ne bude, aplikacija ostaje samo kod njega.

Prva verzija se pravi za jednog klijenta, ali baza se od početka postavlja tako da može podržati više firmi.

## Korisnici i uređaji

Dva korisnika na dvije platforme dijele iste podatke iste firme i oba unose fakture, pa unos mora biti jednako brz na Androidu i na webu.

| Korisnik | Uloga | Uređaj | Kako koristi aplikaciju |
| --- | --- | --- | --- |
| Prijatelj | Svakodnevni unos faktura | Android telefon | Prava aplikacija, instalirana kao APK |
| Šef | Unos faktura i pregled dugovanja | iPhone, laptop | Web verzija, dodata na početni ekran |

Na iPhoneu notifikacije iz web verzije rade samo kad je aplikacija dodata na početni ekran.

## Stack i hosting

Stack je Expo + Supabase + Netlify, sve na besplatnim planovima tokom testiranja.

| Dio | Alat | Šta radi |
| --- | --- | --- |
| Frontend | Expo (React Native) | Ekrani aplikacije za Android i web iz istog koda |
| Android build | EAS Build | Pravi APK koji se šalje prijatelju |
| Backend | Supabase | Baza (PostgreSQL), prijava, pravila pristupa (RLS), slike, Edge Functions |
| Web hosting | Netlify | Hostuje web verziju za šefa i laptop |
| Kod | GitHub | Čuva kod, a svaki push automatski objavljuje web verziju |

Supabase je backend: ne pišem svoj server. Aplikacija razgovara direktno sa Supabaseom preko biblioteke `supabase-js`.

**Na šta paziti:** besplatni Supabase projekat se pauzira nakon 7 dana bez korištenja i nema automatske backupe. Kad aplikacija postane jedino mjesto za fakture, plaćeni plan (25 $ mjesečno) donosi i dnevne backupe.

**Kasnije, samo ako se prodaje:** App Store (99 $ godišnje), Google Play (25 $ jednokratno), vlastita domena.

## Model podataka

Fakture pripadaju firmi, ne korisniku. Korisnik vidi firmu preko članstva, pa odlazak uposlenika ne briše nijednu fakturu.

| Tabela | Ključna polja | Napomena |
| --- | --- | --- |
| `korisnici` | id, ime, email | Vodi ih Supabase Auth |
| `firme` | id, naziv, vrsta objekta | Restoran, kafić, nargila bar |
| `clanstva` | korisnik\_id, firma\_id, uloga | Uloga: vlasnik ili poslovođa |
| `dobavljaci` | id, firma\_id, naziv, auto\_rok\_dana | Prazan `auto_rok_dana` znači da se rok unosi ručno |
| `fakture` | id, firma\_id, dobavljac\_id, broj, iznos, datum\_unosa, rok\_placanja, placeno, datum\_placanja | Iznos u KM |

Pravila pristupa (RLS) u bazi: korisnik čita i mijenja samo redove firmi u kojima ima članstvo. Ovo se postavlja od prvog dana, jer se teško dodaje naknadno.

**Kasnije:** tabela `placanja` za djelimična plaćanja i polje za sliku fakture.

## Ekrani i tok aplikacije

Aplikacija ima četiri nivoa ekrana, a sav svakodnevni rad se dešava na ekranu dobavljača.

Tok: Prijava → Moje firme (jedna firma: ulazi direktno) → Dobavljači → Dobavljač → tabovi Dugovanja i Plaćeno. Dugovanja → Unos fakture (broj, iznos, datum unosa, rok). Kvačica prebacuje fakturu u Plaćeno, „Poništi“ je vraća.

Prototip iz artifakta je polazna tačka za dizajn: isti tabovi, isti unos, ista kvačica za plaćanje. Novi su samo ekrani za prijavu i izbor firme.

## Obim prve verzije

Prva verzija radi tačno ono što je u bilješci, plus prijavu i izvoz podataka.

**U prvoj verziji:**

- Prijava emailom i lozinkom
- Lista firmi; ko ima jednu firmu, ulazi direktno u nju
- Dobavljači: dodavanje, uređivanje, automatski ili ručni rok plaćanja
- Dugovanja: unos fakture (broj, iznos, datum unosa, rok plaćanja), oznaka da kasni ili uskoro dospijeva
- Plaćeno: kvačica prebacuje fakturu sa datumom plaćanja, uz mogućnost poništavanja
- Ukupni dug po dobavljaču i za cijelu firmu
- Izvoz u Excel, kao backup i za knjigovođu

**Kasnije, prema feedbacku:**

- Podsjetnici prije roka plaćanja
- Djelimična plaćanja
- Slika fakture uz unos, a zatim automatsko čitanje podataka sa slike
- Pretraga i filteri po periodu i iznosu
- Različita prava po ulogama (npr. samo vlasnik briše)
- Pozivanje novih korisnika u firmu iz aplikacije

## Faze rada

Rad ide u šest faza, a prijatelj dobija aplikaciju na testiranje nakon pete.

1. **Priprema:** napraviti račune na GitHubu, Expou (EAS), Supabaseu i Netlifyju; razgovor s prijateljem o otvorenim pitanjima (dolje).
2. **Postavljanje projekta:** novi Expo projekat sa web podrškom, povezivanje sa Supabaseom, GitHub repozitorij.
3. **Baza:** tabele iz modela podataka, RLS pravila, ručno unesena firma i dva korisnika za test.
4. **Ekrani:** prijava, firme, dobavljači, ekran dobavljača sa tabovima Dugovanja i Plaćeno, forme za unos. Dizajn prema postojećem prototipu.
5. **Izvoz i objava:** izvoz u Excel, APK preko EAS Builda, web verzija na Netlify. Instalacija na oba uređaja uživo s prijateljem i šefom.
6. **Testni mjesec i dorade:** sedmični feedback, ispravke, pa potpuni prelazak sa notesa.

## Testni mjesec

Tokom testnog mjeseca prijatelj paralelno vodi i notes, tako da ništa ne gubi ako se pojavi greška.

- **Šta pratim:** broj unesenih faktura sedmično, koliko traje unos jedne fakture, šta im smeta, šta im nedostaje.
- **Feedback:** kratak razgovor jednom sedmično; bilješke idu u ovaj Project.
- **Backup:** izvoz u Excel svake sedmice dok je baza na besplatnom planu.
- **Kriterij za prelazak:** sve fakture iz notesa su i u aplikaciji, a prijatelj se na nju oslanja bez provjere u notesu.
- **Dogovor za portfolio:** unaprijed tražiti dozvolu za ime restorana, snimke ekrana i kratku izjavu.

## Otvorena pitanja za prijatelja

- [ ] Koliko faktura dobija sedmično i od koliko dobavljača?
- [ ] Koji dobavljači imaju fiksan rok plaćanja i koliko dana?
- [ ] Da li plaća fakture u dijelovima ili uvijek cijeli iznos?
- [ ] Ko unosi fakture, a ko ih samo pregleda?
- [ ] Da li knjigovođa treba izvještaj, i u kojem obliku?
- [ ] Da li su mu korisni podsjetnici prije roka, i kada (npr. 3 dana prije)?
- [ ] Da li čuva papirne fakture i treba li mu slika uz unos?
- [ ] Da li se slaže da aplikacija i njegova izjava idu u moj portfolio?
