# 🛣 Safe Route Planner & Evacuation Directions Subsystem

> **Subsystem:** Flood-Aware Routing Engine & Tactical Evacuation Subsystem (`app/api/routing/directions/`)  
> **Status:** ✅ Complete, Fully Integrated & Production Ready (v3.0)

---

## 📖 Table of Contents

1. [Subsystem Purpose & Overview](#-subsystem-purpose--overview)
2. [The "God's Eye" Multi-Tiered Situational Architecture](#-the-gods-eye-multi-tiered-situational-architecture)
3. [Open-Source Repositories, APIs & Libraries Used](#-open-source-repositories-apis--libraries-used)
4. [End-to-End Routing & Scoring Pipeline](#-end-to-end-routing--scoring-pipeline)
5. [Mathematical Formulas & Pathfinding Engine](#-mathematical-formulas--pathfinding-engine)
   - [Haversine Great-Circle Distance](#1-haversine-great-circle-distance)
   - [Route Geometric Deduplication](#2-route-geometric-deduplication)
   - [Proactive Flood Avoidance Polygons (`avoid_polygons`)](#3-proactive-flood-avoidance-polygons-avoid_polygons)
   - [Vehicle-Specific Clearance & Fording Limits](#4-vehicle-specific-clearance--fording-limits)
   - [Flood Penalty Tiers & Hazard Severity](#5-flood-penalty-tiers--hazard-severity)
   - [Safety Score Formulation](#6-safety-score-formulation)
   - [Mathematical Normalization (Time & Distance)](#7-mathematical-normalization-time--distance)
   - [Final Multi-Objective Evacuation Ranking Formula](#8-final-multi-objective-evacuation-ranking-formula)
6. [Key Features & Capabilities](#-key-features--capabilities)
   - [City-Scoped Shelters & Hospitals Filter](#1-city-scoped-shelters--hospitals-filter)
   - [One-Tap Emergency Evacuate (`⚡`)](#2-one-tap-emergency-evacuate-)
   - [Dual Zero-Connectivity Offline Exports (GPX 1.1 + Print-to-PDF)](#3-dual-zero-connectivity-offline-exports)
   - [Interactive Driving Simulation](#4-interactive-driving-simulation)
   - [AI Tactical Driver Briefing (Google Gemini)](#5-ai-tactical-driver-briefing-google-gemini)
7. [API Reference & Request/Response Payloads](#-api-reference--requestresponse-payloads)
8. [Key Subsystem Files](#-key-subsystem-files)

---

## 🌟 Subsystem Purpose & Overview

During extreme monsoon events and flash floods, conventional GPS navigators fail because they optimize purely for speed without awareness of inundated underpasses, overflowing lake outfalls, or vehicle engine fording thresholds.

This subsystem provides:
1. **100% Real-Road Routing**: OpenRouteService and OSRM integration with zero synthetic or straight-line approximations.
2. **Proactive Flood Avoidance**: Injection of GeoJSON `avoid_polygons` directly into routing algorithms.
3. **Vehicle-Specific Clearance Physics**: Dynamic fording thresholds for bikes ($0.10\text{m}$), passenger cars ($0.20\text{m}$), 4x4 rescue ambulances ($0.50\text{m}$), and buses ($0.55\text{m}$).
4. **Explainable Multi-Objective Scoring**: Ranking paths with $60\%$ safety, $25\%$ travel time, and $15\%$ distance weighting.
5. **Zero-Connectivity Survival Exports**: Dual-mode offline navigation via **GPX 1.1** (for offline GPS apps) and **Leaflet Print-to-PDF** (for field printouts).

---

## 🛰️ The "God's Eye" Multi-Tiered Situational Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LEVEL 0: NATIONAL RADAR OVERVIEW (Macro "God's Eye" View)                  │
│  - Real-time weather radar overlay across 18 Indian monitoring hubs.       │
│  - National flood vulnerability indices and aggregate risk indicators.     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Drill to State)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LEVEL 1: REGIONAL / STATE GRID (Mesoscale Command View)                   │
│  - State-wide flood hazard zones, district boundaries, and catchment nodes.│
│  - River basin inflow monitors & inter-city evacuation corridor status.     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Drill to City)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LEVEL 2: CITY DIGITAL TWIN & CATCHMENT GRID (Micro Tactical View)          │
│  - High-resolution street-level digital twin (Chennai, Mumbai, Bengaluru...).│
│  - Low-lying sumps, subway waterlogging sensors, lake outfall status.      │
│  - City-scoped verified shelters, relief camps, and emergency hospitals.   │
│  - Real-time Safe Route Planner overlay with simulated driving preview.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Open-Source Repositories, APIs & Libraries Used

| Tool / Provider / Library | Subsystem Role | Why It Was Chosen |
|---|---|---|
| **OpenRouteService (ORS) API** (`/v2/directions`) | Primary routing provider; computes real-road alternatives with server-side `avoid_polygons` payload. | Supports GeoJSON avoidance polygons to dynamically route *around* flooded underpasses directly inside the routing graph. |
| **OSRM (Open Source Routing Machine)** (`/route/v1`) | Fallback and supplementary routing provider with `alternatives=true&steps=true`. | High-speed, public, zero-key fallback ensuring 100% uptime if ORS rate limits or keys are unavailable. |
| **OpenStreetMap (OSM)** | Road network topology, arterial roads, and map geometry. | Completely open, vendor-neutral road network with accurate metadata on Indian city infrastructure. |
| **Leaflet.js & React-Leaflet** | Interactive map canvas, real-time vehicle movement simulation, hazard markers, and offline PDF rendering. | Lightweight, performant, mobile-friendly open-source mapping engine without proprietary vendor lock-in. |
| **Google Gemini 2.5 (`@google/genai`)** | AI Tactical Copilot delivering 2-sentence driver hazard briefings. | Context-aware generative analysis explaining water depths and recommended precautions. |
| **Garmin GPX 1.1 Schema** | XML GPS Exchange format generator with metadata, waypoints, track segments, and timestamps. | Standardized universal format supported by all offline handheld GPS and mobile navigation apps (OsmAnd, Garmin, Maps.me). |
| **Tailwind CSS & Plus Jakarta Sans** | Modern glassmorphic UI, custom thin scrollbars, and tactile cards. | High-contrast readability during emergency conditions and dark/high-stress environments. |

---

## 🔄 End-to-End Routing & Scoring Pipeline

```text
User selects Origin & Destination (or clicks ⚡ Emergency Evacuate)
                            │
                            ▼
                POST /api/routing/directions
                            │
  ┌─────────────────────────┴─────────────────────────┐
  │ 1. Load Vehicle Clearance & Sump Hazards for City │
  │    (Bike: 0.10m, Car: 0.20m, Amb: 0.50m, Bus: 0.55m)│
  ├───────────────────────────────────────────────────┤
  │ 2. Generate GeoJSON Avoid Polygons (~150m radius) │
  ├───────────────────────────────────────────────────┤
  │ 3. Query ORS (avoid_polygons) + OSRM Alternatives │
  │    (100% real road network — zero synthetic lines)│
  ├───────────────────────────────────────────────────┤
  │ 4. Polyline Deduplication (avg dist < 300m filtered)│
  ├───────────────────────────────────────────────────┤
  │ 5. Sample 80 Points/Route & Evaluate Flood Depth  │
  │    (Flag & exclude impassable flooded roads)      │
  ├───────────────────────────────────────────────────┤
  │ 6. Calculate Normalized Scores:                   │
  │    Safety (60%) + Time (25%) + Distance (15%)     │
  ├───────────────────────────────────────────────────┤
  │ 7. Rank Top 3 Alternatives (Safest, Balanced, Risk)│
  ├───────────────────────────────────────────────────┤
  │ 8. Generate AI Driver Safety Brief (Gemini 2.5)   │
  └─────────────────────────┬─────────────────────────┘
                            │
                            ▼
  Render on Leaflet Map + Interactive HUD Cards + GPX/PDF Exports
```

---

## 📐 Mathematical Formulas & Pathfinding Engine

### 1. Haversine Great-Circle Distance
Calculates the spatial proximity between sampled route coordinates and recorded flood hazard sumps:

$$\Delta\varphi = \frac{\pi}{180} (\text{lat}_2 - \text{lat}_1), \quad \Delta\lambda = \frac{\pi}{180} (\text{lon}_2 - \text{lon}_1)$$

$$a = \sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos\left(\frac{\pi}{180}\text{lat}_1\right) \cos\left(\frac{\pi}{180}\text{lat}_2\right) \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$d = 2 \cdot R \cdot \text{atan2}(\sqrt{a}, \sqrt{1 - a}) \quad \text{where } R = 6,371,000 \text{ meters}$$

---

### 2. Route Geometric Deduplication
Routing engines often return near-identical micro-variations. The engine samples 20 points along both polylines and computes average spatial divergence:

$$\text{Similarity}(R_A, R_B) = \frac{1}{N} \sum_{i=1}^{N} \text{Haversine}(p_{A, i}, p_{B, i})$$

$$\text{If } \text{Similarity} < 300\text{m} \implies \text{Mark as Duplicate (Filtered Out)}$$

---

### 3. Proactive Flood Avoidance Polygons (`avoid_polygons`)
For any flood hazard where $\text{waterDepth} \ge \text{Vehicle}_{\text{maxSafeDepth}}$, a bounding box polygon ($\approx 150\text{m}$ buffer) is injected directly into OpenRouteService:

$$\Delta\text{lat} = 0.00135^\circ \quad (\approx 150\text{m}), \quad \Delta\text{lng} = \frac{0.00135^\circ}{\cos(\text{lat} \cdot \frac{\pi}{180})}$$

$$\text{Polygon Ring} = \big[ [\text{lng}-\Delta\text{lng}, \text{lat}-\Delta\text{lat}], [\text{lng}+\Delta\text{lng}, \text{lat}-\Delta\text{lat}], [\text{lng}+\Delta\text{lng}, \text{lat}+\Delta\text{lat}], [\text{lng}-\Delta\text{lng}, \text{lat}+\Delta\text{lat}], [\text{lng}-\Delta\text{lng}, \text{lat}-\Delta\text{lat}] \big]$$

---

### 4. Vehicle-Specific Clearance & Fording Limits

| Vehicle Mode | Safe Depth ($D_{\text{safe}}$) | Stall Limit ($D_{\text{impassable}}$) | Multiplier ($M_v$) | Tactical Behavior |
|---|---|---|---|---|
| **🛵 Bike (`bike`)** | $\le 0.10\text{m}$ | $> 0.22\text{m}$ | $1.6\times$ | High skid & exhaust flooding risk |
| **🚶 Pedestrian (`walking`)** | $\le 0.15\text{m}$ | $> 0.30\text{m}$ | $1.4\times$ | Current sweep risk; seeks high ground |
| **🚗 Passenger Car (`car`)** | $\le 0.20\text{m}$ | $> 0.40\text{m}$ | $1.0\times$ | Standard engine intake clearance |
| **🚑 Rescue 4x4 (`ambulance`)** | $\le 0.50\text{m}$ | $> 0.85\text{m}$ | $0.60\times$ | Snorkel/lifted chassis capability |
| **🚌 Transit Bus (`bus`)** | $\le 0.55\text{m}$ | $> 0.90\text{m}$ | $0.65\times$ | High-capacity municipal evacuation |

---

### 5. Flood Penalty Tiers & Hazard Severity

**Water Depth Penalty Tiers ($P_{\text{flood}}$):**
* **Low** ($< 0.5 \times D_{\text{safe}}$): $8$
* **Moderate** ($0.5 \times D_{\text{safe}} \le d < D_{\text{safe}}$): $25$
* **Severe** ($D_{\text{safe}} \le d < 1.5 \times D_{\text{safe}}$): $55$
* **Critical** ($d \ge 1.5 \times D_{\text{safe}}$): $80$
* **Impassable** ($d \ge D_{\text{impassable}}$): $9999$ $\rightarrow$ **Route Excluded**

$$\text{Total Penalty} = \sum_{h \in \text{Hazards}} P_{\text{flood}}(h) \times W_{\text{severity}}(h) \times M_v$$

*(where $W_{\text{severity}} = 1.0$ for critical, $0.5$ for moderate, $0.2$ for low)*

---

### 6. Safety Score Formulation
Normalizes total hazard penalty into an intuitive $[5, 100]$ score:

$$\text{Normalized Risk} = \min\left(1.0, \frac{\text{Total Penalty}}{200}\right)$$

$$\text{Safety Score} = \operatorname{round}\Big(\max\big(5, \min(100, 100 \times (1 - \text{Normalized Risk}))\big)\Big)$$

*(If no hazards are detected within 500m of the polyline: $\text{Safety Score} = 100$)*

---

### 7. Mathematical Normalization (Time & Distance)
For all discovered valid alternative routes $[C_1, C_2, \dots, C_k]$:

$$\text{Time Score}(r) = \begin{cases} 
100 & \text{if } T_{\max} = T_{\min} \\
\operatorname{round}\left(100 \times \frac{T_{\max} - T(r)}{T_{\max} - T_{\min}}\right) & \text{otherwise}
\end{cases}$$

$$\text{Distance Score}(r) = \begin{cases} 
100 & \text{if } D_{\max} = D_{\min} \\
\operatorname{round}\left(100 \times \frac{D_{\max} - D(r)}{D_{\max} - D_{\min}}\right) & \text{otherwise}
\end{cases}$$

---

### 8. Final Multi-Objective Evacuation Ranking Formula
In disaster evacuation, **life safety takes precedence over speed**:

$$\text{Final Score} = (\text{Safety Score} \times 0.60) + (\text{Time Score} \times 0.25) + (\text{Distance Score} \times 0.15)$$

**Route Categorization:**
* **🟢 Rank 1 (Top Score):** `🟢 Safest Route` — Emerald Badge (`#10B981`)
* **🟡 Rank 2:** `🟡 Balanced Route` — Amber Badge (`#F59E0B`)
* **🔴 Rank 3:** `🔴 Higher-Risk Route` — Rose Badge (`#EF4444`)

---

## ⚡ Key Features & Capabilities

### 1. City-Scoped Shelters & Hospitals Filter
* Strict spatial boundary filtering prevents cross-city clutter. Selecting **Chennai** filters shelters strictly to Chennai emergency relief hubs (*Madha Medical College*, *Jawaharlal Nehru Stadium*, etc.).

### 2. One-Tap Emergency Evacuate (`⚡`)
* Instantly captures live GPS coordinates $\rightarrow$ runs Haversine nearest-neighbor across verified safe hubs $\rightarrow$ auto-populates destination $\rightarrow$ renders 3 ranked alternative paths.

### 3. Dual Zero-Connectivity Offline Exports
When cell towers go down during heavy rains, users have two survival export tools:
* **📡 GPX 1.1 Export (`.gpx`)**: Full track segments, elevation profiles, timestamps, and Garmin TrackPoint extensions for OsmAnd, Maps.me, and handheld GPS units.
* **🖨️ Leaflet Print-to-PDF**: Opens a self-contained print-preview document with an interactive OpenStreetMap capture, route polyline, start/end markers, hazard summary, and step-by-step turn table.

### 4. Interactive Driving Simulation
* Clicking **"Simulate Drive"** animates a live vehicle marker moving along the exact OpenStreetMap polyline, previewing turns and verifying hazard clearance in real-time.

### 5. AI Tactical Driver Briefing (Google Gemini)
* Integrated with Google Gemini 2.5 (`@google/genai`) to generate crisp 2-sentence tactical warnings regarding water depths and speed recommendations (with deterministic offline fallback).

---

## 📡 API Reference & Request/Response Payloads

### Route Calculation Endpoint: `POST /api/routing/directions`

#### Request Payload
```json
{
  "originLat": 12.9756,
  "originLng": 80.1085,
  "originLabel": "My Live Location (12.9756, 80.1085)",
  "destLat": 12.9815,
  "destLng": 80.2180,
  "destLabel": "Madha Medical College Hospital",
  "vehicle": "car",
  "cityId": "chennai"
}
```

#### Response Payload
```json
{
  "routes": [
    {
      "id": "route-ors-0",
      "name": "via Kundrathur Road, O3278",
      "summaryText": "No known flood hazards on this route · Clear road conditions expected · Recommended for safest evacuation",
      "coordinates": [[80.1085, 12.9756], [80.1120, 12.9780], ...],
      "distanceKm": 10.6,
      "durationMin": 15,
      "safetyScore": 100,
      "timeScore": 100,
      "distanceScore": 100,
      "finalScore": 100,
      "riskCategory": "safe",
      "riskLabel": "🟢 Safest Route",
      "badgeColor": "bg-emerald-600 text-white",
      "lineColor": "#10B981",
      "isSafest": true,
      "hasFloodHazard": false,
      "maxFloodDepth": 0,
      "whyRecommended": "No known flood hazards on this route · Recommended for safest evacuation",
      "safetyMarkers": [],
      "steps": [
        {
          "instruction": "Head east on Main Road",
          "distanceKm": 1.2,
          "durationMin": 2,
          "name": "Main Road"
        }
      ]
    }
  ],
  "safestRoute": { ... },
  "providerUsed": "ors",
  "aiBriefing": "All clear: Route offers optimal clearance for car (100/100 safety, 15 mins). No critical water sumps encountered.",
  "avoidPolygonsApplied": true,
  "vehicleClearance": {
    "maxSafeDepth": 0.20,
    "impassableDepth": 0.40,
    "penaltyMultiplier": 1.0
  }
}
```

---

## 📂 Key Subsystem Files

| File Path | Subsystem Role |
|---|---|
| [`app/api/routing/directions/route.ts`](file:///c:/Users/balamurugan/OneDrive/Desktop/sih26/app/api/routing/directions/route.ts) | **Core Routing & Scoring API**: ORS/OSRM queries, `avoid_polygons`, deduplication, hazard evaluation, and Gemini AI briefing. |
| [`components/SafeRoutePlanner.tsx`](file:///c:/Users/balamurugan/OneDrive/Desktop/sih26/components/SafeRoutePlanner.tsx) | **Interactive Route Panel**: City-scoped destination picker, vehicle clearance pills, route ranking cards, GPX & PDF export buttons, turn accordion. |
| [`components/LeafletRouteMap.tsx`](file:///c:/Users/balamurugan/OneDrive/Desktop/sih26/components/LeafletRouteMap.tsx) | **Map Visualization**: Leaflet multi-route polylines, start/shelter markers, hazard sumps, and animated simulation marker. |
| [`components/LiveMapDashboard.tsx`](file:///c:/Users/balamurugan/OneDrive/Desktop/sih26/components/LiveMapDashboard.tsx) | **God's Eye Dashboard**: 3-Level drill-down (National $\rightarrow$ State $\rightarrow$ City), radar overlay, and route planner overlay. |
| [`lib/routing/engine.ts`](file:///c:/Users/balamurugan/OneDrive/Desktop/sih26/lib/routing/engine.ts) | **Emergency Presets**: City-specific emergency hubs, hospitals, and hazard coordinates. |
