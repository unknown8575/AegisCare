
import React from 'react';
import { Language } from '../types';

// --- BUTTONS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'sos';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, className, ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-aegis-teal text-white hover:bg-teal-700 shadow-md shadow-teal-900/10",
    secondary: "bg-aegis-navy text-white hover:bg-slate-800 border border-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20",
    sos: "bg-red-600 text-white rounded-full w-full h-full animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.5)] border-4 border-red-500 font-bold text-2xl tracking-widest",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className || ''}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
      {children}
    </button>
  );
};

// --- LOADING STATES ---
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg', className?: string }> = ({ size = 'md', className }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-4',
        lg: 'w-12 h-12 border-4'
    };
    return (
        <div className={`rounded-full animate-spin border-slate-700 border-t-aegis-teal ${sizeClasses[size]} ${className || ''}`}></div>
    );
}

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 animate-pulse ${className || ''}`}>
    <div className="flex gap-4 mb-4">
      <div className="w-14 h-14 bg-slate-700/50 rounded-xl"></div>
      <div className="flex-1 space-y-2">
         <div className="h-4 bg-slate-700/50 rounded w-1/3"></div>
         <div className="h-3 bg-slate-700/50 rounded w-1/4"></div>
      </div>
    </div>
    <div className="h-12 bg-slate-700/30 rounded w-full mb-4"></div>
    <div className="flex gap-2">
      <div className="h-6 w-20 bg-slate-700/50 rounded-full"></div>
      <div className="h-6 w-20 bg-slate-700/50 rounded-full"></div>
    </div>
  </div>
);

// --- PROGRESS ---
export const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <div key={idx} className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${idx < currentStep ? 'bg-aegis-teal w-full' : idx === currentStep ? 'bg-aegis-teal/50 w-1/2' : 'w-0'}`}
          />
        </div>
      ))}
    </div>
  );
};

// --- CARDS ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className || ''}`}>
    {children}
  </div>
);

export const HospitalCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <div onClick={onClick} className={`bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700 shadow-xl p-6 ${className || ''}`}>
    {children}
  </div>
);

// --- INPUTS (DARK LUXURY) ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: 'light' | 'dark';
}

export const Input: React.FC<InputProps> = ({ label, variant = 'light', className, ...props }) => {
  const baseClasses = "w-full px-3 py-3 rounded-lg focus:ring-2 focus:ring-aegis-teal focus:border-transparent outline-none transition-all";
  const lightClasses = "border border-slate-300 bg-white text-slate-900 placeholder-slate-400";
  const darkClasses = "border border-slate-600 bg-slate-900 text-white placeholder-slate-500 shadow-inner";
  const labelColor = variant === 'dark' ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className="mb-4">
      {label && <label className={`block text-sm font-medium mb-1 ${labelColor}`}>{label}</label>}
      <input 
        className={`${baseClasses} ${variant === 'dark' ? darkClasses : lightClasses} ${className || ''}`} 
        {...props} 
      />
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  variant?: 'light' | 'dark';
}

export const TextArea: React.FC<TextAreaProps> = ({ label, variant = 'light', className, ...props }) => {
  const baseClasses = "w-full px-3 py-3 rounded-lg focus:ring-2 focus:ring-aegis-teal focus:border-transparent outline-none transition-all";
  const lightClasses = "border border-slate-300 bg-white text-slate-900 placeholder-slate-400";
  const darkClasses = "border border-slate-600 bg-slate-900 text-white placeholder-slate-500 shadow-inner";
  const labelColor = variant === 'dark' ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className="mb-4">
      {label && <label className={`block text-sm font-medium mb-1 ${labelColor}`}>{label}</label>}
      <textarea 
        className={`${baseClasses} ${variant === 'dark' ? darkClasses : lightClasses} ${className || ''}`} 
        {...props} 
      />
    </div>
  );
};

