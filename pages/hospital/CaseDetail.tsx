import React, { useEffect, useState } from 'react';
import { User, TriageCase, CaseStatus } from '../../types';
import { getCaseById, updateCaseStatus } from '../../services/mockBackend';
import { HospitalCard, Button, Badge, LoadingSpinner } from '../../components/UI';
import { ESI_COLORS, ESI_DESCRIPTIONS } from '../../constants';

interface Props {
  user: User;
  caseId: string;
  onBack: () => void;
}

export const CaseDetail: React.FC<Props> = ({ user, caseId, onBack }) => {
  const [data, setData] = useState<TriageCase | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'CLINICAL' | 'HISTORY'>('CLINICAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getCaseById(caseId, user.id).then(c => {
        setData(c);
        setIsLoading(false);
    });
  }, [caseId, user.id]);

  if (isLoading || !data) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 gap-4">
              <LoadingSpinner size="lg" />
              <p>Retrieving protected case data...</p>
          </div>
      );
  }

  const handleStatus = async (newStatus: CaseStatus) => {
    setIsUpdating(true);
    await updateCaseStatus(caseId, newStatus, user.id);
    setData(prev => prev ? {...prev, status: newStatus} : undefined);
    setIsUpdating(false);
  };

  return (
    <div className="animate-slide-in-right text-slate-200 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="text-slate-400 hover:text-white">
          ← Back to Board
        </Button>
        <div className="flex-grow">
           <h1 className="text-2xl font-bold text-white font-mono tracking-tight">{data.patientAlias}</h1>
           <span className="text-xs text-slate-500">Admitted: {new Date(data.timestamp).toLocaleString()}</span>
        </div>
        <div className="flex gap-3">
           <Button 
                variant="danger" 
                onClick={() => handleStatus(CaseStatus.DISPATCHED)} 
                disabled={data.status === CaseStatus.DISPATCHED || isUpdating}
                isLoading={isUpdating && data.status !== CaseStatus.DISPATCHED}
           >
              {data.status === CaseStatus.DISPATCHED ? 'Dispatched' : 'Approve Dispatch'}
           </Button>
           <Button 
                variant="secondary" 
                onClick={() => handleStatus(CaseStatus.CLOSED)} 
                disabled={data.status === CaseStatus.CLOSED || isUpdating}
                isLoading={isUpdating && data.status !== CaseStatus.CLOSED}
           >
              Archive Case
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: VISUALS & VITALS */}
        <div className="space-y-6">
           <HospitalCard className="p-0 overflow-hidden border-aegis-teal/50">
              <div className="bg-slate-900 p-3 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="text-sm font-bold text-white">Visual Analysis</h3>
                 <Badge color="bg-aegis-gold/20 text-aegis-gold">Gemini Vision</Badge>
              </div>
              <div className="relative aspect-video bg-black">
                 {data.visionData ? (
                   <>
                     <img src={data.visionData.imageUrl || "https://placehold.co/400x300"} className="w-full h-full object-cover opacity-80" />
                     {/* Render Bounding Box */}
                     {data.visionData.boundingBox && (
                       <div 
                         className="absolute border-2 border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                         style={{
                           left: `${data.visionData.boundingBox.x}%`,
                           top: `${data.visionData.boundingBox.y}%`,
                           width: `${data.visionData.boundingBox.w}%`,
                           height: `${data.visionData.boundingBox.h}%`,
                         }}
                       >
                         <div className="absolute -bottom-6 left-0 flex gap-1">
                            {data.visionData.tags.map(t => <span key={t} className="bg-red-600 text-white text-[10px] px-1 font-bold">{t}</span>)}
                         </div>
                       </div>
                     )}
                   </>
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No Visual Data</div>
                 )}
              </div>
           </HospitalCard>

           <HospitalCard>
              <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-4">Triage Score</h3>
              <div className="flex items-center gap-4">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold border-4 ${ESI_COLORS[data.esiSuggestion || 5]}`}>
                   {data.esiSuggestion}
                 </div>
                 <div>
                    <p className="text-white font-bold">{ESI_DESCRIPTIONS[data.esiSuggestion || 5].split('-')[0]}</p>
                    <p className="text-xs text-slate-400 mt-1">{data.esiReasoning}</p>
                 </div>
              </div>
           </HospitalCard>

           <HospitalCard>
              <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-4">ECG Telemetry</h3>
              {data.visionData?.tags.some(t => t.includes('ECG')) ? (
                 <div className="bg-black rounded border border-slate-800 relative h-28 overflow-hidden flex items-center justify-center">
                    {/* Grid background */}
                    <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)', backgroundSize: '12px 12px'}}></div>
                    
                    {/* Placeholder ECG Path using SVG */}
                    <svg className="w-full h-full text-green-500 drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]" viewBox="0 0 400 100" preserveAspectRatio="none">
                       <path d="M0,50 L20,50 L25,40 L30,60 L35,50 L50,50 L60,50 L65,20 L70,90 L75,50 L90,50 L100,50 L120,50 L125,40 L130,60 L135,50 L150,50 L160,50 L165,20 L170,90 L175,50 L190,50 L200,50 L220,50 L225,40 L230,60 L235,50 L250,50 L260,50 L265,20 L270,90 L275,50 L290,50 L300,50 L320,50 L325,40 L330,60 L335,50 L350,50 L360,50 L365,20 L370,90 L375,50 L390,50 L400,50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                       <span className="text-[10px] text-green-500 font-mono tracking-widest">LIVE</span>
                    </div>
                 </div>
              ) : (
                 <div className="text-center py-8 border border-slate-700 rounded bg-slate-900/50">
                    <p className="text-slate-500 text-sm">No ECG data available</p>
                    <p className="text-[10px] text-slate-600 mt-1">Waiting for telemetry patch</p>
                 </div>
              )}
           </HospitalCard>
        </div>

        {/* CENTER/RIGHT: SBAR & HISTORY */}
        <div className="lg:col-span-2 space-y-6">
           {/* SHARED CONTEXT CARD (NEW) */}
           {data.sharedContext ? (
               <HospitalCard className="border-green-800/50 bg-green-950/20">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-green-400 uppercase text-xs font-bold tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Patient Consented Context
                     </h3>
                     <span className="text-xs text-slate-400">Sync: {data.sharedContext.lastCheckin}</span>
                  </div>
                  <div className="space-y-4">
                      <div>
                         <p className="text-xs text-slate-500 uppercase">Recent Report Summary</p>
                         <p className="text-slate-300 text-sm leading-relaxed">{data.sharedContext.reportSummary}</p>
                      </div>
                      <div className="flex gap-6">
                         <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Fitness Trend</p>
                            <Badge color={data.sharedContext.fitnessTrend === 'improving' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}>
                               {data.sharedContext.fitnessTrend.toUpperCase()}
                            </Badge>
                         </div>
                         <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Key Risks</p>
                            <div className="flex gap-2">
                               {data.sharedContext.risks.length > 0 ? (
                                   data.sharedContext.risks.map(r => <span key={r} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{r}</span>)
                               ) : <span className="text-xs text-slate-500">None flagged</span>}
                            </div>
                         </div>
                      </div>
                  </div>
               </HospitalCard>
           ) : (
               <HospitalCard className="border-slate-800 bg-slate-900/30 opacity-70">
                   <div className="flex justify-between items-center">
                     <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Patient Context</h3>
                     <span className="text-xs text-slate-600 italic">Privacy Restricted</span>
                   </div>
                   <p className="text-slate-500 text-sm mt-2">No historical data shared by patient for this visit.</p>
               </HospitalCard>
           )}

           {/* Tabs */}
           <div className="flex border-b border-slate-700 mb-4">
              <button 
                onClick={() => setActiveTab('CLINICAL')}
                className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'CLINICAL' ? 'border-aegis-teal text-aegis-teal' : 'border-transparent text-slate-500 hover:text-white'}`}
              >
                SBAR Report
              </button>
              <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'HISTORY' ? 'border-aegis-teal text-aegis-teal' : 'border-transparent text-slate-500 hover:text-white'}`}
              >
                History (Digital Memory)
              </button>
           </div>

           {activeTab === 'CLINICAL' ? (
             <div className="space-y-4">
               {/* Situation */}
               <HospitalCard className="border-l-4 border-l-blue-500">
                  <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Situation</h4>
                  <p className="text-white text-lg leading-relaxed">{data.sbar?.situation}</p>
               </HospitalCard>

               {/* Background */}
               <HospitalCard className="border-l-4 border-l-slate-500">
                  <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Background</h4>
                  <p className="text-slate-200 leading-relaxed">{data.sbar?.background}</p>
               </HospitalCard>

               {/* Assessment */}
               <HospitalCard className="border-l-4 border-l-amber-500">
                  <h4 className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-2">Assessment</h4>
                  <p className="text-slate-200 leading-relaxed">{data.sbar?.assessment}</p>
               </HospitalCard>

               {/* Recommendation */}
               <HospitalCard className="border-l-4 border-l-aegis-teal bg-aegis-teal/5">
                  <h4 className="text-aegis-teal font-bold text-xs uppercase tracking-widest mb-2">Recommendation</h4>
                  <p className="text-white font-medium text-lg leading-relaxed">{data.sbar?.recommendation}</p>
               </HospitalCard>
             </div>
           ) : (
             <HospitalCard>
                <div className="space-y-4">
                   {data.history && data.history.length > 0 ? (
                      data.history.map((item, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-slate-900/50 rounded border border-slate-700/50">
                           <span className="text-slate-500 font-mono text-sm">ARCHIVE</span>
                           <span className="text-slate-300 text-sm">{item}</span>
                        </div>
                      ))
                   ) : (
                      <p className="text-slate-500">No past history found.</p>
                   )}
                </div>
             </HospitalCard>
           )}
        </div>
      </div>
    </div>
  );
};