import React, { useState, useEffect, useRef } from 'react';
import { User, HealthReport, DietPlan, FitnessMessage, SharedContext, AssumptionInput, WeeklyPlan, DietPreferences, DishOption, SessionState, NotificationPreferences, HospitalSchema, VisitType } from '../../types';
import { generateHealthReport, generateDeepDiveQuestion, generateWeeklyDietPlan, generateDetailedRecipe, runFitnessCheckup } from '../../services/geminiService';
import { saveHealthReport, getHealthReport, saveDietPlan, getDietPlan, saveSession, restoreSession, updateUser, getHospitals, bookAppointment } from '../../services/mockBackend';
import { Button, Input, FileUpload, LoadingSpinner, ChatBubble, ConsentModal, TrishulBadge, Card, ProgressBar, Badge } from '../../components/UI';
import { HumanBodyVisualizer as Body } from '../../components/HumanBody';
import { LegalPage } from '../../components/Footer';
import { Triage } from './Triage';

// --- COMPONENT: WELLNESS WHEEL ---
const WellnessWheel = ({ score }: { score: number }) => {
  const radius = 70; 
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
      if (s >= 80) return '#10b981'; // Emerald
      if (s >= 60) return '#f59e0b'; // Amber
      return '#ef4444'; // Red
  };
  const color = getColor(score);

  return (
    <div className="relative flex items-center justify-center w-48 h-48 group">
       <div className="absolute inset-0 rounded-full border border-slate-800 scale-110 opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
       <div className={`absolute inset-0 rounded-full blur-3xl opacity-10 transition-colors duration-1000`} style={{backgroundColor: color}}></div>
       
       <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg] relative z-10 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
         <circle stroke="#0f172a" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
         <circle 
            stroke={color} 
            strokeWidth={stroke} 
            strokeDasharray={circumference + ' ' + circumference} 
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} 
            strokeLinecap="round" 
            fill="transparent" 
            r={normalizedRadius} 
            cx={radius} 
            cy={radius} 
         />
         <circle stroke={color} strokeWidth="1" opacity="0.2" fill="transparent" r={normalizedRadius - 8} cx={radius} cy={radius} />
       </svg>

       <div className="absolute flex flex-col items-center z-20">
         <div className="flex items-baseline gap-0.5">
            <span className="text-6xl font-bold text-white font-mono tracking-tighter animate-fade-in">{score}</span>
            <span className="text-xs text-slate-500 font-mono">%</span>
         </div>
         <span className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">Health Index</span>
       </div>

       {[0, 90, 180, 270].map(deg => (
           <div key={deg} className="absolute w-0.5 h-2 bg-slate-700" style={{ transform: `rotate(${deg}deg) translateY(-85px)` }}></div>
       ))}
    </div>
  );
};

