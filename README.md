# RheumCompanion — Developer Handoff Package

## Overview

**RheumCompanion** is a cross-platform mobile application for rheumatology patients. It provides disease education, FDA drug information, AI-powered Q&A, symptom/flare tracking, a drug interaction checker, and a clinical trial finder.

| Field | Value |
|-------|-------|
| **App ID** | `com.rheumcompanion.app` |
| **Framework** | React 19 + Vite 8 |
| **Native Layer** | Capacitor 8 (Android + iOS) |
| **AI Backend** | Google Gemini API (gemini-2.5-pro) |
| **State** | localStorage (no remote backend) |

---

## Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Android Studio** (for Android builds — requires SDK 34+, Gradle 9.x)
- **Xcode 15+** (for iOS builds — macOS only)

### Install & Run (Web Dev Server)
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in a browser.

### Build for Production
```bash
npm run build
```

### Android Build
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```
Output APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### iOS Build (macOS only)
```bash
npm run build
npx cap sync ios
npx cap open ios       # Opens in Xcode
```
Then build/run from Xcode.

---

## API Key Configuration

The app uses the **Google Gemini API** for two features:
1. **RheumBot** (AI chat assistant) — `src/pages/Chatbot.jsx`
2. **Drug Interaction Checker** — `src/pages/Interactions.jsx`

The API key is stored in the device's `localStorage` under the key `rheum_gemini_api_key`. Users enter it via a settings panel in the app.

**For development/testing**, you can pre-set the key by opening the browser console and running:
```js
localStorage.setItem('rheum_gemini_api_key', 'YOUR_API_KEY_HERE');
```

See `.env` file in this package for the current production key.

---

## Project Structure

```
rheumatology-app/
├── android/                  # Native Android project (Capacitor-managed)
├── ios/                      # Native iOS project (Capacitor-managed)
├── public/                   # Static assets
├── src/
│   ├── api/
│   │   ├── clinicaltrials.js # ClinicalTrials.gov v2 API client
│   │   ├── fda.js            # OpenFDA drug label API client
│   │   ├── gemini.js         # Gemini API (chat + drug interactions)
│   │   └── pubmed.js         # PubMed search API client
│   ├── assets/               # Images, fonts
│   ├── components/
│   │   ├── Icons.jsx         # SVG icon library (30+ medical icons)
│   │   └── Layout.jsx        # App shell with bottom navigation
│   ├── context/
│   │   └── AuthContext.jsx   # Authentication state (mock/demo flow)
│   ├── data/
│   │   ├── clinicVisit.js    # Clinic visit preparation content
│   │   ├── diseases.js       # Disease catalog (RA, SLE, PsA, AS, etc.)
│   │   ├── medications.js    # Drug class data (NSAIDs, DMARDs, biologics)
│   │   └── whenToCall.js     # Urgency guidance content
│   ├── pages/
│   │   ├── Chatbot.jsx       # AI chat (RheumBot)
│   │   ├── ClinicVisit.jsx   # Clinic visit prep tool
│   │   ├── ClinicalTrials.jsx# Clinical trial finder by diagnosis
│   │   ├── Diseases.jsx      # Disease encyclopedia
│   │   ├── Home.jsx          # Home dashboard
│   │   ├── Interactions.jsx  # Drug interaction checker
│   │   ├── Login.jsx         # Login screen
│   │   ├── Medications.jsx   # Medication reference (FDA labels)
│   │   ├── Register.jsx      # Registration flow
│   │   ├── SymptomLookup.jsx # Symptom vs. side effect tool
│   │   ├── Tracker.jsx       # Symptom/flare tracker
│   │   ├── VerifyEmail.jsx   # Email verification step
│   │   └── WhenToCall.jsx    # Urgency decision tree
│   ├── utils/
│   │   ├── storage.js        # localStorage helper (prefixed keys)
│   │   └── tracker.js        # Tracker data model, insights engine, export
│   ├── App.jsx               # Root component with routing
│   ├── App.css               # Minimal app-level styles
│   ├── index.css             # Full design system (tokens, components)
│   └── main.jsx              # React entry point
├── capacitor.config.json     # Capacitor native config
├── index.html                # HTML entry point
├── package.json              # Dependencies & scripts
├── vite.config.js            # Vite bundler configuration
└── rheumcompanion.apk        # Pre-built Android debug APK
```

---

## Key Features & Implementation Notes

### 1. Authentication (Mock)
- **Files**: `Login.jsx`, `Register.jsx`, `VerifyEmail.jsx`, `AuthContext.jsx`
- Demo credentials: any email + password `password`
- Verification code: `123456`
- **Status**: Mock flow — needs real backend integration for production.

### 2. Disease Catalog
- **Files**: `Diseases.jsx`, `data/diseases.js`
- 13 rheumatologic conditions with symptoms, treatments, and lifestyle guidance
- Personalized highlighting based on user profile diseases

### 3. Medication Reference
- **Files**: `Medications.jsx`, `data/medications.js`, `api/fda.js`
- Local drug class data + live OpenFDA API integration for package inserts
- 7 drug classes covering NSAIDs, DMARDs, biologics, JAK inhibitors, etc.

### 4. RheumBot (AI Chat)
- **Files**: `Chatbot.jsx`, `api/gemini.js`
- Gemini 2.5 Pro with strict medical system prompt
- Chat history persisted locally; shareable via native Share API

### 5. Drug Interaction Checker
- **Files**: `Interactions.jsx`, `api/gemini.js` (`checkDrugInteractions`)
- Severity-grouped output (🔴 SEVERE / 🟡 MODERATE / 🟢 MILD)
- Includes clinical mechanism explanations

### 6. Symptom & Flare Tracker
- **Files**: `Tracker.jsx`, `utils/tracker.js`
- Core symptoms: Pain, Stiffness, Fatigue, Swelling, Rash
- Custom symptoms, flare triggers, medication logging, daily notes
- **Insights engine**: Flare warnings (3-day avg > 7), trend detection, positive reinforcement
- **Medical export**: Formatted 30-day report shared via native Share API

### 7. Symptom Lookup
- **File**: `SymptomLookup.jsx`
- Helps distinguish disease symptoms from medication side effects

### 8. Clinical Trial Finder
- **Files**: `ClinicalTrials.jsx`, `api/clinicaltrials.js`
- Searches ClinicalTrials.gov v2 API (free, no API key required)
- Dropdown pre-populated with all 13 app diagnoses, plus custom entry
- Expandable result cards with status badges, phase, sponsor, interventions, and locations
- Direct links to full study pages on ClinicalTrials.gov

### 9. Clinic Visit Prep & When to Call
- **Files**: `ClinicVisit.jsx`, `WhenToCall.jsx`
- Structured checklists and urgency decision guidance

---

## Native Plugins (Capacitor)

| Plugin | Version | Purpose |
|--------|---------|---------|
| `@capacitor/app` | 8.1.0 | Hardware back button, app lifecycle |
| `@capacitor/dialog` | 8.0.1 | Native alert/confirm dialogs |
| `@capacitor/share` | 8.0.1 | Native share sheet (email, SMS, etc.) |

---

## Design System

All design tokens and component styles are in `src/index.css`:
- CSS custom properties for colors, spacing, typography, radii
- Dark theme by default (`--bg-primary: #0a0e1a`)
- Safe area insets for camera notch handling
- Responsive bottom navigation bar (opaque boxed buttons)

---

## Known Issues & Recommendations

1. **Auth is mock-only** — Replace with a real auth provider (Firebase Auth, Supabase, etc.)
2. **No remote data persistence** — All data is in localStorage. Consider a cloud sync solution for production.
3. **npm vulnerabilities** — Run `npm audit fix` to address known dependency issues.
4. **iOS icon** — The RC app icon has been set for Android mipmap directories. The iOS icon in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` should be updated with matching assets via Xcode.
5. **Gemini model version** — Currently pinned to `gemini-2.5-pro`. Update the URL in `src/api/gemini.js` if a newer model is preferred.
