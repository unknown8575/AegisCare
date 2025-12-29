import React, { useState, useEffect, useRef } from 'react';
import { User, TriageInput, SBAR, ESILevel, Language, SharedContext, HospitalResource, FirstAidResult, FitnessMessage } from '../../types';
import { generateSBAR, maskPII, generateFirstAidAdvice, getNearbyHospitals, generateEmergencyChatResponse } from '../../services/geminiService';
import { submitTriageCase, getEmergencyChat, saveEmergencyChat } from '../../services/mockBackend';
import { Button, Card, TextArea, Input, TrishulBadge, LanguageToggle, LoadingSpinner, ChatBubble } from '../../components/UI';
import { ESI_COLORS, ESI_DESCRIPTIONS } from '../../constants';

interface TriageProps {
  user: User;
  contextData?: SharedContext;
  onComplete: () => void;
}

type Step = 'SOS' | 'INPUT' | 'PROCESSING' | 'RESULT';

export const Triage: React.FC<TriageProps> = ({ user, contextData, onComplete }) => {
  const [step, setStep] = useState<Step>('SOS');
  const [lang, setLang] = useState<Language>('en');
  
  const [hospitals, setHospitals] = useState<HospitalResource[]>([]);
  const [firstAidQuery, setFirstAidQuery] = useState('');
  const [firstAidResult, setFirstAidResult] = useState<FirstAidResult | null>(null);
  const [isAiFirstAidLoading, setIsAiFirstAidLoading] = useState(false);
  
  const [selectedHospital, setSelectedHospital] = useState<HospitalResource | null>(null);
  const [notifiedHospitalId, setNotifiedHospitalId] = useState<string | null>(null);
  const [isSharingData, setIsSharingData] = useState(false);

  const [isLocationSharing, setIsLocationSharing] = useState(false);
  
  const [showSecureChat, setShowSecureChat] = useState(false);
  const [secureMessages, setSecureMessages] = useState<FitnessMessage[]>([]);
  const [secureChatInput, setSecureChatInput] = useState("");
  const [isChatThinking, setIsChatThinking] = useState(false);
  const secureChatScrollRef = useRef<HTMLDivElement>(null);
  const [isInitialChatLoad, setIsInitialChatLoad] = useState(true);
  
  const [symptoms, setSymptoms] = useState('');
  const [pain, setPain] = useState(5);
  const [duration, setDuration] = useState('');
  
  const [displaySymptoms, setDisplaySymptoms] = useState('');
  const [isRedacted, setIsRedacted] = useState(false);
  
  const [result, setResult] = useState<{ sbar: SBAR; esiLevel: ESILevel; reasoning: string } | null>(null);

  // Load chat history and hospitals
  useEffect(() => {
      const init = async () => {
          if (step === 'SOS') {
              getNearbyHospitals().then(setHospitals);
          }
          
          const history = await getEmergencyChat(user.id);
          if (history.length > 0) {
              setSecureMessages(history);
          } else {
              setSecureMessages([
                  { sender: 'AI', text: "Secure Line Connected. Triage Command Center connected. How can we help?" }
              ]);
          }
          setIsInitialChatLoad(false);
      };
      init();
  }, [user.id, step]);

  // Persist chat whenever messages change
  useEffect(() => {
      if (!isInitialChatLoad && secureMessages.length > 0) {
          saveEmergencyChat(user.id, secureMessages);
      }
  }, [secureMessages, user.id, isInitialChatLoad]);

  // Scroll Chat to bottom
  useEffect(() => {
     if (secureChatScrollRef.current) {
         secureChatScrollRef.current.scrollTop = secureChatScrollRef.current.scrollHeight;
     }
  }, [secureMessages, showSecureChat]);

  const strings = {
    sos: lang === 'en' ? "START AI TRIAGE" : "एआई ट्राइएज शुरू करें",
    sosSub: lang === 'en' ? "For Critical Analysis & Hospital Alert" : "गंभीर विश्लेषण और अस्पताल चेतावनी के लिए",
    describe: lang === 'en' ? "Describe your symptoms..." : "अपने लक्षण बताएं...",
    record: lang === 'en' ? "Hold to Record" : "रिकॉर्ड करने के लिए दबाएं",
    analyzing: lang === 'en' ? "Analyzing..." : "विश्लेषण हो रहा है...",
    sent: lang === 'en' ? "Sent to Hospital" : "अस्पताल भेजा गया",
    raw: lang === 'en' ? "Raw Input" : "कच्चा इनपुट",
    redacted: lang === 'en' ? "Anonymized for AI" : "एआई के लिए अनाम",
  };

  const handleSOSClick = () => {
    setStep('INPUT');
  };

  const handleFirstAidSearch = async () => {
      if(!firstAidQuery.trim()) return;
      setIsAiFirstAidLoading(true);
      const advice = await generateFirstAidAdvice(firstAidQuery);
      setFirstAidResult(advice);
      setIsAiFirstAidLoading(false);
  };

  const handleSendSecureMessage = async () => {
      if (!secureChatInput.trim()) return;
      
      const userMsg: FitnessMessage = { sender: 'USER', text: secureChatInput };
      const updatedMessages = [...secureMessages, userMsg];
      setSecureMessages(updatedMessages);
      setSecureChatInput('');
      setIsChatThinking(true);
      
      const response = await generateEmergencyChatResponse(updatedMessages, userMsg.text);
      
      setIsChatThinking(false);
      const finalMessages: FitnessMessage[] = [...updatedMessages, { sender: 'AI', text: response }];
      setSecureMessages(finalMessages);
  };

  const toggleLocation = () => {
      setIsLocationSharing(!isLocationSharing);
  };

  const handleHospitalClick = (h: HospitalResource) => {
      if (notifiedHospitalId === h.id) return;
      setSelectedHospital(h);
  };

  const handleShareConfirm = async () => {
      if (!selectedHospital) return;
      setIsSharingData(true);
      await new Promise(r => setTimeout(r, 1500));
      setNotifiedHospitalId(selectedHospital.id);
      setIsSharingData(false);
      window.alert(`SYNC SUCCESSFUL: Your vital data has been transmitted to ${selectedHospital.name}. The hospital staff can now see your incoming case on their dashboard.`);
      setSelectedHospital(null);
  };

  const handleSubmit = async () => {
    setStep('PROCESSING');
    setDisplaySymptoms(symptoms);
    await new Promise(r => setTimeout(r, 1000));
    const redacted = maskPII(symptoms);
    setDisplaySymptoms(redacted);
    setIsRedacted(true);
    await new Promise(r => setTimeout(r, 1500)); 

    try {
      const input: TriageInput = {
        symptomsText: symptoms,
        painScore: pain,
        duration: duration || 'Unknown',
        hasChestPain: symptoms.toLowerCase().includes('chest') || symptoms.toLowerCase().includes('heart'),
        hasBreathingIssue: symptoms.toLowerCase().includes('breath'),
        hasConfusion: false,
        age: 45, 
        gender: 'Male', 
        language: lang
      };

      const aiResponse = await generateSBAR(input);
      setResult(aiResponse);
      await submitTriageCase(user.id, input, aiResponse, undefined, contextData, notifiedHospitalId || undefined);
      setStep('RESULT');
    } catch (e: any) {
      alert(e.message || "Error");
      setStep('INPUT');
    }
  };

  if (step === 'SOS') {
    return (
      <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto pb-20 animate-fade-in custom-scrollbar">
        
        {selectedHospital && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white">Share Data with {selectedHospital.name}?</h3>
                        {!isSharingData && <button onClick={() => setSelectedHospital(null)} className="text-slate-500 hover:text-white">✕</button>}
                    </div>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        Do you consent to securely transmitting your Triage Report, Live Vitals, and GPS Location to this facility? This allows the ER team to prepare for your arrival.
                    </p>
                    
                    <div className="bg-slate-800/50 rounded p-4 mb-6 border border-slate-700">
                       <h4 className="text-xs font-bold text-aegis-gold uppercase mb-2 flex items-center gap-2">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                           Secure Data Packet
                       </h4>
                       <ul className="text-sm text-slate-300 space-y-1 list-disc pl-4">
                          <li>Latest Triage Report & Risk Analysis</li>
                          <li>Current Vitals & Pain Score</li>
                          <li>Patient Identity & Insurance (ABHA)</li>
                          <li>Live GPS ETA</li>
                       </ul>
                    </div>
      
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setSelectedHospital(null)} disabled={isSharingData}>Cancel</Button>
                        <Button onClick={handleShareConfirm} isLoading={isSharingData} className="flex-1 bg-aegis-teal text-white">
                            {isSharingData ? 'Securely Transmitting...' : 'Send Details & Confirm'}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {showSecureChat && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[70vh]">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-slate-950"></span>
                                <div className="w-10 h-10 bg-aegis-teal rounded-full flex items-center justify-center text-white">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Secure ER Channel</h3>
                                <p className="text-[10px] text-slate-400">Encrypted • Priority 1</p>
                            </div>
                        </div>
                        <button onClick={() => setShowSecureChat(false)} className="text-slate-500 hover:text-white p-2">✕</button>
                    </div>
                    
                    <div ref={secureChatScrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-900 custom-scrollbar">
                        {secureMessages.map((msg, i) => (
                            <ChatBubble key={i} sender={msg.sender} text={msg.text} />
                        ))}
                        {isChatThinking && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex gap-1">
                                    <span className="animate-bounce">●</span><span className="animate-bounce delay-100">●</span><span className="animate-bounce delay-200">●</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-slate-950 border-t border-slate-800 rounded-b-2xl">
                        <div className="flex gap-2">
                             <Input 
                                variant="dark" 
                                placeholder="Type urgent message..." 
                                value={secureChatInput} 
                                onChange={e => setSecureChatInput(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSendSecureMessage()}
                                className="mb-0 flex-grow"
                             />
                             <Button onClick={handleSendSecureMessage} disabled={!secureChatInput.trim()}>Send</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_red]"></span>
                Emergency Response Hub
            </h2>
            <LanguageToggle lang={lang} onChange={setLang} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="bg-red-950/30 border border-red-900 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-600/5 group-hover:bg-red-600/10 transition-colors"></div>
                    <div className="w-24 h-24 mb-6 relative z-10">
                       <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20 duration-2000"></div>
                       <button 
                         onClick={handleSOSClick}
                         className="w-full h-full bg-red-600 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-red-500"
                       >
                         <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                       </button>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{strings.sos}</h3>
                    <p className="text-sm text-red-200 opacity-80">{strings.sosSub}</p>
                </div>
                
                <button className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-xl border border-slate-700 flex items-center justify-center gap-3 group transition-all">
                    <div className="bg-green-900/30 text-green-400 p-2 rounded-full group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    </div>
                    <span className="text-sm font-bold text-slate-300">Call Ambulance (108)</span>
                </button>
            </div>

            <div className="flex flex-col gap-4">
                <div className={`rounded-xl border transition-all relative overflow-hidden ${isLocationSharing ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800 border-slate-700'}`}>
                    {isLocationSharing && (
                         <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none"></div>
                    )}
                    <div className="p-4 flex flex-col h-full">
                         <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center gap-2">
                                 <div className={`p-2 rounded-full ${isLocationSharing ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-white text-sm">Real-time Location</h3>
                                     <p className="text-xs text-slate-400">{isLocationSharing ? 'Broadcasting to EMS...' : 'Inactive'}</p>
                                 </div>
                             </div>
                             {isLocationSharing && <span className="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded animate-pulse">LIVE</span>}
                         </div>

                         {isLocationSharing ? (
                             <div className="flex-grow bg-slate-900 rounded-lg mb-3 relative overflow-hidden min-h-[80px] border border-blue-500/30">
                                 <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                     <span className="relative flex h-4 w-4">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                       <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                                     </span>
                                 </div>
                             </div>
                         ) : (
                             <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg mb-3 min-h-[80px] border border-slate-700/50">
                                 <span className="text-xs text-slate-500">Map Disabled</span>
                             </div>
                         )}
                         
                         <button 
                             onClick={toggleLocation} 
                             className={`w-full py-2 rounded-lg font-bold text-xs transition-colors ${isLocationSharing ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                         >
                             {isLocationSharing ? 'Stop Sharing' : 'Share Live Location'}
                         </button>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-aegis-teal/20 text-aegis-teal rounded-full">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                         </div>
                         <div>
                             <h3 className="font-bold text-white text-sm">Direct Line to ER</h3>
                             <p className="text-xs text-slate-400">Secure & Encrypted Channel</p>
                         </div>
                     </div>
                     <button onClick={() => setShowSecureChat(true)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors">
                         Open Chat
                     </button>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col">
                    <h3 className="text-aegis-gold font-bold uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        Instant First Aid
                    </h3>
                    
                    {!firstAidResult ? (
                        <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="e.g. Chemical Burn" 
                              className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-aegis-gold outline-none"
                              value={firstAidQuery}
                              onChange={(e) => setFirstAidQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleFirstAidSearch()}
                            />
                            <button 
                                onClick={handleFirstAidSearch}
                                disabled={isAiFirstAidLoading}
                                className="bg-aegis-gold text-black font-bold rounded-lg px-3 text-sm hover:bg-amber-500 transition-colors"
                            >
                                {isAiFirstAidLoading ? <LoadingSpinner size="sm" /> : 'GO'}
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-white text-sm capitalize">{firstAidResult.condition}</h4>
                                <button onClick={() => { setFirstAidResult(null); setFirstAidQuery(''); }} className="text-[10px] text-slate-500 hover:text-white">✕</button>
                            </div>
                            <div className="text-red-400 text-[10px] font-bold mb-2 flex items-start gap-1 leading-tight">
                                 <span>⚠️</span> {firstAidResult.warning}
                            </div>
                            <ol className="space-y-1">
                                {firstAidResult.steps.map((s, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-slate-300">
                                        <span className="font-mono text-aegis-gold font-bold">{i+1}.</span>
                                        {s}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-slate-900/30 rounded-2xl p-4 border border-slate-800">
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nearby ER Capacity (Live Sim)</h3>
                <span className="text-[10px] text-aegis-teal bg-aegis-teal/10 px-2 py-0.5 rounded animate-pulse">● Live Updates</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                {hospitals.map(h => (
                    <div 
                        key={h.id} 
                        onClick={() => handleHospitalClick(h)}
                        className={`bg-slate-800/50 border rounded-xl p-4 transition-all cursor-pointer group relative overflow-hidden
                            ${notifiedHospitalId === h.id 
                                ? 'border-green-500 bg-green-900/10' 
                                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                            }
                        `}
                    >
                        {notifiedHospitalId === h.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-[1px]">
                                 <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-slide-in-up">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    ROUTING ACTIVE
                                 </div>
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white text-sm group-hover:text-aegis-teal transition-colors">{h.name}</h4>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${h.status === 'Open' ? 'bg-green-900/30 text-green-400 border-green-800' : h.status === 'Crowded' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                                {h.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                            <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> {h.distance}</span>
                            <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> {h.driveTime}</span>
                        </div>
                        {notifiedHospitalId !== h.id && (
                             <div className="mt-2 text-center">
                                <span className="text-xs text-aegis-teal font-bold opacity-0 group-hover:opacity-100 transition-opacity">Tap to Send Details</span>
                             </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-4 bg-slate-800/50 p-3 rounded text-xs text-slate-400 border border-slate-700/50 flex items-center gap-2">
                <span className="text-xl">ℹ️</span>
                <span>Select a hospital above to enable Direct Graph Routing. Unselected cases will be broadcast to all nearby units.</span>
            </div>
        </div>
      </div>
    );
  }

  if (step === 'INPUT') {
    return (
      <div className="max-w-3xl mx-auto pb-10 animate-slide-in-up">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Emergency Triage</h2>
           <TrishulBadge />
        </div>

        <div className="space-y-6">
           <div>
              <label className="text-slate-500 text-sm mb-2 block">Tell us what is happening</label>
              <TextArea 
                 variant="dark" 
                 rows={4}
                 value={symptoms}
                 onChange={e => setSymptoms(e.target.value)}
                 placeholder="e.g. Severe chest pain, sweating..."
                 className="text-lg bg-slate-800 border-slate-700 text-white"
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <Input variant="dark" label="Pain (0-10)" type="number" min="0" max="10" value={pain} onChange={e => setPain(parseInt(e.target.value))} className="bg-slate-800 border-slate-700 text-white" />
              <Input variant="dark" label="Duration" placeholder="e.g. 30 mins" value={duration} onChange={e => setDuration(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
           </div>

           {notifiedHospitalId ? (
               <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 flex items-center gap-3 animate-fade-in">
                   <div className="bg-green-600 text-white p-2 rounded-full shadow-lg shadow-green-900/50">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                   </div>
                   <div>
                       <div className="text-xs text-green-400 font-bold uppercase tracking-wider">Direct Routing Active</div>
                       <div className="text-sm text-green-200">
                           Alert will be dispatched specifically to <span className="font-bold text-white">{hospitals.find(h => h.id === notifiedHospitalId)?.name}</span>.
                       </div>
                   </div>
               </div>
           ) : (
                <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 flex items-center gap-3">
                    <div className="text-yellow-500 text-xl">📡</div>
                    <div>
                        <div className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Broadcast Mode</div>
                        <div className="text-sm text-yellow-200">No specific hospital selected. Alert will be broadcast to all nearby ERs.</div>
                    </div>
                </div>
           )}

           <div className="flex gap-4">
               <Button variant="secondary" onClick={() => setStep('SOS')} className="flex-1">Back</Button>
               <Button 
                 onClick={handleSubmit} 
                 disabled={!symptoms} 
                 className="flex-[2] h-14 text-lg shadow-aegis-teal/50 shadow-lg active:scale-95 touch-manipulation font-bold tracking-wide"
               >
                 Analyze & Send Alert
               </Button>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'PROCESSING') {
    return (
      <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
         <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-2">
           <span className="w-3 h-3 bg-aegis-gold rounded-full animate-pulse"></span>
           Trishul Privacy Layer Active
         </h2>

         <div className="w-full grid grid-cols-2 gap-0 border border-slate-700 rounded-lg overflow-hidden mb-8 shadow-xl">
            <div className="bg-slate-800 p-4 border-r border-slate-700">
               <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{strings.raw}</div>
               <div className={`text-slate-300 transition-opacity duration-500 ${isRedacted ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
                 "{symptoms}"
               </div>
            </div>
            <div className="bg-slate-900 p-4 relative overflow-hidden">
               <div className="text-xs text-aegis-teal uppercase tracking-wider mb-2">{strings.redacted}</div>
               {isRedacted ? (
                 <div className="text-aegis-teal font-mono text-sm animate-pulse">
                   {displaySymptoms}
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                   Encrypting...
                 </div>
               )}
            </div>
         </div>

         {isRedacted && (
           <div className="flex flex-col items-center animate-fade-in">
              <div className="w-12 h-12 border-4 border-aegis-teal border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400">{strings.analyzing}</p>
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pt-10">
      <div className="text-center mb-8">
         <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/50 animate-slide-in-up">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
         </div>
         <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{strings.sent}</h2>
         <p className="text-slate-500">AegisCare ID: <span className="text-aegis-gold font-mono">CASE-{Math.floor(Math.random()*9000)+1000}</span></p>
         {notifiedHospitalId ? (
             <div className="inline-block mt-3 px-4 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-800 text-sm font-bold">
                 ✓ Routed to {hospitals.find(h => h.id === notifiedHospitalId)?.name}
             </div>
         ) : (
             <div className="inline-block mt-3 px-4 py-1 bg-yellow-900/30 text-yellow-400 rounded-full border border-yellow-800 text-sm font-bold">
                 📡 Broadcast to Network
             </div>
         )}
      </div>

      <Card className="bg-slate-800 border-slate-700 shadow-xl">
         <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Your AI Summary (SBAR)</h3>
         <div className="space-y-4 text-slate-300">
            <p><strong className="text-slate-500 uppercase text-xs block">Situation</strong> {result?.sbar.situation}</p>
            <p><strong className="text-slate-500 uppercase text-xs block">Assessment</strong> {result?.sbar.assessment}</p>
            <p><strong className="text-slate-500 uppercase text-xs block">Action</strong> {result?.sbar.recommendation}</p>
         </div>
      </Card>

      <div className="mt-8 text-center">
         <p className="text-sm text-slate-500 mb-4">Please wait for a nurse to review your case.</p>
         <Button variant="ghost" onClick={onComplete} className="touch-manipulation p-4">Return Home</Button>
      </div>
    </div>
  );
};