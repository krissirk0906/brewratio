# Legal Preflight & IP Audit — BrewRatio

**Internal Package ID:** `com.junenine.brewratio`  
**Public Product Name:** BrewRatio  
**Type:** Client-side Static Coffee Ratio Calculator & Pour Timer Web Application  
**Audit Date:** 2026-11-02  

---

## 1. Trademark & Brand Audit
- **"BrewRatio" Name:** Descriptive common phrase in coffee brewing; no conflicting active trademark found in Class 9/42 for generic coffee ratio calculators.
- **Third-Party Trademarks (V60, AeroPress, Chemex):**
  - "V60" is a trademark of Hario Co., Ltd.
  - "AeroPress" is a trademark of AeroPress, Inc.
  - "Chemex" is a trademark of Chemex Corp.
  - **Compliance Action:** Use nominative fair use to describe brewing methods (e.g., "Pour-Over / V60 style", "AeroPress style"). Include standard trademark disclaimer in footer: *"V60, AeroPress, and Chemex are registered trademarks of their respective owners. BrewRatio is an independent tool not affiliated with or endorsed by these brands."*

## 2. Industry Formulas & Data Rights
- **SCA Golden Cup Standard:** SCA (Specialty Coffee Association) published brew ratios (e.g., 55g/L - 60g/L, 1:15 to 1:18) are mathematical facts and open brewing standards, not subject to copyright.
- **Audio Chimes / SFX:** Use Web Audio API synthesized tones (clean sine/triangle wave chimes via AudioContext oscillator) to avoid any external audio copyright or licensing constraints.

## 3. Open Source Licenses & Dependencies
- `astro`: MIT License
- `typescript`: Apache-2.0
- `vitest`: MIT License
- `@astrojs/check`: MIT License
- `@astrojs/sitemap`: MIT License
- **Verdict:** All permissive licenses compatible with proprietary web distribution.

## 4. Privacy & Compliance
- Pure client-side calculations (zero server-side tracking, zero cookies, local-storage only for user preferences).
- GDPR / CCPA compliant by architecture (no PII collected or stored).