export const FileUpload: React.FC<{ onUpload: (file: File) => void }> = ({ onUpload }) => {
  const [dragActive, setDragActive] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
       setFileName(e.target.files[0].name);
       onUpload(e.target.files[0]);
     }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-aegis-teal bg-aegis-teal/10' : 'border-slate-600 bg-slate-800/50'}`}
      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
    >
      <input type="file" className="hidden" id="file-upload" onChange={handleChange} accept=".pdf,.png,.jpg,.jpeg" />
      <label htmlFor="file-upload" className="cursor-pointer block">
        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>
        {fileName ? (
           <p className="text-aegis-teal font-medium">{fileName}</p>
        ) : (
           <>
              <p className="text-slate-300 font-medium mb-1">Click to upload Health Report</p>
              <p className="text-xs text-slate-500">PDF, JPG, PNG (Max 10MB)</p>
           </>
        )}
      </label>
    </div>
  );
};

export const ChatBubble: React.FC<{ sender: 'AI' | 'USER'; text: string }> = ({ sender, text }) => (
  <div className={`flex ${sender === 'USER' ? 'justify-end' : 'justify-start'} mb-4`}>
     <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${sender === 'USER' ? 'bg-aegis-teal text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
        {text}
     </div>
  </div>
);


// --- BADGES ---
export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-slate-100 text-slate-800' }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
    {children}
  </span>
);

export const TrishulBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 shadow-sm cursor-help group relative">
    <div className="w-2 h-2 rounded-full bg-aegis-gold animate-pulse"></div>
    <span className="text-xs font-bold text-slate-300 tracking-wider">TRISHUL SECURITY</span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-slate-700">
      <p className="font-bold text-aegis-gold mb-1">Active Layers:</p>
      <ul className="list-disc pl-4 space-y-1">
        <li>Layer 1: Input Shield (Guardrails)</li>
        <li>Layer 2: PII Vault (Anonymization)</li>
        <li>Layer 3: Audit Logging</li>
      </ul>
    </div>
  </div>
);

export const LanguageToggle: React.FC<{ lang: Language, onChange: (l: Language) => void }> = ({ lang, onChange }) => (
  <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600">
    <button 
      onClick={() => onChange('en')}
      className={`px-3 py-1 text-xs font-bold rounded ${lang === 'en' ? 'bg-aegis-teal text-white' : 'text-slate-400 hover:text-white'}`}
    >
      EN
    </button>
    <button 
      onClick={() => onChange('hi')}
      className={`px-3 py-1 text-xs font-bold rounded ${lang === 'hi' ? 'bg-aegis-teal text-white' : 'text-slate-400 hover:text-white'}`}
    >
      HI
    </button>
  </div>
);

// --- CONSENT MODAL ---
export const ConsentModal: React.FC<{ onAllow: () => void, onDeny: () => void }> = ({ onAllow, onDeny }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl p-6 relative overflow-hidden">
        {/* Trishul Header */}
         <div className="flex items-center gap-2 mb-4 text-aegis-gold">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="font-bold tracking-wider uppercase text-sm">Trishul Data Privacy</span>
         </div>
         
         <h2 className="text-lg font-bold text-white mb-2 leading-tight">Do you allow AegisCare to share your latest health report and recent improvement summary with the hospital to support your care during this visit?</h2>
         <p className="text-slate-400 text-sm mb-6">
           Sharing your latest report and improvement summary helps the hospital prepare before you arrive.
         </p>

         <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-900/10 border border-green-800/50 rounded-lg p-3">
               <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  What is Sent
               </div>
               <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                  <li>Latest Report Summary</li>
                  <li>Key Health Risks</li>
                  <li>Fitness Trend (Better/Worse)</li>
               </ul>
            </div>
            
             <div className="bg-red-900/10 border border-red-800/50 rounded-lg p-3">
               <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  NOT Sent
               </div>
               <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                  <li>Raw Fitness Q&A</li>
                  <li>Detailed Mental Health Notes</li>
                  <li>Old/Irrelevant Reports</li>
               </ul>
            </div>
         </div>

         <div className="flex flex-col gap-3">
            <button onClick={onAllow} className="w-full py-3 bg-aegis-teal hover:bg-teal-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
               Allow for this visit only
            </button>
            <button onClick={onDeny} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-medium transition-colors">
               No, don't share context
            </button>
         </div>
      </div>
    </div>
  );
}