const TimelineDial = ({ reports, selectedIndex, onSelect }: { reports: HealthReport[], selectedIndex: number, onSelect: (idx: number) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative w-full h-24 mt-4 border-t border-slate-800/50 pt-4 flex flex-col items-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 font-bold">Historical Snapshots</div>
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-aegis-teal z-20 shadow-[0_0_10px_#0d9488]"></div>
            <div 
                ref={scrollRef}
                className="w-full overflow-x-auto no-scrollbar flex items-center gap-12 px-[50%] pb-4 scroll-smooth"
            >
                {reports.map((r, i) => {
                    const isSelected = i === selectedIndex;
                    return (
                        <button
                            key={i}
                            onClick={() => onSelect(i)}
                            className={`flex-none flex flex-col items-center transition-all duration-500 ${isSelected ? 'scale-110' : 'scale-90 opacity-40 grayscale'}`}
                        >
                            <span className={`text-xs font-mono font-bold ${isSelected ? 'text-aegis-teal' : 'text-slate-400'}`}>
                                {r.date}
                            </span>
                            <div className={`w-2 h-2 rounded-full mt-2 border-2 ${isSelected ? 'bg-aegis-teal border-white shadow-[0_0_10px_#0d9488]' : 'bg-slate-700 border-transparent'}`}></div>
                        </button>
                    );
                })}
                <div className="flex-none w-20"></div>
            </div>
        </div>
    );
};

interface Props {
  user: User;
  onLogout: () => void;
  onOpenLegal: (page: LegalPage) => void;
  onUpdateUser: (u: User) => void;
}

type Section = 'REPORT' | 'EMERGENCY' | 'DIET' | 'FITNESS' | 'SETTINGS' | 'APPOINTMENTS' | 'PROFILE';

export const PatientDashboard: React.FC<Props> = ({ user, onLogout, onOpenLegal, onUpdateUser }) => {
  const [activeSection, setActiveSection] = useState<Section>('REPORT');
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // STATE: Report History
  const [reportHistory, setReportHistory] = useState<HealthReport[]>([]);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const activeReport = reportHistory[currentReportIndex] || null;

  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [reportMode, setReportMode] = useState<'UPLOAD' | 'ASSUMPTION' | null>(null);
  
  // STATE: Assumption Form & Deep Dive
  const [assumptionStep, setAssumptionStep] = useState(1);
  const [assumptionData, setAssumptionData] = useState<AssumptionInput>({ primaryComplaints: [] });
  const [deepDiveMessages, setDeepDiveMessages] = useState<FitnessMessage[]>([]);
  const [deepDiveInput, setDeepDiveInput] = useState('');
  const [isDeepDiveThinking, setIsDeepDiveThinking] = useState(false);
  const deepDiveScrollRef = useRef<HTMLDivElement>(null);

  // STATE: Diet Plan
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [dietDayIndex, setDietDayIndex] = useState(0); 
  const [dietPrefs, setDietPrefs] = useState<DietPreferences>({
      mealsPerDay: 3,
      cuisine: 'North Indian',
      type: 'Veg',
      allergies: []
  });
  const [selectedRecipe, setSelectedRecipe] = useState<DishOption | null>(null);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // STATE: Fitness
  const [fitnessMessages, setFitnessMessages] = useState<FitnessMessage[]>([
      { sender: 'AI', text: "Hello! I'm your AI Doctor for this bi-weekly checkup. How are you feeling today?" }
  ]);
  const [fitnessInput, setFitnessInput] = useState('');
  const [isFitnessThinking, setIsFitnessThinking] = useState(false);

  // STATE: Consent
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentedContext, setConsentedContext] = useState<SharedContext | undefined>(undefined);

  // STATE: Settings & Profile
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
     emailAlerts: true,
     smsAlerts: true,
     dietReminders: true,
     emergencyUpdates: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
      name: user.name,
      age: user.age,
      gender: user.gender,
      address: user.address,
      phone: user.phone
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // STATE: Appointments
  const [bookingStep, setBookingStep] = useState<'SELECT' | 'CONSENT' | 'FORM' | 'SUCCESS'>('SELECT');
  const [availableHospitals, setAvailableHospitals] = useState<HospitalSchema[]>([]);
  const [selectedHospitalForBooking, setSelectedHospitalForBooking] = useState<HospitalSchema | null>(null);
  const [bookingDetails, setBookingDetails] = useState({
      date: '',
      time: '',
      visitType: 'General Checkup' as VisitType,
      reason: ''
  });
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  // --- PERSISTENCE: LOAD STATE ON MOUNT ---
  useEffect(() => {
      const loadUserData = async () => {
          setIsLoadingData(true);
          const session = restoreSession(user.id);
          if (session) {
              setActiveSection(session.activeSection as Section);
              setDietDayIndex(session.dietDayIndex || 0);
              setAssumptionStep(session.assumptionStep || 1);
          }
          const savedReport = await getHealthReport(user.id);
          if (savedReport) {
              const history = [
                  { ...savedReport, date: '12 OCT', wellnessScore: 68 },
                  { ...savedReport, date: '28 OCT', wellnessScore: 72 },
                  { ...savedReport, date: '15 NOV', wellnessScore: savedReport.wellnessScore },
              ];
              setReportHistory(history);
              setCurrentReportIndex(history.length - 1);
          }
          const savedDiet = await getDietPlan(user.id);
          if (savedDiet) {
              setWeeklyPlan(savedDiet);
              setDietPrefs(savedDiet.preferences);
          }
          if (user.preferences) {
              setNotifPrefs(user.preferences);
          }
          const allHospitals = getHospitals();
          const govt = allHospitals.filter(h => h.type === 'GOVT').slice(0, 1);
          const pvt = allHospitals.filter(h => h.type === 'PRIVATE').slice(0, 3);
          setAvailableHospitals([...govt, ...pvt]);
          setIsLoadingData(false);
      };
      loadUserData();
  }, [user.id]);

  // --- PERSISTENCE: SAVE STATE ON CHANGE ---
  useEffect(() => {
      const state: SessionState = {
          activeSection,
          dietDayIndex,
          assumptionStep,
          lastViewedReportId: activeReport ? 'current' : undefined
      };
      saveSession(user.id, state);
  }, [activeSection, dietDayIndex, assumptionStep, activeReport, user.id]);

  // --- EFFECT: SCROLL CHAT ---
  useEffect(() => {
     if (deepDiveScrollRef.current) {
        deepDiveScrollRef.current.scrollTop = deepDiveScrollRef.current.scrollHeight;
     }
  }, [deepDiveMessages]);


  // --- LOGIC: CONTEXT SHARING ---
  const calculateContext = (): SharedContext => {
     const summary = activeReport?.summary || 'No recent detailed health report generated.';
     const vitalsStr = activeReport ? ` Vitals: ${activeReport.vitals.bp}, HR: ${activeReport.vitals.heartRate}, BMI: ${activeReport.vitals.bmi}` : '';
     
     return {
        reportSummary: summary + vitalsStr,
        risks: activeReport?.flags || [],
        fitnessTrend: fitnessMessages.some(m => m.sender === 'AI' && m.text.toLowerCase().includes('good')) ? 'improving' : 'stable',
        lastCheckin: new Date().toLocaleDateString()
     };
  };

  const handleSidebarClick = (section: Section) => {
      if (section === 'EMERGENCY') {
          const context = calculateContext();
          setConsentedContext(context);
          setShowConsentModal(true);
      } else {
          setActiveSection(section);
      }
  };

  const onConsentAllow = () => {
     setShowConsentModal(false);
     setActiveSection('EMERGENCY');
  };

  const onConsentDeny = () => {
     setConsentedContext(undefined);
     setShowConsentModal(false);
     setActiveSection('EMERGENCY');
  };

  // --- APPOINTMENT HANDLERS ---
  const handleBookClick = (hospital: HospitalSchema) => {
      setSelectedHospitalForBooking(hospital);
      setBookingStep('CONSENT');
  };

  const handleBookingConsent = (allowed: boolean) => {
      if (allowed) {
          setBookingStep('FORM');
      } else {
          setSelectedHospitalForBooking(null);
          setBookingStep('SELECT');
      }
  };

  const submitBooking = async () => {
      if (!selectedHospitalForBooking) return;
      setIsBookingLoading(true);
      await bookAppointment(user.id, selectedHospitalForBooking.id, bookingDetails);
      setIsBookingLoading(false);
      setBookingStep('SUCCESS');
  };


  // --- HANDLERS ---
  const handleFileUpload = async (file: File) => {
    setIsAnalyzingReport(true);
    const result = await generateHealthReport({ file }, 'UPLOAD');
    setReportHistory(prev => [...prev, result]);
    setCurrentReportIndex(reportHistory.length);
    await saveHealthReport(user.id, result);
    setIsAnalyzingReport(false);
    setReportMode(null);
  };

  const checkVitalsAndProceed = () => {
      setAssumptionStep(6);
      startDeepDive();
  };
  
  const startDeepDive = async () => {
     setIsDeepDiveThinking(true);
     const initialQuestion = await generateDeepDiveQuestion(assumptionData, []);
     setDeepDiveMessages([{ sender: 'AI', text: initialQuestion }]);
     setIsDeepDiveThinking(false);
  }

  const handleDeepDiveSend = async () => {
     if (!deepDiveInput.trim()) return;
     const userMsg: FitnessMessage = { sender: 'USER', text: deepDiveInput };
     setDeepDiveMessages(prev => [...prev, userMsg]);
     setDeepDiveInput('');
     setIsDeepDiveThinking(true);
     if (deepDiveMessages.length >= 7) { 
         await new Promise(r => setTimeout(r, 800));
         setDeepDiveMessages(prev => [...prev, { sender: 'AI', text: "Thank you. I have enough context now. Generating your Digital Twin Report..." }]);
         setIsDeepDiveThinking(false);
         setTimeout(handleAssumptionSubmit, 1500);
     } else {
         const nextQ = await generateDeepDiveQuestion(assumptionData, [...deepDiveMessages, userMsg]);
         setDeepDiveMessages(prev => [...prev, { sender: 'AI', text: nextQ }]);
         setIsDeepDiveThinking(false);
     }
  };

  const handleAssumptionSubmit = async () => {
    setIsAnalyzingReport(true);
    const result = await generateHealthReport(assumptionData, 'ASSUMPTION');
    setReportHistory(prev => [...prev, result]);
    setCurrentReportIndex(reportHistory.length);
    await saveHealthReport(user.id, result);
    setIsAnalyzingReport(false);
    setReportMode(null);
    setAssumptionStep(1); 
    setDeepDiveMessages([]);
  };

  const handleGenerateWeeklyDiet = async () => {
      setIsGeneratingWeekly(true);
      const plan = await generateWeeklyDietPlan(dietPrefs, activeReport || undefined);
      setWeeklyPlan(plan);
      await saveDietPlan(user.id, plan);
      setDietDayIndex(0);
      setIsGeneratingWeekly(false);
  };

  const handleNextDay = () => setDietDayIndex(prev => (prev + 1) % 7);
  const handlePrevDay = () => setDietDayIndex(prev => Math.max(0, prev - 1));

  const handleTimeChange = (dayIndex: number, mealIndex: number, newTime: string) => {
      if (!weeklyPlan) return;
      const updatedPlan: WeeklyPlan = {
          ...weeklyPlan,
          days: weeklyPlan.days.map((day, dIdx) => {
              if (dIdx !== dayIndex) return day;
              return {
                  ...day,
                  meals: day.meals.map((meal, mIdx) => {
                      if (mIdx !== mealIndex) return meal;
                      return { ...meal, timeSuggestion: newTime };
                  })
              };
          })
      };
      setWeeklyPlan(updatedPlan);
      saveDietPlan(user.id, updatedPlan);
  };

  const handleViewRecipe = async (option: DishOption) => {
      setShowRecipeModal(true);
      setIsRecipeLoading(true);
      setSelectedRecipe(null);
      const detailed = await generateDetailedRecipe(option.name, activeReport?.flags || []);
      setSelectedRecipe(detailed);
      setIsRecipeLoading(false);
  };

  const closeRecipeModal = () => {
      setShowRecipeModal(false);
      setSelectedRecipe(null);
  };

  const handleFitnessSend = async () => {
    if(!fitnessInput.trim()) return;
    const userMsg: FitnessMessage = { sender: 'USER', text: fitnessInput };
    setFitnessMessages(prev => [...prev, userMsg]);
    setFitnessInput('');
    setIsFitnessThinking(true);
    const aiResponseText = await runFitnessCheckup([...fitnessMessages, userMsg], userMsg.text);
    setIsFitnessThinking(false);
    setFitnessMessages(prev => [...prev, { sender: 'AI', text: aiResponseText }]);
    if (aiResponseText.includes("ALERT")) {
        setTimeout(() => {
           const context = calculateContext();
           setConsentedContext(context);
           setShowConsentModal(true);
        }, 2000);
    }
  };

  const updateAssumption = (key: keyof AssumptionInput, value: any) => {
     setAssumptionData(prev => ({ ...prev, [key]: value }));
  };

  const toggleSymptom = (symptom: string) => {
      const current = assumptionData.primaryComplaints || [];
      if (current.includes(symptom)) {
          updateAssumption('primaryComplaints', current.filter(s => s !== symptom));
      } else {
          updateAssumption('primaryComplaints', [...current, symptom]);
      }
  };

  const getPainSeverityLabel = (val?: number) => {
      if (!val) return 'None';
      if (val <= 3) return `${val}/10 (Mild)`;
      if (val <= 6) return `${val}/10 (Moderate)`;
      if (val <= 8) return `${val}/10 (Severe)`;
      return `${val}/10 (Worst Possible)`;
  };

  const handleSaveSettings = async () => {
      setIsSavingSettings(true);
      try {
          const updated = await updateUser({ ...user, preferences: notifPrefs });
          onUpdateUser(updated);
          setSettingsSaved(true);
          setTimeout(() => setSettingsSaved(false), 3000);
      } catch (e) {
          alert('Failed to save settings');
      }
      setIsSavingSettings(false);
  };

  const handleSaveProfile = async () => {
      setIsSavingProfile(true);
      try {
          const updated = await updateUser({ ...user, ...profileForm });
          onUpdateUser(updated);
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 3000);
      } catch (e) {
          alert('Failed to update profile');
      }
      setIsSavingProfile(false);
  };

  const Toggle = ({ label, checked, onChange, description }: any) => (
    <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
      <div>
          <div className="text-white font-bold text-sm mb-1">{label}</div>
          <div className="text-slate-400 text-xs leading-relaxed max-w-[80%]">{description}</div>
      </div>
      <button 
          onClick={() => onChange(!checked)}
          className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 flex-shrink-0 relative ${checked ? 'bg-aegis-teal' : 'bg-slate-600'}`}
      >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      
      {showConsentModal && (
          <ConsentModal onAllow={onConsentAllow} onDeny={onConsentDeny} />
      )}

      {/* APPOINTMENT BOOKING CONSENT POPUP */}
      {bookingStep === 'CONSENT' && selectedHospitalForBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                   <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 bg-aegis-gold text-slate-900 rounded-lg flex items-center justify-center font-bold">!</div>
                             <span className="text-white font-bold tracking-widest uppercase text-xs">Clinical Sync Consent</span>
                        </div>
                        <TrishulBadge />
                   </div>
                   <div className="p-8">
                        <h2 className="text-xl font-bold text-white mb-4">Share clinical summary with {selectedHospitalForBooking.name}?</h2>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            To streamline your visit, AegisCare can securely transmit your latest <span className="text-aegis-teal font-bold underline underline-offset-4 decoration-aegis-teal/30">Health Summary and Vital Signs</span> to the ER staff. This reduces check-in time and ensures early clinical preparedness.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4">
                                <h4 className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Enabled Sync</h4>
                                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                                    <li>AI Report Summary</li>
                                    <li>Current BP & Pulse</li>
                                    <li>Active Health Risks</li>
                                </ul>
                            </div>
                            <div className="bg-red-950/10 border border-red-800/20 rounded-xl p-4 opacity-60">
                                <h4 className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2">Restricted</h4>
                                <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
                                    <li>Raw Chat History</li>
                                    <li>Daily Diet Logs</li>
                                    <li>Personal Media</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                             <Button onClick={() => handleBookingConsent(true)} className="w-full py-4 text-lg bg-aegis-teal shadow-lg shadow-teal-900/40">Authorize & Sync Data</Button>
                             <Button variant="ghost" onClick={() => handleBookingConsent(false)} className="w-full py-3 text-slate-500 hover:text-white">Proceed without Syncing</Button>
                        </div>
                   </div>
              </div>
          </div>
      )}

      {/* RECIPE MODAL */}
      {showRecipeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative">
                  {isRecipeLoading ? (
                      <div className="p-12 flex flex-col items-center justify-center text-center">
                          <LoadingSpinner size="lg" />
                          <p className="mt-4 text-aegis-teal font-mono animate-pulse">Consulting AI Chef...</p>
                      </div>
                  ) : selectedRecipe && (
                    <>
                      <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="text-xl font-bold text-white pr-4">{selectedRecipe.name}</h3>
                              <button onClick={closeRecipeModal} className="text-slate-400 hover:text-white text-xl">✕</button>
                          </div>
                          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                              <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50">
                                  <h4 className="text-slate-500 text-xs font-bold uppercase mb-1">Health Benefit</h4>
                                  <p className="text-slate-300 text-sm">{selectedRecipe.shortReason}</p>
                              </div>
                              <div>
                                  <h4 className="text-white text-sm font-bold uppercase mb-2">Ingredients</h4>
                                  <ul className="grid grid-cols-2 gap-2">
                                      {selectedRecipe.ingredients.map(ing => (
                                          <li key={ing} className="flex items-center gap-2 text-sm text-slate-400">
                                              <div className="w-1.5 h-1.5 bg-aegis-teal rounded-full flex-shrink-0"></div>
                                              {ing}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              <div>
                                  <h4 className="text-white text-sm font-bold uppercase mb-2">Method</h4>
                                  <ol className="space-y-3">
                                      {selectedRecipe.recipeSteps.map((step, i) => (
                                          <li key={i} className="flex gap-3 text-sm text-slate-300">
                                              <span className="font-mono text-slate-500 font-bold flex-shrink-0">{i+1}.</span>
                                              <span>{step}</span>
                                          </li>
                                      ))}
                                  </ol>
                              </div>
                          </div>
                      </div>
                      <div className="bg-slate-950 p-4 border-t border-slate-800 text-center">
                          <Button onClick={closeRecipeModal} className="w-full">Close Recipe</Button>
                      </div>
                    </>
                  )}
              </div>
          </div>
      )}

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-slate-900 bg-slate-950 z-20 shrink-0">
         <h1 className="text-xl font-bold tracking-wide text-slate-100">Patient Dashboard</h1>
         <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Welcome, {user.name}</span>
            <button onClick={onLogout} className="text-xs text-aegis-teal hover:underline">Logout</button>
         </div>
      </header>

      <div className="flex-grow flex relative overflow-hidden">
         {/* Sidebar */}
         <div className="w-64 flex-none bg-slate-950 relative z-10 flex flex-col pt-8">
            <nav className="space-y-6 px-6">
               <SidebarItem active={activeSection === 'REPORT'} onClick={() => handleSidebarClick('REPORT')} label="Your Report" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} />
               <SidebarItem active={activeSection === 'EMERGENCY'} onClick={() => handleSidebarClick('EMERGENCY')} label="Emergency Query" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>} />
               <SidebarItem active={activeSection === 'DIET'} onClick={() => handleSidebarClick('DIET')} label="Diet Plan" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>} />
               <SidebarItem active={activeSection === 'FITNESS'} onClick={() => handleSidebarClick('FITNESS')} label="Fitness Tracker" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>} />
               <SidebarItem active={activeSection === 'APPOINTMENTS'} onClick={() => handleSidebarClick('APPOINTMENTS')} label="Book Appointment" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>} />
               <SidebarItem active={activeSection === 'PROFILE'} onClick={() => handleSidebarClick('PROFILE')} label="My Profile" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>} />
               <div className="pt-4 mt-4 border-t border-slate-800">
                   <SidebarItem active={activeSection === 'SETTINGS'} onClick={() => handleSidebarClick('SETTINGS')} label="Settings" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>} />
               </div>
            </nav>
         </div>

         {/* Content Area */}
         <div className={`flex-grow bg-slate-900 rounded-tl-[3rem] p-8 relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex flex-col ${activeSection === 'REPORT' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
            <div className={`flex-grow ${activeSection === 'REPORT' ? 'h-full flex flex-col' : ''}`}>
                {/* --- SECTION 1: YOUR REPORT --- */}
                {activeSection === 'REPORT' && (
                   <>
                   <div className="grid lg:grid-cols-2 gap-12 flex-grow overflow-hidden mb-4">
                      <div className="flex flex-col items-center justify-start relative pt-6 h-full p-2 animate-fade-in">
                         <h2 className="absolute top-0 left-0 text-slate-500 font-mono text-xs tracking-widest uppercase">Digital Twin Engine</h2>
                         <div className="scale-100 mb-4 w-full max-w-md transition-all duration-700">
                            <Body highlightedOrgans={activeReport?.affectedOrgans || []} risks={activeReport?.riskRadar || []} />
                         </div>
                         {activeReport && (
                             <div className="w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700 backdrop-blur-sm animate-fade-in mt-2 flex flex-col gap-4">
                                 <div className="grid grid-cols-3 gap-4 text-center">
                                     <div>
                                         <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-tighter">Blood Pressure</p>
                                         <p className="text-xl text-white font-mono">{activeReport.vitals.bp}</p>
                                     </div>
                                     <div>
                                         <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-tighter">Heart Rate</p>
                                         <p className="text-xl text-white font-mono">{activeReport.vitals.heartRate}</p>
                                     </div>
                                     <div>
                                         <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-tighter">BMI Index</p>
                                         <p className="text-xl text-white font-mono">{activeReport.vitals.bmi}</p>
                                     </div>
                                 </div>
                                 <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                     <div className="h-full bg-aegis-teal transition-all duration-1000" style={{ width: `${activeReport.wellnessScore}%` }}></div>
                                 </div>
                             </div>
                         )}
                      </div>
                      <div className="flex flex-col justify-start space-y-8 pt-6 h-full overflow-y-auto pr-4 custom-scrollbar pb-10">
                         {isAnalyzingReport || isLoadingData ? (
                            <div className="flex flex-col items-center justify-center h-64">
                               <LoadingSpinner size="lg" />
                               <p className="mt-4 text-aegis-teal font-mono tracking-widest text-sm animate-pulse">{isLoadingData ? "Syncing Database..." : "Generative AI at work..."}</p>
                            </div>
                         ) : !activeReport ? (
                            !reportMode ? (
                               <div className="space-y-6">
                                  <h2 className="text-3xl font-bold text-white mb-2">Initialize Digital Twin</h2>
                                  <p className="text-slate-400">Your health baseline is empty. Start your journey by syncing your clinical data.</p>
                                  <div className="grid gap-4">
                                     <button onClick={() => setReportMode('UPLOAD')} className="p-6 bg-slate-800/80 rounded-xl border border-slate-700 hover:border-aegis-teal text-left transition-all group">
                                        <h3 className="font-bold text-lg text-white flex items-center gap-2">📄 Upload Clinical Report</h3>
                                        <p className="text-sm text-slate-500 mt-2">Our AI will extract biomarkers from your PDFs or lab images.</p>
                                     </button>
                                     <button onClick={() => setReportMode('ASSUMPTION')} className="p-6 bg-slate-800/80 rounded-xl border border-slate-700 hover:border-aegis-teal text-left transition-all group">
                                        <h3 className="font-bold text-lg text-white flex items-center gap-2">🧠 Manual AI Assumption</h3>
                                        <p className="text-sm text-slate-500 mt-2">Predict your health scores via clinical reasoning and lifestyle survey.</p>
                                     </button>
                                  </div>
                               </div>
                            ) : reportMode === 'UPLOAD' ? (
                               <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 animate-slide-in-up">
                                  <h3 className="text-xl font-bold text-white mb-6">Extraction Engine</h3>
                                  <FileUpload onUpload={handleFileUpload} />
                                  <button onClick={() => setReportMode(null)} className="mt-4 text-slate-500 text-sm hover:text-white">Cancel</button>
                               </div>
                            ) : (
                               <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 animate-slide-in-up flex flex-col">
                                  <div className="flex-none mb-6">
                                    <div className="flex justify-between text-xs text-slate-500 mb-2"><span>Basics</span><span>Vitals</span><span>Symptoms</span><span>Routine</span><span>Signs</span><span>AI</span></div>
                                    <ProgressBar currentStep={assumptionStep - 1} totalSteps={6} />
                                  </div>
                                  <h3 className="text-xl font-bold text-white mb-4">Phase {assumptionStep}: {assumptionStep === 1 ? 'Demographics' : assumptionStep === 2 ? 'Lifestyle & Risk' : assumptionStep === 3 ? 'Current Symptoms' : assumptionStep === 4 ? 'Daily Routine' : assumptionStep === 5 ? 'Visible Signs' : 'Deep Dive'}</h3>
                                  {assumptionStep === 1 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4"><Input variant="dark" label="Age" type="number" value={assumptionData.age || ''} onChange={e => updateAssumption('age', parseInt(e.target.value))} /><div><label className="text-sm text-slate-400 block mb-1">Gender</label><select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" value={assumptionData.gender || 'Male'} onChange={e => updateAssumption('gender', e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></div></div>
                                        <div className="grid grid-cols-2 gap-4"><Input variant="dark" label="Height (cm)" type="number" placeholder="170" value={assumptionData.heightCm || ''} onChange={e => updateAssumption('heightCm', parseInt(e.target.value))} /><Input variant="dark" label="Weight (kg)" type="number" placeholder="70" value={assumptionData.weightKg || ''} onChange={e => updateAssumption('weightKg', parseInt(e.target.value))} /></div>
                                        <div className="flex justify-end mt-4"><Button onClick={() => setAssumptionStep(2)}>Next Step →</Button></div>
                                    </div>
                                  )}
                                  {assumptionStep === 2 && (
                                      <div className="space-y-6">
                                          <div><label className="text-sm text-slate-400 block mb-2">Activity Level</label><div className="grid grid-cols-3 gap-2">{['Sedentary', 'Moderate', 'Active'].map(lvl => (<button key={lvl} onClick={() => updateAssumption('activityLevel', lvl)} className={`p-2 rounded border text-sm transition-all ${assumptionData.activityLevel === lvl ? 'bg-aegis-teal border-aegis-teal text-white' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>{lvl}</button>))}</div></div>
                                          <div className="grid grid-cols-2 gap-4"><div className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center"><span className="text-slate-300 text-sm">Smoker?</span><input type="checkbox" checked={!!assumptionData.smoking} onChange={e => updateAssumption('smoking', e.target.checked)} className="w-5 h-5 accent-aegis-teal" /></div><div className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center"><span className="text-slate-300 text-sm">Alcohol?</span><select className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600" value={assumptionData.alcohol || 'Never'} onChange={e => updateAssumption('alcohol', e.target.value)}><option>Never</option><option>Social</option><option>Regular</option></select></div></div>
                                          <div><label className="text-sm text-slate-400 block mb-2">Family History</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!assumptionData.familyDiabetes} onChange={e => updateAssumption('familyDiabetes', e.target.checked)} className="w-4 h-4 accent-aegis-teal" /><span className="text-slate-300 text-sm">Diabetes</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!assumptionData.familyHeart} onChange={e => updateAssumption('familyHeart', e.target.checked)} className="w-4 h-4 accent-aegis-teal" /><span className="text-slate-300 text-sm">Heart Disease</span></label></div></div>
                                          <div className="flex gap-4 justify-between mt-4"><Button variant="secondary" onClick={() => setAssumptionStep(1)}>Back</Button><Button onClick={() => setAssumptionStep(3)}>Next Step →</Button></div>
                                      </div>
                                  )}
                                  {assumptionStep === 3 && (
                                      <div className="space-y-6">
                                          <div><label className="text-sm text-slate-400 block mb-2">Primary Complaints</label><div className="flex flex-wrap gap-2">{['Fatigue/Weakness', 'Headache', 'Chest Pain', 'Shortness of Breath', 'Joint Pain', 'Acidity/Bloating', 'Dizziness', 'Insomnia'].map(sym => (<button key={sym} onClick={() => toggleSymptom(sym)} className={`px-3 py-1 rounded-full text-xs border transition-all ${assumptionData.primaryComplaints?.includes(sym) ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>{sym}</button>))}</div></div>
                                          <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-400">Current Pain Level</label><span className="text-aegis-gold font-bold text-sm">{getPainSeverityLabel(assumptionData.painSeverity)}</span></div><input type="range" min="0" max="10" step="1" value={assumptionData.painSeverity || 0} onChange={e => updateAssumption('painSeverity', parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-aegis-gold" /></div>
                                          <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-400">Perceived Stress</label><span className="text-aegis-teal font-bold text-sm">{assumptionData.perceivedStress || 0}/10</span></div><input type="range" min="0" max="10" step="1" value={assumptionData.perceivedStress || 0} onChange={e => updateAssumption('perceivedStress', parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-aegis-teal" /></div>
                                          <div className="flex gap-4 justify-between mt-4"><Button variant="secondary" onClick={() => setAssumptionStep(2)}>Back</Button><Button onClick={() => setAssumptionStep(4)}>Next Step →</Button></div>
                                      </div>
                                  )}
                                  {assumptionStep === 4 && (
                                      <div className="space-y-6">
                                           <div className="grid grid-cols-2 gap-4"><div><label className="text-sm text-slate-400 block mb-1">Diet Type</label><select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" value={assumptionData.diet || 'Veg'} onChange={e => updateAssumption('diet', e.target.value)}><option>Veg</option><option>Non-Veg</option><option>Vegan</option></select></div><Input variant="dark" label="Daily Water (L)" type="number" step="0.5" placeholder="2.5" value={assumptionData.dailyWaterIntake || ''} onChange={e => updateAssumption('dailyWaterIntake', parseFloat(e.target.value))} /></div>
                                           <div><label className="text-sm text-slate-400 block mb-1">Sleep Quality</label><select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" value={assumptionData.sleep || 'Good'} onChange={e => updateAssumption('sleep', e.target.value)}><option>Good</option><option>Insomnia</option><option>Excessive</option><option>Irregular</option></select></div>
                                           <div><label className="text-sm text-slate-400 block mb-1">Work Type</label><div className="grid grid-cols-3 gap-2">{['Desk', 'Physical', 'Mixed'].map(type => (<button key={type} onClick={() => updateAssumption('workType', type)} className={`p-2 rounded border text-sm transition-all ${assumptionData.workType === type ? 'bg-blue-900/50 border-blue-500 text-blue-200' : 'border-slate-600 text-slate-400'}`}>{type}</button>))}</div></div>
                                           <div className="flex gap-4 justify-between mt-4"><Button variant="secondary" onClick={() => setAssumptionStep(3)}>Back</Button><Button onClick={() => setAssumptionStep(5)}>Next Step →</Button></div>
                                      </div>
                                  )}
                                  {assumptionStep === 5 && (
                                      <div className="space-y-6"><p className="text-slate-400 text-sm">Do you notice any of these visible signs?</p><div className="space-y-3"><div className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${assumptionData.isPale ? 'bg-slate-800 border-aegis-teal' : 'bg-slate-900 border-slate-700'}`} onClick={() => updateAssumption('isPale', !assumptionData.isPale)}><div><h4 className="text-white font-bold text-sm">Pale Skin / Eyes</h4><p className="text-xs text-slate-500">Possible sign of anemia</p></div><div className={`w-5 h-5 rounded border ${assumptionData.isPale ? 'bg-aegis-teal border-aegis-teal' : 'border-slate-500'}`}></div></div><div className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${assumptionData.feetSwelling ? 'bg-slate-800 border-aegis-teal' : 'bg-slate-900 border-slate-700'}`} onClick={() => updateAssumption('feetSwelling', !assumptionData.feetSwelling)}><div><h4 className="text-white font-bold text-sm">Swollen Feet / Ankles</h4><p className="text-xs text-slate-500">Water retention or circulation issue</p></div><div className={`w-5 h-5 rounded border ${assumptionData.feetSwelling ? 'bg-aegis-teal border-aegis-teal' : 'border-slate-500'}`}></div></div></div><div className="bg-blue-900/10 border border-blue-800/50 p-4 rounded-lg"><p className="text-blue-200 text-xs">Almost done! Next, our AI Doctor will ask a few follow-up questions to refine your Digital Twin.</p></div><div className="flex gap-4 justify-between mt-4"><Button variant="secondary" onClick={() => setAssumptionStep(4)}>Back</Button><Button onClick={checkVitalsAndProceed} className="bg-aegis-gold text-slate-900 hover:bg-amber-500">Start AI Deep Dive</Button></div></div>
                                  )}
                                  {assumptionStep === 6 && (
                                     <div className="space-y-4 h-[400px] flex flex-col"><div ref={deepDiveScrollRef} className="flex-grow bg-slate-900/50 rounded-lg p-4 overflow-y-auto space-y-3 custom-scrollbar">{deepDiveMessages.map((msg, i) => <ChatBubble key={i} sender={msg.sender} text={msg.text} />)}{deepDiveMessages.length === 0 && (<div className="text-center text-slate-500 text-sm mt-10"><LoadingSpinner size="sm" className="mx-auto mb-2" />Initializing Medical Interview...</div>)}</div><div className="flex gap-3"><Input variant="dark" value={deepDiveInput} onChange={e => setDeepDiveInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDeepDiveSend()} className="mb-0 flex-grow" placeholder="Type your answer..." /><Button onClick={handleDeepDiveSend} disabled={!deepDiveInput.trim() || isDeepDiveThinking}>{isDeepDiveThinking ? '...' : 'Send'}</Button></div></div>
                                  )}
                               </div>
                            )
                         ) : (
                            <div className="space-y-6 animate-fade-in pb-10">
                               <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-aegis-teal/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                  <div className="flex justify-between items-start mb-6 relative z-10">
                                     <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">Health Blueprint</h2>
                                        <p className="text-xs text-slate-500 font-mono">Synced @ {activeReport.date}</p>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <button onClick={() => { setReportHistory([]); setCurrentReportIndex(0); setReportMode(null); }} className="text-[10px] text-slate-600 hover:text-white uppercase font-bold transition-colors">Clear All</button>
                                         <div className="w-px h-4 bg-slate-700"></div>
                                         <button onClick={() => setReportMode('ASSUMPTION')} className="text-xs text-aegis-teal hover:underline font-bold">New Scan</button>
                                     </div>
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-6 mb-8 relative z-10">
                                      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl flex flex-col items-center justify-center p-6 shadow-inner">
                                          <WellnessWheel score={activeReport.wellnessScore} />
                                          <div className="mt-4 text-center">
                                              <span className={`text-sm font-bold block mb-1 ${activeReport.wellnessScore >= 80 ? 'text-green-400' : 'text-amber-400'}`}>{activeReport.wellnessStatus}</span>
                                              <span className="text-[10px] text-slate-500 font-mono">Consolidated Risk Vector</span>
                                          </div>
                                      </div>
                                      <div className="space-y-3">
                                          <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-1 h-3 bg-aegis-gold rounded-full"></span> Critical Highlights</h3>
                                          {activeReport.riskRadar?.map((risk, i) => (
                                              <div key={i} className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-1 transition-all hover:border-slate-600">
                                                  <div className="flex justify-between items-center">
                                                      <span className="text-slate-200 text-xs font-bold">{risk.category}</span>
                                                      <Badge color={risk.status === 'High Risk' ? 'bg-red-900/30 text-red-400 border border-red-800' : risk.status === 'Medium Risk' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' : 'bg-slate-700/30 text-slate-400 border border-slate-600'}>{risk.status}</Badge>
                                                  </div>
                                                  <p className="text-[10px] text-slate-500 leading-relaxed">{risk.reasoning}</p>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="space-y-6 relative z-10">
                                      <div className="bg-aegis-teal/5 p-4 rounded-xl border border-aegis-teal/20">
                                          <h3 className="text-aegis-teal font-bold uppercase text-[10px] tracking-widest mb-2">Generative Clinical Insight</h3>
                                          <p className="text-slate-300 text-sm leading-relaxed italic">"{activeReport.doctorsNote}"</p>
                                      </div>
                                      <div>
                                          <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1 h-3 bg-blue-500 rounded-full"></span> Biomarker Projection</h3>
                                          {activeReport.simulatedLabs && activeReport.simulatedLabs.length > 0 ? (
                                              <div className="grid gap-3">
                                                  {activeReport.simulatedLabs.map((lab, i) => (
                                                      <div key={i} className="flex items-center justify-between p-3 bg-slate-900/80 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
                                                          <div>
                                                              <div className="text-white font-bold text-sm">{lab.testName}</div>
                                                              <div className="text-[10px] text-slate-500">{lab.insight}</div>
                                                          </div>
                                                          <div className="text-right">
                                                              <div className="text-aegis-gold font-mono text-xs mb-1">{lab.predictedRange}</div>
                                                              <Badge color={lab.status === 'Normal' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}>{lab.status}</Badge>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : (
                                              <p className="text-xs text-slate-500 font-mono">No biomarker projections available.</p>
                                          )}
                                      </div>
                                      <div>
                                          <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Mitigation Roadmap</h3>
                                          <ul className="space-y-2">
                                              {activeReport.actionPlanSteps?.map((step, i) => (
                                                  <li key={i} className="flex gap-3 items-start text-sm text-slate-300">
                                                      <span className="flex-none w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-500">{i+1}</span>
                                                      {step}
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  </div>
                               </div>
                            </div>
                         )}
                      </div>
                   </div>
                   {reportHistory.length > 1 && !isAnalyzingReport && !isLoadingData && (
                        <TimelineDial 
                            reports={reportHistory} 
                            selectedIndex={currentReportIndex} 
                            onSelect={setCurrentReportIndex} 
                        />
                   )}
                   </>
                )}

                {/* --- PROFILE SECTION --- */}
                {activeSection === 'PROFILE' && (
                    <div className="max-w-2xl mx-auto h-full animate-fade-in pt-10 pb-20">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-aegis-teal shadow-[0_0_10px_#0d9488]"></div>
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl shadow-lg">
                                    👤
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">My Profile</h2>
                                    <p className="text-slate-400 text-sm">Manage your personal clinical identifiers.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input variant="dark" label="Full Name" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input variant="dark" label="Age" type="number" value={profileForm.age} onChange={e => setProfileForm({...profileForm, age: e.target.value})} />
                                    <div>
                                        <label className="text-sm text-slate-400 block mb-1">Gender</label>
                                        <select 
                                            className="w-full bg-slate-950 border border-slate-600 rounded-lg p-3 text-white focus:border-aegis-teal outline-none"
                                            value={profileForm.gender} 
                                            onChange={e => setProfileForm({...profileForm, gender: e.target.value})}
                                        >
                                            <option>Male</option><option>Female</option><option>Other</option>
                                        </select>
                                    </div>
                                </div>
                                <Input variant="dark" label="Contact Number" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} maxLength={10} />
                                <Input variant="dark" label="Residential Address" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
                                
                                <div className="pt-6 border-t border-slate-800 mt-6 flex flex-col gap-3">
                                    <Button onClick={handleSaveProfile} isLoading={isSavingProfile} className="w-full py-4 text-lg">
                                        {profileSaved ? 'Profile Updated!' : 'Save Profile Changes'}
                                    </Button>
                                    {profileSaved && <p className="text-center text-green-400 text-sm animate-fade-in font-mono">Backend synchronization complete.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- EMERGENCY & OTHERS --- */}
                {activeSection === 'EMERGENCY' && (<div className="h-full animate-fade-in"><Triage user={user} contextData={consentedContext} onComplete={() => setActiveSection('REPORT')} /></div>)}
                {activeSection === 'DIET' && (<div className="max-w-4xl mx-auto h-full animate-fade-in pt-6 pb-20"><div className="flex flex-col h-full">{!weeklyPlan ? (<div className="flex-grow flex flex-col justify-center"><div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 space-y-8 max-w-2xl mx-auto w-full shadow-2xl"><h2 className="text-3xl font-bold text-white mb-2 font-mono">Setup Diet</h2><div className="space-y-6"><div className="grid grid-cols-2 gap-6"><select className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" value={dietPrefs.cuisine} onChange={e => setDietPrefs({...dietPrefs, cuisine: e.target.value as any})}><option>North Indian</option><option>South Indian</option><option>Continental</option></select><select className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" value={dietPrefs.type} onChange={e => setDietPrefs({...dietPrefs, type: e.target.value as any})}><option>Veg</option><option>Non-Veg</option></select></div></div><Button onClick={handleGenerateWeeklyDiet} isLoading={isGeneratingWeekly} className="w-full py-4 text-lg font-mono">Generate Plan</Button></div></div>) : (<div className="animate-slide-in-right space-y-6"><div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700"><h2 className="text-white font-bold text-lg">Weekly Meal Plan</h2><button onClick={() => setWeeklyPlan(null)} className="text-xs text-slate-500 hover:text-white underline">Reset</button></div><div className="bg-slate-950 border-2 border-slate-400 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[70vh]"><div className="relative z-10 flex justify-between items-center mb-6 pb-4 border-b border-slate-700 border-dashed flex-none"><h3 className="text-3xl font-mono text-white">{weeklyPlan.days[dietDayIndex].label}</h3><div className="flex items-center gap-2"><button onClick={handlePrevDay} disabled={dietDayIndex === 0} className="px-3 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white">←</button><button onClick={handleNextDay} className="px-3 py-1 rounded-lg border border-slate-700 text-aegis-teal hover:text-white">→</button></div></div><div className="relative z-10 space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-grow">{weeklyPlan.days[dietDayIndex].meals.map((meal, idx) => (<div key={idx} className="flex flex-col md:flex-row gap-6"><div className="md:w-32 flex-none pt-4"><h4 className="text-xl font-bold text-white mb-1">{meal.type}</h4><input value={meal.timeSuggestion} onChange={(e) => handleTimeChange(dietDayIndex, idx, e.target.value)} className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 w-full text-xs text-aegis-gold" /></div><div className="flex-grow border border-slate-500 rounded-2xl p-1 bg-slate-900/50"><div className="flex flex-col divide-y divide-slate-700">{meal.options.map((option, optIdx) => (<div key={optIdx} className="p-4 flex justify-between items-center hover:bg-slate-800/50"><div><h5 className="text-white font-medium text-lg">{option.name}</h5><p className="text-sm text-slate-400">{option.shortReason}</p></div><button onClick={() => handleViewRecipe(option)} className="ml-4 px-3 py-1.5 rounded border border-slate-600 text-xs text-slate-300">View Recipe</button></div>))}</div></div></div>))}</div></div></div>)}</div></div>)}
                {activeSection === 'FITNESS' && (<div className="h-full flex flex-col max-w-4xl mx-auto animate-fade-in"><div className="flex-grow bg-slate-900 border border-slate-700 rounded-2xl p-6 overflow-y-auto mb-4 space-y-4 scroll-smooth">{fitnessMessages.map((msg, idx) => (<ChatBubble key={idx} sender={msg.sender} text={msg.text} />))}{isFitnessThinking && (<LoadingSpinner size="sm" />)}</div><div className="flex-none flex gap-4"><Input variant="dark" value={fitnessInput} onChange={e => setFitnessInput(e.target.value)} className="mb-0 flex-grow" onKeyDown={e => e.key === 'Enter' && handleFitnessSend()} /><Button onClick={handleFitnessSend}>Send</Button></div></div>)}
                {activeSection === 'SETTINGS' && (
                    <div className="max-w-2xl mx-auto h-full animate-fade-in pt-10 pb-20"><div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"><div className="flex items-center gap-4 mb-8"><div className="bg-slate-800 p-3 rounded-xl text-aegis-teal"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div><div><h2 className="text-2xl font-bold text-white">Notification Preferences</h2><p className="text-slate-400 text-sm">Control how AegisCare communicates with you.</p></div></div><div className="space-y-8"><div className="space-y-4"><h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1">Health & Reports</h3><Toggle label="Email Alerts" description="Receive detailed summaries when new Digital Twin reports are generated." checked={notifPrefs.emailAlerts} onChange={(v: boolean) => setNotifPrefs(prev => ({ ...prev, emailAlerts: v }))} /><Toggle label="SMS Alerts" description="Get text notifications for critical health flags or test results." checked={notifPrefs.smsAlerts} onChange={(v: boolean) => setNotifPrefs(prev => ({ ...prev, smsAlerts: v }))} /></div><div className="space-y-4"><h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1">Daily Reminders</h3><Toggle label="Diet & Medicine" description="Receive daily push notifications for meal times and medication schedules." checked={notifPrefs.dietReminders} onChange={(v: boolean) => setNotifPrefs(prev => ({ ...prev, dietReminders: v }))} /></div><div className="space-y-4"><h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1">Emergency</h3><Toggle label="Live Status Updates" description="Enable real-time tracking updates when an emergency case is active." checked={notifPrefs.emergencyUpdates} onChange={(v: boolean) => setNotifPrefs(prev => ({ ...prev, emergencyUpdates: v }))} /></div></div><div className="mt-10 flex flex-col gap-3"><Button onClick={handleSaveSettings} isLoading={isSavingSettings} className="w-full py-4 text-lg">{settingsSaved ? 'Preferences Saved!' : 'Save Changes'}</Button>{settingsSaved && <p className="text-center text-green-400 text-sm animate-fade-in">Settings updated successfully.</p>}</div></div></div>
                )}
                {activeSection === 'APPOINTMENTS' && (
                    <div className="max-w-4xl mx-auto h-full animate-fade-in pt-6 pb-20">
                        {bookingStep === 'SELECT' && (
                            <div>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-white">Book an Appointment</h2>
                                    <p className="text-slate-400">Choose a recommended facility. 1 Govt. Hospital and 3 Private options available.</p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {availableHospitals.map(h => (
                                        <div key={h.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col hover:border-aegis-teal transition-all group relative overflow-hidden">
                                            {h.type === 'GOVT' && <div className="absolute top-0 right-0 bg-aegis-gold text-slate-900 text-xs font-bold px-3 py-1 rounded-bl-lg">GOVT / LOW COST</div>}
                                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-aegis-teal transition-colors">{h.name}</h3>
                                            <div className="flex gap-2 mb-4">
                                                <Badge color="bg-slate-700 text-slate-300">{h.region}</Badge>
                                                <Badge color="bg-slate-700 text-slate-300">★ {h.rating}</Badge>
                                            </div>
                                            <div className="flex-grow space-y-2 mb-6">
                                                <p className="text-xs text-slate-500 uppercase font-bold">Key Specialties</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {h.capabilities.slice(0, 3).map(c => <span key={c} className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">{c}</span>)}
                                                </div>
                                            </div>
                                            <Button onClick={() => handleBookClick(h)} className="w-full mt-auto">Book Here</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {bookingStep === 'FORM' && (
                            <div className="max-w-lg mx-auto bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl animate-fade-in">
                                <h2 className="text-2xl font-bold text-white mb-6">Appointment Details</h2>
                                <div className="space-y-4">
                                    <Input variant="dark" type="date" label="Preferred Date" value={bookingDetails.date} onChange={e => setBookingDetails({...bookingDetails, date: e.target.value})} />
                                    <Input variant="dark" type="time" label="Preferred Time" value={bookingDetails.time} onChange={e => setBookingDetails({...bookingDetails, time: e.target.value})} />
                                    <div>
                                        <label className="text-sm text-slate-400 block mb-1">Visit Type</label>
                                        <select className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white" value={bookingDetails.visitType} onChange={e => setBookingDetails({...bookingDetails, visitType: e.target.value as VisitType})}>
                                            <option>General Checkup</option>
                                            <option>Follow-up</option>
                                            <option>Emergency</option>
                                            <option>Tele-consult</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 block mb-1">Reason for Visit</label>
                                        <textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white" rows={3} value={bookingDetails.reason} onChange={e => setBookingDetails({...bookingDetails, reason: e.target.value})} placeholder="Briefly describe your issue..." />
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button variant="ghost" onClick={() => setBookingStep('SELECT')}>Back</Button>
                                        <Button onClick={submitBooking} isLoading={isBookingLoading} disabled={!bookingDetails.date || !bookingDetails.time} className="flex-grow">Confirm Appointment</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {bookingStep === 'SUCCESS' && (
                            <div className="flex flex-col items-center justify-center h-full text-center animate-slide-in-up">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/50">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h2>
                                <p className="text-slate-400 mb-8 max-w-md">Your appointment with <strong>{selectedHospitalForBooking?.name}</strong> has been scheduled. Your health report summary has been securely synced.</p>
                                <Button onClick={() => { setBookingStep('SELECT'); setSelectedHospitalForBooking(null); setBookingDetails({date:'',time:'',visitType:'General Checkup',reason:''}); }}>Book Another</Button>
                            </div>
                        )}
                    </div>
                )}

            </div>
         </div>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean, label: string, icon: React.ReactNode, onClick: () => void }> = ({ active, label, icon, onClick }) => (
   <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group ${active ? 'bg-slate-800 text-aegis-teal shadow-[0_0_15px_rgba(13,148,136,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'} relative`}>
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      <span className={`font-medium tracking-wide ${active ? 'font-bold' : ''}`}>{label}</span>
      {active && <div className="absolute right-4 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>}
   </button>
);