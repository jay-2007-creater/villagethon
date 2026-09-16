# 🏛️ CityAssist: Google Play Store Publication Guide

This document contains everything you need to upload, configure, and publish **CityAssist** on the **Google Play Console**.

---

## 📦 1. Technical Build Artifacts

Your production-signed Android App Bundle (`.aab`) and Keystore have been generated and configured:

* **Production Bundle File:**  
  `cityassist-release.aab` (17.0 MB)  
  *Path:* `C:\Users\Asus\.gemini\antigravity-ide\scratch\cityassist-app\cityassist-release.aab` (and mirrored on `P:\`)  
  *(This is the exact file you drag-and-drop into Google Play Console).*

* **Application ID / Package Name:**  
  `com.cityassist.app`

* **Version Code:** `1`  
* **Version Name:** `1.0.0`  
* **Target Android Version:** Android 15 / 14 (API Level 36 / 34+)

* **Production Keystore File:**  
  `android/app/cityassist-release-key.jks`  
  *Key Alias:* `cityassist`  
  *Store Password:* `CityAssist@2026`  
  *Key Password:* `CityAssist@2026`  
  > [!IMPORTANT]
  > **Keep this `.jks` keystore file and passwords safe!** Google Play requires this exact keystore to sign any future app updates you upload.

---

## 📝 2. Store Listing Details (Copy-Paste Ready)

### App Title (Max 30 chars):
```text
CityAssist: Civic Complaints
```

### Short Description (Max 80 chars):
```text
Report civic issues, track municipal repairs & monitor garbage trucks in real-time.
```

### Full Description (Formatted for Play Store):
```text
CityAssist is the smart, unified civic platform connecting residents with the Municipal Council for faster, transparent public grievance redressal and municipal service tracking.

Whether you encounter a broken pothole, an uncleared garbage dump, overflowing sewage, or a non-functioning streetlight, CityAssist empowers you to report issues directly to the concerned ward authorities with photo and GPS evidence.

🌟 KEY FEATURES FOR CITIZENS:
• Quick Civic Grievance Reporting: Capture photos, pinpoint exact GPS location, and describe issues in seconds.
• AI Smart Verification: Automatic duplicate detection and severity assessment ensure high-priority civic hazards are addressed quickly.
• Live Municipal Telemetry: Track your complaint status from "Submitted" to "Under Review", "In-Progress", and "Resolved" with photographic proof from the ward officer.
• Garbage Fleet Tracker: View municipal waste collection compactors on a live GIS map with estimated arrival times for your street.
• Citizen Emergency SOS: Instantly broadcast emergency civic distress alerts (water main bursts, road blockages, hazards) to local municipal disaster teams.
• Multilingual Support: Full support for English, Hindi (हिंदी), and Marathi (मराठी) with audio voice guidance for senior citizens.
• Works Offline: Submit complaints even without an active internet connection—CityAssist will automatically sync your report the moment you reconnect.

🛡️ FOR MUNICIPAL OFFICERS & DRIVERS:
• Ward Task Queue: Civic ward officers can prioritize, verify, and resolve issues within designated service-level timelines.
• Fleet Route Guidance: Dedicated driver view with waste compactor route navigation and waypoint check-ins.
• Role-Based Access: Secure municipal pre-authorization ensuring full civic transparency.

Built for smarter, cleaner, and more responsive cities.
```

### Categorization:
* **Application Category:** Government & Civic Services (or Productivity / Tools)
* **Tags:** Civic, Municipal Services, Grievance Redressal, Smart City, Public Administration

---

## 🔒 3. Mandatory Privacy Policy

Google Play strictly mandates an HTTPS Privacy Policy URL because the app uses **Camera** and **Location**:

* **Privacy Policy File Created:**  
  `privacy_policy.html` (Saved in project root & `www/`)  
* **How to host it for free:**
  * **Option A (GitHub Pages):** Create a free public repository named `cityassist-privacy`, push `privacy_policy.html`, and activate GitHub Pages (URL: `https://<your-username>.github.io/cityassist-privacy/`).
  * **Option B (Firebase Hosting):** Run `npx firebase-tools deploy --only hosting` to host at `https://cityassist-7bad3.web.app/privacy.html`.
  * **Option C (Google Sites):** Copy the text from `privacy_policy.html` and paste it into a free Google Site.

---

## 🛡️ 4. Data Safety Questionnaire Answers (Play Console)

When Google Play asks the Data Safety questions, select these exact answers:

1. **Does your app collect or share any user data?**  
   👉 **Yes**
2. **Is all user data collected encrypted in transit?**  
   👉 **Yes** (All requests use HTTPS / TLS 1.3 to Firebase).
3. **Do you provide a way for users to request that their data be deleted?**  
   👉 **Yes** (Via email `siddhantramteke06@gmail.com` or in-app delete profile).

### Specific Data Types:
* **Location:**
  * **Collected?** Yes (Approximate location & Precise location).
  * **Is it ephemeral?** No (Saved with the grievance report).
  * **Is it required or optional?** Required to submit a location-based civic report.
  * **Purpose:** App functionality (Municipal grievance mapping).
* **Personal Info:**
  * **Name, Email Address, Phone Number**
  * **Purpose:** Account management, verification, status notifications.
* **Photos & Videos:**
  * **Collected?** Yes (Photos taken by user as proof of civic issue).
  * **Purpose:** App functionality.

---

## 🚀 5. Step-by-Step Play Console Submission Steps

1. Go to [Google Play Console](https://play.google.com/console/) and log in with your developer account.
2. Click **Create app**:
   * App name: `CityAssist: Civic Complaints`
   * Default language: `English (India)`
   * App or game: `App`
   * Free or paid: `Free`
3. In the left menu, complete the **Set up your app** tasks:
   * **Privacy Policy:** Paste your live privacy policy URL.
   * **App access:** Select *"All or some functionality is restricted"* and provide test login credentials:
     * *Phone:* `+91 84689 84689` with OTP `123456`
     * *Email:* `siddhantramteke06@gmail.com`
   * **Ads:** Select *"No, my app does not contain ads"*.
   * **Content Rating:** Complete the questionnaire (Ratings will come out as 3+ / Everyone).
   * **Target Audience:** Select `18 and over` (or `16-17`).
   * **Government Apps:** Select *"No, this app is not an official government agency app"* (or provide municipal authorization letter if acting on behalf of TDMC).
   * **Data Safety:** Fill using Section 4 above.
4. Go to **Production** (or **Closed testing**):
   * Click **Create new release**.
   * Drag and drop `cityassist-release.aab`.
   * Release name: `1.0.0 (Initial Release)`.
   * Release notes: `Initial release of CityAssist Civic Complaints & Municipal Redressal Platform.`
5. Click **Next** &rarr; **Save** &rarr; **Review release** &rarr; **Start rollout to Production**!
