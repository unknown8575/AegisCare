
import React from 'react';

export type LegalPage = 'ABOUT' | 'TERMS' | 'PRIVACY';

interface FooterProps {
  onOpenLegal: (page: LegalPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800 pt-12 pb-6 text-slate-400 text-sm mt-auto z-10 relative">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 mb-8">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white">
             <div className="w-6 h-6 bg-aegis-teal rounded flex items-center justify-center font-bold text-xs text-white">A</div>
             <span className="font-bold text-lg tracking-tight">AegisCare</span>
          </div>
          <p className="leading-relaxed text-xs max-w-xs text-slate-500">
            AI‑assisted, privacy‑first health companion for patients and hospitals.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider">Company</h4>
          <button onClick={() => onOpenLegal('ABOUT')} className="text-left text-slate-400 hover:text-aegis-teal transition-colors text-sm">About Us</button>
          <button onClick={() => onOpenLegal('TERMS')} className="text-left text-slate-400 hover:text-aegis-teal transition-colors text-sm">Terms & Conditions</button>
          <button onClick={() => onOpenLegal('PRIVACY')} className="text-left text-slate-400 hover:text-aegis-teal transition-colors text-sm">Privacy Policy</button>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider">Contact</h4>
          <div>
            <a href="mailto:aegiscare@gmail.com" className="block text-aegis-gold hover:underline mb-1 font-medium">aegiscare@gmail.com</a>
            <span className="text-[10px] text-slate-600 block">Response within 2–3 business days.</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-slate-600">
        <span>&copy; AegisCare {new Date().getFullYear()}. All rights reserved.</span>
        <span>Not a substitute for professional medical advice.</span>
      </div>
    </footer>
  );
};
