<p align="center">
  <img src="AegisCare.png" alt="AegisCare – Patient Health & Triage and Hospital Command & Response" width="100%" hight = "1%" />
</p>

<h1 align="center">AegisCare – AI‑Augmented Emergency Response</h1>
<h3 align="center">Patient Digital Twin &amp; Hospital Command Center, powered by Google Gemini</h3>

<p>
  <strong>AegisCare</strong> is an end‑to‑end emergency triage and health management platform that connects a
  <em>patient-facing Digital Health Twin app</em> with a <em>hospital triage command center</em>. The goal is simple:
  reduce friction and information gaps in the <strong>Golden Hour</strong> – the first critical 60 minutes of a
  medical emergency – while staying privacy‑first.
</p>

<h2>✨ Core Idea</h2>
<ul>
  <li><strong>Patients</strong> use AegisCare to build a Digital Health Twin, run AI triage, manage diet and medicine, and book appointments.</li>
  <li><strong>Hospitals</strong> receive structured, AI‑generated SBAR summaries, Emergency Severity Index (ESI) levels, and synced patient context before the patient arrives.</li>
  <li>The platform is wrapped in the <strong>Trishul Security Framework</strong>, which enforces intent guardrails, PII redaction, and consent‑based data sharing.</li>
</ul>

<h2>🩺 Patient App – Health &amp; Triage</h2>
<ul>
  <li><strong>Digital Health Twin</strong> via 5‑phase questionnaire + Gemini deep‑dive interview.</li>
  <li>Upload lab reports (PDF/image) and extract vitals, lipids, glucose, and key biomarkers into a clean summary.</li>
  <li><strong>Visual report</strong> with organ‑level highlights, wellness score, simulated labs, and an AI doctor’s note.</li>
  <li><strong>Emergency Response Hub</strong>:
    <ul>
      <li>AI triage with ESI 1–5 classification and SBAR output.</li>
      <li>Hospital selection with direct routing of a minimal, consented context packet.</li>
      <li>Encrypted ER chat + first‑aid guidance while help is on the way.</li>
    </ul>
  </li>
  <li><strong>Weekly diet planner</strong> that converts report flags into a 7‑day plan with multiple options per meal and on‑demand Gemini recipes.</li>
  <li><strong>Fitness tracker</strong> with bi‑weekly check‑ins and soft alerts that can escalate to triage.</li>
  <li><strong>Appointment booking</strong> with consent‑based health‑context sync to the selected hospital.</li>
</ul>

<h2>🏥 Hospital Dashboard – Command &amp; Response</h2>
<ul>
  <li><strong>Real‑time triage board</strong> listing incoming emergencies and booked appointments, prioritized by ESI level.</li>
  <li><strong>Patient context selector</strong> that instantly updates:
    <ul>
      <li>AI‑generated SBAR and reasoning,</li>
      <li>Historical triage visits and trends,</li>
      <li>Current diet and medicine routines.</li>
    </ul>
  </li>
  <li><strong>Clinical consultation mode</strong> with a guided questionnaire and AI‑supported “Admit vs Discharge” recommendations.</li>
  <li><strong>Operational tools</strong> for doctor profile, duty timing, and OT / procedure scheduling.</li>
  <li><strong>Manual admission</strong> path to create digital cases for walk‑in patients who are not yet using the app.</li>
</ul>

<h2>🛡️ Trishul Security Framework</h2>
<ul>
  <li><strong>Input Shield</strong> – intent and keyword guardrails that block non‑medical or unsafe prompts.</li>
  <li><strong>PII Vault</strong> – live redaction of names, phone numbers, and locations before calling Gemini.</li>
  <li><strong>Consent‑Based Sync</strong> – explicit modals that list exactly what will be shared with hospitals (and what will not).</li>
</ul>

<h2>🧠 Tech Stack</h2>
<ul>
  <li><strong>Frontend</strong>: React + TypeScript, Tailwind CSS, custom SVG visualizations (Digital Twin body, ECG, dashboards).</li>
  <li><strong>AI</strong>: Google Gemini 3 Pro (clinical reasoning, SBAR, ESI), Gemini 2.5 Flash (recipes, first‑aid, fast chat).</li>
  <li><strong>Mock backend</strong>: LocalStorage “DB” with tables for users, hospitals, cases, health reports, appointments, and graph‑style routing edges.</li>
</ul>

<p>
  This repository contains the full demo implementation used for hackathons and AI showcases. It is an
  <strong>educational proof‑of‑concept</strong> and is not a certified medical device or a replacement for professional clinical judgment.
</p>



1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
