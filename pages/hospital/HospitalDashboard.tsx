import React, { useEffect, useState } from 'react';
import { User, TriageCase } from '../../types';
import { getCasesForHospital, admitPatient } from '../../services/mockBackend';
import { Button, TrishulBadge, SkeletonCard, Input, LoadingSpinner } from '../../components/UI';
import { SectionYourData, SectionPatientReport, SectionMedicine, SectionDiet, SectionAppointments, SectionPatientHistory } from './HospitalSections';

interface Props {
  user: User;
}

type Section = 'YOUR_DATA' | 'REPORT' | 'MEDICINE' | 'DIET' | 'APPOINTMENTS' | 'HISTORY';

export const HospitalDashboard: React.FC<Props> = ({ user }) => {
  const [activeSection, setActiveSection] = useState<Section>('YOUR_DATA');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCaseAlert, setNewCaseAlert] = useState<string | null>(null); // State for Toast

  // Admission State
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [isAdmitting, setIsAdmitting] = useState(false);
  const [admitData, setAdmitData] = useState({ name: '', age: '', gender: 'Male', phone: '', complaint: '' });

  const fetchCases = async () => {
        const data = await getCasesForHospital(user.id);
        setCases(prev => {
            // Check for new cases by comparing length or IDs
            if (prev.length > 0 && data.length > prev.length) {
                // Find the new case (simplistic approach: take the first one since API returns desc)
                const latest = data[0]; 
                setNewCaseAlert(latest.patientAlias);
                // Clear alert after 5 seconds
                setTimeout(() => setNewCaseAlert(null), 5000);
            }
            return data;
        });
        setLoading(false);
  };

  // Poll for patients for the "Selector"
  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 2000); // Reduced to 2s for better responsiveness
    return () => clearInterval(interval);
  }, [user.id]);

  const handleAdmit = async () => {
      if (!admitData.name || !admitData.complaint || !user.hospitalId) return;
      setIsAdmitting(true);
      await admitPatient(user.hospitalId, admitData);
      await fetchCases();
      setIsAdmitting(false);
      setShowAdmitModal(false);
      setAdmitData({ name: '', age: '', gender: 'Male', phone: '', complaint: '' });
  };

  // Helper for Sidebar Item
  const NavItem = ({ section, label, icon }: { section: Section, label: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => setActiveSection(section)}
        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 relative group
            ${activeSection === section ? 'bg-slate-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}
        `}
      >
          <div className={`transition-transform duration-300 ${activeSection === section ? 'scale-110 text-aegis-gold' : 'group-hover:scale-110'}`}>{icon}</div>
          <span className={`font-medium tracking-wide text-sm ${activeSection === section ? 'font-bold' : ''}`}>{label}</span>
          {activeSection === section && <div className="absolute right-4 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>}
      </button>
  );

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans relative">
      
      {/* NEW CASE ALERT TOAST */}
      {newCaseAlert && (
          <div className="absolute top-20 right-8 z-50 animate-slide-in-right">
              <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-2 border-red-400">
                  <div className="bg-white text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold animate-pulse">!</div>
                  <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider">New Emergency Alert</h4>
                      <p className="text-sm">Patient {newCaseAlert} just synced data.</p>
                  </div>
              </div>
          </div>
      )}

      {/* Admission Modal */}
      {showAdmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Manual Patient Admission</h3>
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <Input variant="dark" label="Patient Name" value={admitData.name} onChange={e => setAdmitData({...admitData, name: e.target.value})} />
                          <Input variant="dark" label="Age" type="number" value={admitData.age} onChange={e => setAdmitData({...admitData, age: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                           <div>
                                <label className="text-sm text-slate-400 block mb-1">Gender</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                                    value={admitData.gender}
                                    onChange={e => setAdmitData({...admitData, gender: e.target.value})}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                           </div>
                           <Input variant="dark" label="Phone" value={admitData.phone} onChange={e => setAdmitData({...admitData, phone: e.target.value})} />
                      </div>
                      <div className="mb-4">
                          <label className="text-sm text-slate-400 block mb-1">Chief Complaint</label>
                          <textarea 
                             className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                             rows={3}
                             value={admitData.complaint}
                             onChange={e => setAdmitData({...admitData, complaint: e.target.value})}
                          />
                      </div>
                      <div className="flex gap-3 justify-end">
                          <Button variant="ghost" onClick={() => setShowAdmitModal(false)}>Cancel</Button>
                          <Button onClick={handleAdmit} disabled={!admitData.name || !admitData.complaint} isLoading={isAdmitting}>Admit Patient</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-900 bg-slate-950 z-20 shrink-0">
         <h1 className="text-xl font-bold tracking-wide text-white" style={{fontFamily: '"JetBrains Mono", monospace'}}>Hospital Dashboard</h1>
         
         {/* Global Patient Selector */}
         <div className="flex items-center gap-4">
             <Button variant="secondary" onClick={() => setShowAdmitModal(true)} className="text-xs flex items-center gap-2 border-slate-700 bg-slate-900">
                 <span>+</span> Admit Patient
             </Button>

             <div className="relative">
                 <select 
                    className="appearance-none bg-slate-900 border border-slate-700 text-white pl-4 pr-10 py-2 rounded-lg text-sm focus:border-aegis-gold outline-none w-64 transition-all hover:bg-slate-800 cursor-pointer"
                    onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPatientId(pid === "" ? null : pid);
                        if (pid && activeSection === 'YOUR_DATA') setActiveSection('REPORT'); // Auto-switch context
                    }}
                    value={selectedPatientId || ""}
                 >
                     <option value="">Select Patient Context...</option>
                     {cases.map(c => (
                         <option key={c.id} value={c.id}>
                             {c.patientAlias} (ESI {c.esiSuggestion})
                         </option>
                     ))}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
             </div>
             
             <div className="h-8 w-[1px] bg-slate-800"></div>
             
             <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                    <div className="text-sm font-bold text-white">{user.name}</div>
                    <div className="text-[10px] text-slate-500">Staff ID: {user.id}</div>
                </div>
                <div className="w-8 h-8 bg-aegis-gold rounded-full flex items-center justify-center text-slate-900 font-bold uppercase">
                    {user.name.slice(0, 2)}
                </div>
             </div>
         </div>
      </header>

      <div className="flex-grow flex relative overflow-hidden">
         
         {/* Curved Sidebar */}
         <div className="w-64 flex-none bg-slate-950 relative z-10 flex flex-col pt-6">
            <div className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none translate-x-full overflow-hidden">
               <svg height="100%" width="40" preserveAspectRatio="none" viewBox="0 0 40 100">
                  <path d="M0,0 Q40,50 0,100 Z" fill="#020617" />
               </svg>
            </div>
            <nav className="space-y-4 px-4 overflow-y-auto custom-scrollbar pb-10">
               <NavItem 
                   section="YOUR_DATA" 
                   label="Your Data" 
                   icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>} 
               />
               <NavItem 
                   section="REPORT" 
                   label="Patient Report" 
                   icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} 
               />
               <NavItem 
                   section="HISTORY" 
                   label="Patient History" 
                   icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>} 
               />
               <NavItem 
                   section="MEDICINE" 
                   label="Patient Medicine" 
                   icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>} 
               />
               <NavItem 
                   section="DIET" 
                   label="Patient Diet" 
                   icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>} 
               />
               <div className="border-t border-slate-800 pt-4 mt-2">
                 <NavItem 
                     section="APPOINTMENTS" 
                     label="Appointments" 
                     icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>} 
                 />
               </div>
            </nav>

            <div className="mt-auto mb-8 px-6">
                <TrishulBadge />
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-grow bg-slate-900 rounded-tl-[2.5rem] p-8 overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
             {loading ? (
                 <div className="space-y-4 pt-10">
                     <SkeletonCard />
                     <SkeletonCard />
                 </div>
             ) : (
                 <div className="h-full">
                     {activeSection === 'YOUR_DATA' && <SectionYourData user={user} />}
                     {activeSection === 'REPORT' && <SectionPatientReport patientId={selectedPatientId || ''} />}
                     {activeSection === 'HISTORY' && <SectionPatientHistory patientId={selectedPatientId || ''} />}
                     {activeSection === 'MEDICINE' && <SectionMedicine patientId={selectedPatientId || ''} />}
                     {activeSection === 'DIET' && <SectionDiet patientId={selectedPatientId || ''} />}
                     {activeSection === 'APPOINTMENTS' && <SectionAppointments user={user} />}
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};
