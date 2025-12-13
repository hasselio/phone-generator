# Settingfil-generator for telefonsystem

Et program for å generere konfigurasjonsfiler for Helselogistikk. Denne applikasjonen lager både `.phn`-filer for Avaya og `.json`-filer for Ascom basert på en nummerserie, med støtte for innhenting av rolle- og brukernavn via xlsx-opplasting.

## Funksjoner

### 📱 Fildeling
- **Avaya `.phn`-filer** med kryptografisk sikre passord:
  ```
  SET SIPUSERNAME [nummer]
  SET SIPUSERPASSWORD [passord]
  GET /mdm/[kode]/avaya/rw-sikt.txt
  ```

- **Ascom `.json`-filer** med enhets-ID:
  ```json
  {"voip_device_id": "[nummer]"}
  ```

### 📊 Rollemapping (valgfritt)
- Last opp xlsx-fil med rollenavn i kolonne A
- Genererer automatisk regneark med:
  - **Kolonne A**: Rollenavn (fra opplastet fil)
  - **Kolonne B**: HL [KODE] (f.eks. "HL VVHF")
  - **Kolonne C**: Telefonnummer
  - **Kolonne D**: Generert passord

### 🔐 Sikkerhet
- Passord genereres med `secrets`-modulen (kryptografisk sikker)
- Kun tall, store og små bokstaver (ingen spesialtegn)
- Maks lengde: 15 tegn
- Minst én av hver: liten bokstav, stor bokstav, siffer

### 🎨 Design
- **iOS 26 Glassmorphism** med glass-effekter
- Mørk gradient bakgrunn
- Semi-transparente elementer med blur
- Optimalisert for desktop-bruk

### ⚡ Ytelse
- Server-Sent Events (SSE) for sanntids fremdrift
- Automatisk opprydding av midlertidige filer
- Komprimert ZIP-eksport

## Forhåndsvisning

Forhåndsvisning av applikasjonen:

<div align="center">
  <img src="./static/images/bilde.png" alt="Screenshot av Settingfil-generator" width="600" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
</div>

## Installasjon

1. Klon dette repositoriet:
   ```bash
   git clone [repo-url]
   cd phone-generator
   ```

2. Installer avhengigheter:
   ```bash
   pip install -r requirements.txt
   ```

## Bruk

### 1. Start applikasjonen
```bash
python app.py
```
Åpne nettleseren og gå til `http://localhost:5000`

### 2. Generer filer
1. **Foretakskode**: Skriv inn kode (f.eks. VVHF, OUS, LAB)
2. **Nummerserie**: Velg start- og sluttnummer
3. **Rollenavn (valgfritt)**: Last opp xlsx-fil med rollenavn i kolonne A
4. Klikk "Generer Filer"

### 3. Last ned
Når genereringen er ferdig, lastes ned en ZIP-fil som inneholder:
- `/avaya/` - Alle `.phn`-filer
- `/ascom/` - Alle `.json`-filer  
- `output_[kode].xlsx` - Regneark med output (hvis xlsx ble lastet opp)

## Teknologi

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Design**: iOS 26 Glassmorphism
- **Sikkerhet**: `secrets`-modulen for passordgenerering
- **Filhåndtering**: `openpyxl` for xlsx-støtte
- **Real-time**: Server-Sent Events (SSE)

## Filtyper

| Filtype | Format | Bruk |
|---------|--------|------|
| `.phn` | Tekst | Avaya telefonsystem |
| `.json` | JSON | Ascom telefonsystem |
| `.xlsx` | Excel | Rollemapping (output) |

## Sikkerhet

- Alle passord genereres med `secrets.choice()` for kryptografisk sikkerhet
- Midlertidige filer slettes automatisk etter nedlasting
- Filnavn valideres for å forhindre path traversal

## Filstruktur

```
phone-generator/
├── app.py                # Hovedapplikasjonen
├── requirements.txt      # Avhengigheter
├── README.md             # Denne filen
├── static/
│   ├── css/
│   │   └── style.css    # iOS 26 Glassmorphism stil
│   ├── js/
│   │   └── script.js    # Klientdelslogikk med filopplasting
│   └── images/
│       └── bilde.png    # Skjermbilde av applikasjonen
└── templates/
    └── index.html       # Hovedmal med filopplasting
```

## Avhengigheter

- Python 3.7+
- Flask 2.3.3
- Werkzeug 2.3.7
- openpyxl 3.1.2
- python-dotenv 1.0.0

Installer med:
```bash
pip install -r requirements.txt
```

## Lisens

MIT License
