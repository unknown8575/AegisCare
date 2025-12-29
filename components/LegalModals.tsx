
import React from 'react';
import { LegalPage } from './Footer';

interface Props {
  page: LegalPage | null;
  onClose: () => void;
}

export const LegalModal: React.FC<Props> = ({ page, onClose }) => {
  if (!page) return null;

  const Content = () => {
    switch (page) {
      case 'ABOUT':
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-bold text-white mb-2">Who We Are</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                AegisCare is a student‑built healthcare platform designed to bridge the gap between personal health monitoring and professional emergency care. We combine a Patient App for Digital Twin tracking with a Hospital Dashboard for streamlined triage.
              </p>
            </section>
            <section>
              <h3 className="text-lg font-bold text-white mb-2">Mission & Vision</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-2">
                <strong className="text-aegis-teal">Mission:</strong> Help people understand their health early, act before emergencies, and share only the data they choose with hospitals.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                <strong className="text-aegis-gold">Vision:</strong> To become a trusted assistant that turns scattered health data into simple, daily decisions—without compromising privacy.
              </p>
            </section>
            <section>
              <h3 className="text-lg font-bold text-white mb-2">What We Do</h3>
              <ul className="list-disc pl-5 text-slate-300 text-sm space-y-2">
                <li>Generate AI‑assisted health summaries from uploaded reports or questionnaires.</li>
                <li>Provide condition‑aware diet and medicine views for both patients and doctors.</li>
                <li>Offer emergency routing: with consent, share key data with hospitals to speed up care.</li>
                <li>Focus on data minimization: users decide when and where their information is shared.</li>
              </ul>
            </section>
            <p className="text-xs text-slate-500 italic mt-4 border-t border-slate-700 pt-2">
              Note: This is an educational pilot project and not certified medical software.
            </p>
          </div>
        );
      case 'TERMS':
        return (
          <div className="space-y-6">
            <section>
              <h3 className="font-bold text-white mb-1">Introduction</h3>
              <p className="text-slate-300 text-sm">AegisCare provides health information tools, not medical diagnosis. By using this app, you agree to these terms.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Health Information Disclaimer</h3>
              <p className="text-slate-300 text-sm">Information is for education and decision support only. Always consult a qualified clinician before changing medication or treatment.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Data Sharing</h3>
              <p className="text-slate-300 text-sm">We only share data with hospitals when you explicitly select a facility and tap "Allow" in the consent popup. Shared data is limited to vital triage information.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">User Responsibility</h3>
              <p className="text-slate-300 text-sm">You are responsible for the accuracy of the symptoms and health details you enter. Misuse or malicious input may result in account suspension.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Limitation of Liability</h3>
              <p className="text-slate-300 text-sm">The app is provided "as is" without warranties. AegisCare is not liable for errors in operation or AI-generated suggestions.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Governing Law</h3>
              <p className="text-slate-300 text-sm">These terms are governed by the laws of India. Questions? Contact <a href="mailto:aegiscare@gmail.com" className="text-aegis-teal">aegiscare@gmail.com</a>.</p>
            </section>
          </div>
        );
      case 'PRIVACY':
        return (
          <div className="space-y-6">
            <section>
              <h3 className="font-bold text-white mb-1">Overview</h3>
              <p className="text-slate-300 text-sm">We handle sensitive health data with priority. This policy outlines what we collect and how you control it.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Data We Collect</h3>
              <ul className="list-disc pl-5 text-slate-300 text-sm space-y-1">
                <li><strong>Account:</strong> Name, email, age, gender.</li>
                <li><strong>Health:</strong> Vitals, reports, questionnaire answers, diet plans.</li>
                <li><strong>Usage:</strong> App sections visited, approximate location (for hospital finder).</li>
              </ul>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">How We Use Data</h3>
              <p className="text-slate-300 text-sm">To generate health reports, alerts, and emergency routing. We never sell data to advertisers.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Data Sharing & Consent</h3>
              <p className="text-slate-300 text-sm">
                <strong>Hospitals:</strong> Only shared when you explicitly consent during an emergency or appointment booking.<br/>
                <strong>Service Providers:</strong> Trusted cloud and AI partners bound by confidentiality.
              </p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Security</h3>
              <p className="text-slate-300 text-sm">Data is encrypted in storage and transit. Access is role-based and logged.</p>
            </section>
            <section>
              <h3 className="font-bold text-white mb-1">Your Rights</h3>
              <p className="text-slate-300 text-sm">You can view your data, update your profile, or request account deletion by emailing us at <a href="mailto:aegiscare@gmail.com" className="text-aegis-teal">aegiscare@gmail.com</a>.</p>
            </section>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">
            {page === 'ABOUT' && 'About AegisCare'}
            {page === 'TERMS' && 'Terms & Conditions'}
            {page === 'PRIVACY' && 'Privacy Policy'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2">✕</button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <Content />
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-950 rounded-b-2xl text-right">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};
