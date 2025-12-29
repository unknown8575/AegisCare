import React, { useState, useEffect } from 'react';
import { User, HospitalUserProfile, OperationEntry, TriageCase, MedicineEntry, HospitalDietView, WeeklyPlan, HealthReport, Appointment } from '../../types';
import { getStaffProfile, updateStaffProfile, getOperations, addOperation, updateOperation, getMedicineRoutine, addMedicine, deleteMedicine, getCaseById, getHealthReport, getDietPlan, getAppointmentsForHospital, convertAppointmentToAdmission, getPatientCases } from '../../services/mockBackend';
import { Button, Input, Card, Badge, LoadingSpinner, HospitalCard } from '../../components/UI';
import { generateWeeklyDietPlan } from '../../services/geminiService';
import { ESI_COLORS } from '../../constants';

// --- SECTION 1: YOUR DATA (UPDATED) ---
export const SectionYourData: React.FC<{ user: User }> = ({ user }) => {
    const [profile, setProfile] = useState<HospitalUserProfile | null>(null);
    const [operations, setOperations] = useState<OperationEntry[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [showOpForm, setShowOpForm] = useState(false);
    
    // Profile Form State
    const [formData, setFormData] = useState<Partial<HospitalUserProfile>>({});
    
    // Op Form State
    const [newOp, setNewOp] = useState<Partial<OperationEntry>>({ priority: 'Elective', otNumber: 'OT-1' });
    const [editingOpId, setEditingOpId] = useState<string | null>(null);

    useEffect(() => {
        getStaffProfile(user.id).then(p => {
            setProfile(p);
            setFormData(p || {});
        });
        getOperations().then(setOperations);
    }, [user.id]);

    const handleSaveProfile = async () => {
        if (!profile) return;
        const updated = { ...profile, ...formData } as HospitalUserProfile;
        await updateStaffProfile(updated);
        setProfile(updated);
        setIsEditing(false);
    };

    const handleSaveOp = async () => {
        if (!newOp.patientName || !newOp.procedureName) return;

        if (editingOpId) {
            await updateOperation({
                ...newOp,
                id: editingOpId,
                status: newOp.status || 'Scheduled'
            } as OperationEntry);
        } else {
            await addOperation({
                patientId: newOp.patientId || 'unknown',
                patientName: newOp.patientName,
                procedureName: newOp.procedureName,
                scheduledAt: newOp.scheduledAt || '09:00',
                otNumber: newOp.otNumber || 'OT-1',
                priority: newOp.priority as any,
                notes: newOp.notes
            });
        }
        setOperations(await getOperations());
        setShowOpForm(false);
        setEditingOpId(null);
        setNewOp({ priority: 'Elective', otNumber: 'OT-1' });
    };

    const handleEditOpClick = (op: OperationEntry) => {
        setNewOp(op);
        setEditingOpId(op.id);
        setShowOpForm(true);
    };

    const handleCancelOp = () => {
        setShowOpForm(false);
        setEditingOpId(null);
        setNewOp({ priority: 'Elective', otNumber: 'OT-1' });
    }

    if (!profile) return <LoadingSpinner />;

    return (
        <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar animate-fade-in">
            <HospitalCard className="border-slate-600 bg-slate-900/50">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-white font-bold text-lg border-l-4 border-aegis-gold pl-3">Nurse/Doctor Personal Info</h3>
                    {!isEditing ? (
                        <Button variant="ghost" onClick={() => setIsEditing(true)} className="text-xs">Edit Profile</Button>
                    ) : (
                        <div className="flex gap-2">
                             <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-xs">Cancel</Button>
                             <Button onClick={handleSaveProfile} className="text-xs py-1 px-3">Save Profile</Button>
                        </div>
                    )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Name" variant="dark" value={isEditing ? formData.name : profile.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={!isEditing} />
                    <Input label="Phone No" variant="dark" value={isEditing ? formData.phone : profile.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled={!isEditing} />
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                    <div>
                         <label className="text-sm text-slate-400 block mb-1">Role</label>
                         <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white disabled:opacity-50" value={isEditing ? formData.role : profile.role} onChange={e => setFormData({...formData, role: e.target.value as any})} disabled={!isEditing}>
                             {['Doctor', 'Nurse', 'Surgeon', 'Resident', 'Intern', 'Admin'].map(r => <option key={r} value={r}>{r}</option>)}
                         </select>
                    </div>
                    <Input label="Address" variant="dark" value={isEditing ? formData.address : profile.address} onChange={e => setFormData({...formData, address: e.target.value})} disabled={!isEditing} />
                </div>
            </HospitalCard>

            <HospitalCard className="border-slate-600 bg-slate-900/50 flex-grow min-h-[400px]">
                 <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-2">
                         <span className="text-slate-400 text-sm font-bold uppercase">Today Duty Time:</span>
                         <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">{profile.dutyTime.start} - {profile.dutyTime.end}</span>
                     </div>
                     <Button variant="secondary" onClick={() => { setEditingOpId(null); setNewOp({ priority: 'Elective', otNumber: 'OT-1' }); setShowOpForm(true); }} className="text-xs">+ Add Operation</Button>
                 </div>

                 {showOpForm && (
                     <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4 animate-slide-in-up">
                         <h4 className="text-white font-bold text-sm mb-3">{editingOpId ? 'Edit Operation Details' : 'Schedule New Operation'}</h4>
                         <div className="grid grid-cols-2 gap-3 mb-3">
                             <Input variant="dark" placeholder="Patient Name" value={newOp.patientName || ''} onChange={e => setNewOp({...newOp, patientName: e.target.value})} className="mb-0" />
                             <Input variant="dark" placeholder="Procedure" value={newOp.procedureName || ''} onChange={e => setNewOp({...newOp, procedureName: e.target.value})} className="mb-0" />
                             <Input variant="dark" type="time" value={newOp.scheduledAt || ''} onChange={e => setNewOp({...newOp, scheduledAt: e.target.value})} className="mb-0" />
                             <select className="bg-slate-900 border border-slate-600 rounded text-white px-3" value={newOp.priority} onChange={e => setNewOp({...newOp, priority: e.target.value as any})}>
                                 <option value="Elective">Elective</option>
                                 <option value="Emergency">Emergency</option>
                             </select>
                             {/* Status Select for Edit Mode */}
                             {editingOpId && (
                                <select className="bg-slate-900 border border-slate-600 rounded text-white px-3 col-span-2" value={newOp.status} onChange={e => setNewOp({...newOp, status: e.target.value as any})}>
                                     <option value="Scheduled">Scheduled</option>
                                     <option value="In Progress">In Progress</option>
                                     <option value="Completed">Completed</option>
                                </select>
                             )}
                         </div>
                         <div className="flex justify-end gap-2">
                             <Button variant="ghost" onClick={handleCancelOp} className="text-xs">Cancel</Button>
                             <Button onClick={handleSaveOp} className="text-xs">{editingOpId ? 'Update Operation' : 'Schedule'}</Button>
                         </div>
                     </div>
                 )}

                 <div className="border border-slate-700 rounded-lg overflow-hidden">
                     <table className="w-full text-left text-sm text-slate-300">
                         <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                             <tr>
                                 <th className="p-3 border-r border-slate-700">Operations Lists</th>
                                 <th className="p-3">Status & Details</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-700">
                             {operations.length === 0 ? (
                                 <tr><td colSpan={2} className="p-4 text-center text-slate-500">No operations scheduled today.</td></tr>
                             ) : (
                                 operations.map(op => (
                                     <tr key={op.id} className="hover:bg-slate-800/50 group transition-colors">
                                         <td className="p-3 border-r border-slate-700 align-top w-1/3 relative">
                                             <div className="font-bold text-white">{op.procedureName}</div>
                                             <div className="text-xs text-slate-500 mt-1">Patient: {op.patientName}</div>
                                             <div className="text-aegis-gold font-mono text-xs mt-1 flex items-center gap-2">
                                                 <span>{op.scheduledAt}</span>
                                             </div>
                                         </td>
                                         <td className="p-3 align-top relative">
                                             <div className="flex justify-between items-start">
                                                 <div className="flex flex-col gap-2">
                                                     <div className="flex flex-wrap gap-2">
                                                         {/* Priority Pill */}
                                                         <Badge color={op.priority === 'Emergency' ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-blue-900/30 text-blue-400 border border-blue-800'}>
                                                             {op.priority}
                                                         </Badge>
                                                         
                                                         {/* OT Pill */}
                                                         <Badge color="bg-slate-800 text-slate-400 border border-slate-700">
                                                             {op.otNumber}
                                                         </Badge>

                                                         {/* Status Pill (New) */}
                                                         <Badge color={
                                                             op.status === 'Completed' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
                                                             op.status === 'In Progress' ? 'bg-amber-900/30 text-amber-400 border border-amber-800' :
                                                             'bg-slate-700/50 text-slate-300 border border-slate-600'
                                                         }>
                                                             {op.status}
                                                         </Badge>
                                                     </div>
                                                     {op.notes && <div className="text-xs text-slate-500 italic">"{op.notes}"</div>}
                                                 </div>
                                                 <button onClick={() => handleEditOpClick(op)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded">
                                                     ✎
                                                 </button>
                                             </div>
                                         </td>
                                     </tr>
                                 ))
                             )}
                         </tbody>
                     </table>
                 </div>
            </HospitalCard>
        </div>
    );
};

// --- SECTION 2: PATIENT REPORT (UPDATED TO FETCH REAL DB DATA) ---
export const SectionPatientReport: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [caseData, setCaseData] = useState<TriageCase | null>(null);
    const [fullReport, setFullReport] = useState<HealthReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!patientId) return;
        setIsLoading(true);
        // Step 1: Fetch the Case using the ID passed (which is actually a caseId)
        getCaseById(patientId, 'system').then(c => {
            setCaseData(c || null);
            // Step 2: Use the patientId found in the Case to fetch the Health Report
            if (c && c.patientId) {
                getHealthReport(c.patientId).then(report => {
                    setFullReport(report);
                    setIsLoading(false);
                });
            } else {
                setFullReport(null);
                setIsLoading(false);
            }
        });
    }, [patientId]);

    if (!patientId) return <div className="text-slate-500 text-center mt-20">Select a patient from the list to view report.</div>;
    if (isLoading) return <LoadingSpinner />;
    if (!caseData) return <div className="text-center text-slate-500 mt-20">Patient data not found.</div>;

    return (
        <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar animate-fade-in">
            {/* Header */}
            <HospitalCard className="border-slate-600 bg-slate-900/50 p-4">
                <div className="border-b border-slate-700 pb-3 mb-3">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Patient Doctor Name & ID</div>
                    <div className="flex justify-between items-baseline">
                         <span className="text-white font-bold text-lg">Dr. Anjali Gupta</span>
                         <span className="font-mono text-aegis-teal text-sm">ID: DOC-402</span>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                        <div className="text-xs text-slate-500 uppercase">Patient Name</div>
                        <div className="text-white font-bold">{caseData.patientAlias}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase">Age</div>
                        <div className="text-white">{caseData.ageRange.split('-')[0]}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase">Problem</div>
                        <div className="text-white truncate" title={caseData.chiefComplaint}>{caseData.chiefComplaint}</div>
                    </div>
                </div>
            </HospitalCard>

            {/* SHARED EMERGENCY CONTEXT (NEW: Visible even without full report) */}
            {caseData.sharedContext && (
               <HospitalCard className="border-green-800/50 bg-green-950/20">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-green-400 uppercase text-xs font-bold tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Incoming Emergency Context
                     </h3>
                     <span className="text-xs text-slate-400">Sync: {caseData.sharedContext.lastCheckin}</span>
                  </div>
                  <div className="space-y-4">
                      <div>
                         <p className="text-xs text-slate-500 uppercase">Patient Status Summary</p>
                         <p className="text-slate-300 text-sm leading-relaxed">{caseData.sharedContext.reportSummary}</p>
                      </div>
                      <div className="flex gap-6">
                         <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Recent Trend</p>
                            <Badge color={caseData.sharedContext.fitnessTrend === 'improving' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}>
                               {caseData.sharedContext.fitnessTrend.toUpperCase()}
                            </Badge>
                         </div>
                         <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Known Risks</p>
                            <div className="flex gap-2">
                               {caseData.sharedContext.risks.length > 0 ? (
                                   caseData.sharedContext.risks.map(r => <span key={r} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{r}</span>)
                               ) : <span className="text-xs text-slate-500">None flagged</span>}
                            </div>
                         </div>
                      </div>
                  </div>
               </HospitalCard>
            )}

            {/* Detailed Report */}
            <HospitalCard className="border-slate-600 bg-slate-900/50 flex-grow min-h-[500px]">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-white font-bold text-xl border-l-4 border-aegis-teal pl-3">Historical Health Report</h3>
                 </div>

                 {fullReport ? (
                     <div className="space-y-6">
                         <div className="grid grid-cols-3 gap-4">
                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                                 <div className="text-xs text-slate-500 uppercase mb-1">Blood Pressure</div>
                                 <div className="text-2xl text-white font-mono">{fullReport.vitals.bp || "N/A"}</div>
                             </div>
                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                                 <div className="text-xs text-slate-500 uppercase mb-1">Heart Rate</div>
                                 <div className="text-2xl text-white font-mono">{fullReport.vitals.heartRate || "N/A"}</div>
                             </div>
                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                                 <div className="text-xs text-slate-500 uppercase mb-1">BMI</div>
                                 <div className="text-2xl text-white font-mono">{fullReport.vitals.bmi || "N/A"}</div>
                             </div>
                         </div>

                         <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                             <h4 className="text-aegis-gold text-xs font-bold uppercase mb-2">AI Doctor's Note</h4>
                             <p className="text-slate-300 italic text-sm leading-relaxed">"{fullReport.doctorsNote}"</p>
                         </div>

                         <div>
                             <h4 className="text-slate-400 text-xs font-bold uppercase mb-3">Risk Radar</h4>
                             <div className="flex gap-2 flex-wrap">
                                 {fullReport.riskRadar.map((risk, i) => (
                                     <span key={i} className={`px-3 py-1 border rounded-full text-xs font-bold ${risk.status === 'High Risk' ? 'bg-red-900/20 text-red-400 border-red-900' : 'bg-yellow-900/20 text-yellow-400 border-yellow-900'}`}>
                                         {risk.category}
                                     </span>
                                 ))}
                             </div>
                         </div>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center justify-center h-48 text-slate-500 border-t border-slate-700/50 mt-4">
                         <p>No historical Digital Twin report found.</p>
                         <p className="text-xs mt-2">Patient has not completed the full health survey yet.</p>
                     </div>
                 )}
            </HospitalCard>
        </div>
    );
};

// --- SECTION: PATIENT HISTORY (NEW) ---
export const SectionPatientHistory: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [history, setHistory] = useState<TriageCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

    useEffect(() => {
        if (!patientId) return;
        setIsLoading(true);
        // Resolve caseId to patientId first
        getCaseById(patientId, 'system').then(c => {
            if (c && c.patientId) {
                getPatientCases(c.patientId).then(cases => {
                    setHistory(cases);
                    setIsLoading(false);
                });
            } else {
                setHistory([]);
                setIsLoading(false);
            }
        });
    }, [patientId]);

    if (!patientId) return <div className="text-slate-500 text-center mt-20">Select a patient to view historical visits.</div>;
    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar animate-fade-in">
            <h3 className="text-white font-bold text-xl border-l-4 border-aegis-gold pl-3 mb-6">Historical Triage Records</h3>
            
            {history.length === 0 ? (
                <div className="text-slate-500 text-center py-20 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                    No past visits found for this patient alias.
                </div>
            ) : (
                <div className="space-y-4 pb-20">
                    {history.map((record) => (
                        <div 
                            key={record.id} 
                            className={`bg-slate-900 border transition-all rounded-xl overflow-hidden ${expandedCaseId === record.id ? 'border-aegis-teal' : 'border-slate-800'}`}
                        >
                            <div 
                                onClick={() => setExpandedCaseId(expandedCaseId === record.id ? null : record.id)}
                                className="p-4 cursor-pointer hover:bg-slate-800 flex justify-between items-center"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${ESI_COLORS[record.esiSuggestion || 5]}`}>
                                        {record.esiSuggestion}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-sm">
                                            {new Date(record.timestamp).toLocaleDateString()} @ {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate max-w-md">{record.chiefComplaint}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge color="bg-slate-800 text-slate-400 border border-slate-700">ID: {record.id.split('_')[1]}</Badge>
                                    <span className="text-slate-600">{expandedCaseId === record.id ? '▲' : '▼'}</span>
                                </div>
                            </div>
                            
                            {expandedCaseId === record.id && (
                                <div className="p-4 bg-slate-950 border-t border-slate-800 animate-slide-in-up">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Chief Complaint</h4>
                                                <p className="text-slate-300 text-sm">{record.chiefComplaint}</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div>
                                                    <h4 className="text-xs text-slate-500 font-bold uppercase mb-1">Pain Score</h4>
                                                    <div className="text-aegis-gold font-mono font-bold">{record.painScore}/10</div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs text-slate-500 font-bold uppercase mb-1">Status</h4>
                                                    <Badge color="bg-slate-800 text-slate-400">{record.status}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                            <h4 className="text-aegis-teal text-[10px] font-bold uppercase mb-2">Historical SBAR Assessment</h4>
                                            <div className="text-[11px] text-slate-400 leading-relaxed italic space-y-2">
                                                <p><span className="text-slate-600 font-bold">S:</span> {record.sbar?.situation || 'N/A'}</p>
                                                <p><span className="text-slate-600 font-bold">B:</span> {record.sbar?.background || 'N/A'}</p>
                                                <p><span className="text-slate-600 font-bold">A:</span> {record.sbar?.assessment || 'N/A'}</p>
                                                <p><span className="text-slate-600 font-bold">R:</span> {record.sbar?.recommendation || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- SECTION 3: MEDICINE (Unchanged) ---
export const SectionMedicine: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [meds, setMeds] = useState<MedicineEntry[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newMed, setNewMed] = useState<Partial<MedicineEntry>>({ frequency: 'Daily', route: 'Oral' });
    
    useEffect(() => {
        if (patientId) getMedicineRoutine(patientId).then(setMeds);
        else setMeds([]);
    }, [patientId]);

    const handleAdd = async () => {
        if (!newMed.name || !newMed.time || !patientId) return;
        await addMedicine({
            patientId,
            time: newMed.time,
            name: newMed.name,
            dose: newMed.dose || 'N/A',
            route: newMed.route as any,
            frequency: newMed.frequency as any,
            notes: newMed.notes
        });
        setMeds(await getMedicineRoutine(patientId));
        setShowAdd(false);
        setNewMed({ frequency: 'Daily', route: 'Oral' });
    };

    const handleDelete = async (id: string) => {
        await deleteMedicine(id);
        setMeds(await getMedicineRoutine(patientId));
    };

    if (!patientId) return <div className="text-slate-500 text-center mt-20">Select a patient to manage medicine.</div>;

    return (
        <div className="h-full animate-fade-in">
             <HospitalCard className="border-slate-600 bg-slate-900/50 h-full flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-white font-bold text-xl">Patient Medicine Routine</h3>
                     <Button variant="secondary" onClick={() => setShowAdd(true)} className="text-xs">+ Add Medicine</Button>
                 </div>
                 {showAdd && (
                     <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4 animate-slide-in-up">
                         <div className="grid grid-cols-2 gap-3 mb-3">
                             <Input variant="dark" type="time" label="Time" value={newMed.time || ''} onChange={e => setNewMed({...newMed, time: e.target.value})} className="mb-0" />
                             <Input variant="dark" label="Medicine Name" value={newMed.name || ''} onChange={e => setNewMed({...newMed, name: e.target.value})} className="mb-0" />
                             <Input variant="dark" label="Dose" value={newMed.dose || ''} onChange={e => setNewMed({...newMed, dose: e.target.value})} className="mb-0" />
                             <select className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white" value={newMed.route} onChange={e => setNewMed({...newMed, route: e.target.value as any})}>
                                 {['Oral', 'IV', 'IM', 'SC', 'Topical'].map(o => <option key={o} value={o}>{o}</option>)}
                             </select>
                         </div>
                         <div className="flex justify-end gap-2">
                             <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-xs">Cancel</Button>
                             <Button onClick={handleAdd} className="text-xs">Save Routine</Button>
                         </div>
                     </div>
                 )}
                 <div className="border border-slate-700 rounded-lg overflow-hidden flex-grow relative">
                     <table className="w-full text-left text-sm text-slate-300">
                         <thead className="bg-slate-800 text-slate-400 uppercase text-xs sticky top-0">
                             <tr><th className="p-3">Time</th><th className="p-3">Medicine</th><th className="p-3"></th></tr>
                         </thead>
                         <tbody className="divide-y divide-slate-700 overflow-y-auto">
                             {meds.map(med => (
                                 <tr key={med.id} className="hover:bg-slate-800/50">
                                     <td className="p-4 font-mono text-aegis-gold">{med.time}</td>
                                     <td className="p-4"><div className="font-bold text-white">{med.name}</div><div className="text-xs text-slate-400">{med.dose} • {med.route}</div></td>
                                     <td className="p-4"><button onClick={() => handleDelete(med.id)} className="text-red-500">✕</button></td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </HospitalCard>
        </div>
    );
};

// --- SECTION 4: DIET (UPDATED TO FETCH REAL DB DATA) ---
export const SectionDiet: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);
    const [dayIndex, setDayIndex] = useState(0);

    useEffect(() => {
        if (!patientId) return;
        // Fetch case to get the user ID, then fetch their diet plan
        getCaseById(patientId, 'system').then(c => {
            if (c) {
                getDietPlan(c.patientId).then(p => {
                    if (p) setPlan(p);
                    else {
                        // Fallback: Generate one if not exists (simulation)
                        generateWeeklyDietPlan({ mealsPerDay: 3, cuisine: 'North Indian', type: 'Veg', allergies: [] }).then(setPlan);
                    }
                });
            }
        });
    }, [patientId]);

    if (!patientId) return <div className="text-slate-500 text-center mt-20">Select a patient to view diet plan.</div>;
    if (!plan) return <LoadingSpinner />;

    return (
        <div className="h-full animate-fade-in overflow-y-auto pr-2 custom-scrollbar">
             <HospitalCard className="border-slate-600 bg-slate-900/50 min-h-full">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-white font-bold text-xl">Patient Diet Plan</h3>
                     <div className="flex items-center gap-2">
                        <Button variant="ghost" disabled={dayIndex===0} onClick={() => setDayIndex(d => d-1)} className="text-xs">← Prev</Button>
                        <span className="text-slate-400 text-sm font-mono w-20 text-center">Day {dayIndex + 1}</span>
                        <Button variant="ghost" disabled={dayIndex===6} onClick={() => setDayIndex(d => d+1)} className="text-xs">Next →</Button>
                     </div>
                 </div>

                 <div className="space-y-4">
                     {plan.days[dayIndex].meals.map((meal, idx) => (
                         <div key={idx} className="flex flex-col md:flex-row gap-4 border-b border-slate-800 pb-4 last:border-0">
                             <div className="md:w-32 pt-2">
                                 <div className="text-white font-bold text-lg">{meal.type}</div>
                                 <div className="text-xs text-slate-500 mt-1">{meal.timeSuggestion}</div>
                             </div>
                             <div className="flex-grow bg-slate-950 border border-slate-700 rounded-xl p-4 flex justify-between items-center">
                                 <div>
                                     <div className="text-aegis-teal font-bold text-lg mb-1">{meal.options[0].name}</div>
                                     <div className="text-xs text-slate-400">{meal.options[0].shortReason}</div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </HospitalCard>
        </div>
    );
};

// --- SECTION 5: APPOINTMENTS & CONSULTATION (UPDATED) ---
const CONSULT_QUESTIONS = [
    "Could you describe your chief complaint in more detail?",
    "When did these symptoms first start?",
    "On a scale of 1-10, how severe is your pain or discomfort right now?",
    "Do you have any existing medical conditions (e.g., Diabetes, Hypertension)?",
    "Are you currently taking any medications?",
    "Do you have any known allergies?",
    "Have you had any recent surgeries or hospitalizations?",
    "Has anyone in your family experienced similar symptoms recently?",
    "Have you noticed any changes in your appetite or sleep patterns?",
    "Are you experiencing any shortness of breath or dizziness?"
];

export const SectionAppointments: React.FC<{ user: User }> = ({ user }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(false);

    // Twin Modal
    const [showTwinModal, setShowTwinModal] = useState(false);
    const [twinReport, setTwinReport] = useState<HealthReport | null>(null);
    const [loadingTwin, setLoadingTwin] = useState(false);

    // Consultation Mode
    const [consultMode, setConsultMode] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<{[key: number]: string}>({});
    const [consultNotes, setConsultNotes] = useState("");
    const [admitDecisionStep, setAdmitDecisionStep] = useState(false);
    const [admitProcessing, setAdmitProcessing] = useState(false);

    useEffect(() => {
        refreshAppointments();
    }, [user.id]);

    const refreshAppointments = () => {
        getAppointmentsForHospital(user.id).then(setAppointments);
    };

    const openTwin = async () => {
        if (!selectedApt) return;
        setShowTwinModal(true);
        setLoadingTwin(true);
        // Direct fetch by patientId (permission granted via appointment)
        const report = await getHealthReport(selectedApt.patientId);
        setTwinReport(report);
        setLoadingTwin(false);
    };

    const startConsult = () => {
        setConsultMode(true);
        setCurrentQuestion(0);
        setAdmitDecisionStep(false);
        setAnswers({});
    };

    const handleAnswer = (text: string) => {
        setAnswers(prev => ({...prev, [currentQuestion]: text}));
    };

    const nextQuestion = () => {
        if (currentQuestion < CONSULT_QUESTIONS.length - 1) {
            setCurrentQuestion(curr => curr + 1);
        } else {
            setAdmitDecisionStep(true);
        }
    };

    const prevQuestion = () => {
        if (admitDecisionStep) {
            setAdmitDecisionStep(false);
        } else if (currentQuestion > 0) {
            setCurrentQuestion(curr => curr - 1);
        }
    };

    const handleAdmit = async () => {
        if (!selectedApt) return;
        setAdmitProcessing(true);
        try {
            await convertAppointmentToAdmission(selectedApt.id, consultNotes);
            alert(`Patient ${selectedApt.patientName} has been admitted successfully.`);
            setConsultMode(false);
            setSelectedApt(null);
            refreshAppointments();
        } catch (e: any) {
            alert("Error admitting patient: " + e.message);
        }
        setAdmitProcessing(false);
    };

    const handleDischarge = async () => {
        alert("Patient discharged. Appointment marked complete.");
        setConsultMode(false);
        setSelectedApt(null);
        refreshAppointments();
    };

    // Calculate progress for consultation
    const progress = Math.min(((Object.keys(answers).length) / 7) * 100, 100);
    const canAdmit = Object.keys(answers).length >= 7;

    return (
        <div className="h-full flex gap-6 animate-fade-in relative">
             
             {/* DIGITAL TWIN MODAL */}
             {showTwinModal && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-8 animate-fade-in">
                     <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                         <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950">
                             <div>
                                 <h2 className="text-2xl font-bold text-white">Full Digital Twin</h2>
                                 <p className="text-slate-400 text-sm">Patient: {selectedApt?.patientName}</p>
                             </div>
                             <button onClick={() => setShowTwinModal(false)} className="text-slate-500 hover:text-white text-2xl">✕</button>
                         </div>
                         <div className="flex-grow overflow-y-auto p-8 bg-slate-900 custom-scrollbar">
                             {loadingTwin ? <LoadingSpinner size="lg" className="mx-auto mt-20" /> : twinReport ? (
                                 <div className="space-y-8">
                                     <div className="grid grid-cols-3 gap-6">
                                         <Card className="bg-slate-800 border-slate-700 text-center">
                                             <div className="text-xs text-slate-500 uppercase font-bold">Wellness Score</div>
                                             <div className="text-4xl text-aegis-teal font-bold my-2">{twinReport.wellnessScore}</div>
                                             <div className="text-sm text-slate-300">{twinReport.wellnessStatus}</div>
                                         </Card>
                                         <div className="col-span-2 grid grid-cols-2 gap-4">
                                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                 <div className="text-xs text-slate-500 uppercase mb-1">Blood Pressure</div>
                                                 <div className="text-2xl text-white font-mono">{twinReport.vitals.bp || "N/A"}</div>
                                             </div>
                                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                 <div className="text-xs text-slate-500 uppercase mb-1">Heart Rate</div>
                                                 <div className="text-2xl text-white font-mono">{twinReport.vitals.heartRate || "N/A"}</div>
                                             </div>
                                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                 <div className="text-xs text-slate-500 uppercase mb-1">BMI</div>
                                                 <div className="text-2xl text-white font-mono">{twinReport.vitals.bmi || "N/A"}</div>
                                             </div>
                                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                 <div className="text-xs text-slate-500 uppercase mb-1">Stress Level</div>
                                                 <div className="text-2xl text-white font-mono">{twinReport.vitals.stressLevel}/10</div>
                                             </div>
                                         </div>
                                     </div>
                                     
                                     <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                                         <h3 className="text-aegis-gold font-bold uppercase text-sm mb-3">AI Clinical Summary</h3>
                                         <p className="text-slate-300 leading-relaxed italic">"{twinReport.doctorsNote}"</p>
                                     </div>

                                     <div>
                                         <h3 className="text-white font-bold uppercase text-sm mb-4">Risk Factors</h3>
                                         <div className="grid grid-cols-2 gap-4">
                                             {twinReport.riskRadar.map((r, i) => (
                                                 <div key={i} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                                     <div className="flex justify-between mb-2">
                                                         <span className="font-bold text-slate-200">{r.category}</span>
                                                         <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'High Risk' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>{r.status}</span>
                                                     </div>
                                                     <p className="text-xs text-slate-400">{r.reasoning}</p>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="text-center text-slate-500 mt-20">
                                     <p>No detailed digital twin data found for this patient.</p>
                                     <p className="text-xs mt-2">Patient may not have completed the health survey.</p>
                                 </div>
                             )}
                         </div>
                         <div className="p-4 border-t border-slate-800 bg-slate-950 text-right">
                             <Button onClick={() => setShowTwinModal(false)}>Close Report</Button>
                         </div>
                     </div>
                 </div>
             )}

             {/* CONSULTATION OVERLAY */}
             {consultMode && (
                 <div className="absolute inset-0 bg-slate-900 z-10 rounded-2xl flex flex-col animate-fade-in">
                     <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                         <div>
                             <h3 className="text-xl font-bold text-white">Clinical Consultation</h3>
                             <p className="text-slate-400 text-sm">Patient: {selectedApt?.patientName}</p>
                         </div>
                         <div className="flex items-center gap-4">
                             <div className="text-right">
                                 <div className="text-xs text-slate-500 uppercase">Progress</div>
                                 <div className="text-aegis-teal font-mono font-bold">{Object.keys(answers).length} / 7 Min</div>
                             </div>
                             <Button variant="ghost" onClick={() => setConsultMode(false)}>Cancel</Button>
                         </div>
                     </div>

                     <div className="flex-grow p-8 overflow-y-auto flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
                         {!admitDecisionStep ? (
                             <div className="w-full space-y-8 animate-slide-in-up">
                                 <div className="flex justify-between text-slate-500 text-xs font-bold uppercase tracking-widest">
                                     <span>Question {currentQuestion + 1} of {CONSULT_QUESTIONS.length}</span>
                                     <span>{Math.round((currentQuestion / CONSULT_QUESTIONS.length) * 100)}% Complete</span>
                                 </div>
                                 
                                 <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                                     {CONSULT_QUESTIONS[currentQuestion]}
                                 </h2>

                                 <textarea 
                                     className="w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-lg text-white focus:border-aegis-teal outline-none min-h-[150px] shadow-inner"
                                     placeholder="Record patient response..."
                                     value={answers[currentQuestion] || ''}
                                     onChange={(e) => handleAnswer(e.target.value)}
                                     autoFocus
                                 />

                                 <div className="flex justify-between items-center pt-4">
                                     <Button variant="secondary" onClick={prevQuestion} disabled={currentQuestion === 0}>Previous</Button>
                                     <div className="flex gap-4">
                                         {canAdmit && (
                                             <Button variant="ghost" onClick={() => setAdmitDecisionStep(true)} className="text-aegis-gold">Skip to Decision →</Button>
                                         )}
                                         <Button onClick={nextQuestion} disabled={!answers[currentQuestion]}>
                                             {currentQuestion === CONSULT_QUESTIONS.length - 1 ? 'Finish & Review' : 'Next Question'}
                                         </Button>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div className="w-full max-w-xl space-y-8 animate-slide-in-up text-center">
                                 <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto border-4 border-slate-700 mb-6">
                                     <span className="text-3xl">📋</span>
                                 </div>
                                 
                                 <h2 className="text-3xl font-bold text-white">Consultation Complete</h2>
                                 <p className="text-slate-400">Based on the responses, please select an action.</p>

                                 <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-left">
                                     <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Final Clinical Notes</label>
                                     <textarea 
                                         className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white h-24"
                                         placeholder="Add summary notes for admission/discharge..."
                                         value={consultNotes}
                                         onChange={e => setConsultNotes(e.target.value)}
                                     />
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                     <div onClick={handleDischarge} className="cursor-pointer group p-6 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800 transition-all">
                                         <div className="text-slate-400 group-hover:text-white font-bold text-lg mb-1">Discharge</div>
                                         <p className="text-xs text-slate-500">Mark appointment as completed. No admission.</p>
                                     </div>
                                     
                                     <div className="cursor-pointer group p-6 rounded-xl border border-aegis-teal/30 hover:border-aegis-teal bg-aegis-teal/10 hover:bg-aegis-teal/20 transition-all relative overflow-hidden">
                                         <div className="absolute top-2 right-2">
                                             {/* Simulated AI Rec */}
                                             <span className="bg-aegis-teal text-white text-[10px] px-2 py-0.5 rounded font-bold">AI RECOMMENDED</span>
                                         </div>
                                         <h3 className="text-white font-bold text-lg mb-1">Admit Patient</h3>
                                         <p className="text-xs text-aegis-teal/80 mb-4">Create inpatient case & generate diet plan.</p>
                                         
                                         {/* 50-50 Logic UI */}
                                         <div className="flex flex-col gap-2 mt-2">
                                             <Button onClick={handleAdmit} isLoading={admitProcessing} className="w-full text-sm py-2">Admit Immediately</Button>
                                             <button onClick={() => alert("Ask patient: 'Given your symptoms are borderline, would you prefer to stay for observation?'")} className="text-xs text-slate-400 hover:text-white underline decoration-dashed">
                                                 50/50 Chance? Ask Patient
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <button onClick={() => setAdmitDecisionStep(false)} className="text-slate-500 hover:text-white text-sm">← Back to Questions</button>
                             </div>
                         )}
                     </div>
                 </div>
             )}

             {/* List */}
             <div className="w-1/2 overflow-y-auto custom-scrollbar pr-2">
                 <HospitalCard className="border-slate-600 bg-slate-900/50 min-h-full">
                     <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                         Today's Appointments
                         <Badge color="bg-aegis-teal text-white">{appointments.length}</Badge>
                     </h3>

                     <div className="space-y-4">
                         {appointments.length === 0 ? (
                             <p className="text-slate-500 text-center py-10">No upcoming appointments.</p>
                         ) : (
                             appointments.map(apt => (
                                 <div 
                                    key={apt.id} 
                                    onClick={() => !apt.status.includes('COMPLETED') && setSelectedApt(apt)}
                                    className={`p-4 rounded-xl border transition-all ${apt.status === 'COMPLETED' ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800' : 'cursor-pointer'} ${selectedApt?.id === apt.id ? 'bg-slate-800 border-aegis-teal shadow-lg' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}
                                 >
                                     <div className="flex justify-between items-start mb-2">
                                         <div>
                                             <div className="text-aegis-gold font-mono text-xs font-bold mb-1">{apt.time}</div>
                                             <h4 className="text-white font-bold text-lg flex items-center gap-2">
                                                 {apt.patientName}
                                                 {apt.status === 'COMPLETED' && <span className="text-[10px] bg-green-900 text-green-400 px-2 rounded border border-green-800">DONE</span>}
                                             </h4>
                                         </div>
                                         <Badge color={apt.visitType === 'Emergency' ? 'bg-red-900 text-red-300' : 'bg-slate-700 text-slate-300'}>
                                             {apt.visitType}
                                         </Badge>
                                     </div>
                                     <p className="text-sm text-slate-400 truncate">{apt.reason}</p>
                                     <div className="mt-3 flex gap-2">
                                        {apt.sharedContext.risks.map(r => <span key={r} className="text-[10px] bg-red-900/20 text-red-400 px-2 py-0.5 rounded border border-red-900/50">{r}</span>)}
                                     </div>
                                 </div>
                             ))
                         )}
                     </div>
                 </HospitalCard>
             </div>

             {/* Detail Panel */}
             <div className="w-1/2">
                 {selectedApt ? (
                     <HospitalCard className="border-slate-600 bg-slate-900/80 min-h-full flex flex-col animate-fade-in relative overflow-hidden">
                         {/* Background Pattern */}
                         <div className="absolute top-0 right-0 w-64 h-64 bg-aegis-teal/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                         <div className="border-b border-slate-700 pb-4 mb-6 relative z-10">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <h3 className="text-3xl font-bold text-white mb-1">{selectedApt.patientName}</h3>
                                     <p className="text-slate-400 text-sm flex items-center gap-2">
                                         <span className="w-2 h-2 rounded-full bg-aegis-gold"></span>
                                         Reason: {selectedApt.reason}
                                     </p>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-2xl font-mono text-white tracking-tight">{selectedApt.time}</div>
                                     <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">{selectedApt.date}</div>
                                 </div>
                             </div>
                         </div>

                         <div className="flex-grow space-y-8 relative z-10">
                             {/* Shared Health Snapshot */}
                             <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 shadow-inner">
                                 <div className="flex justify-between items-center mb-4">
                                     <h4 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
                                         <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                         Synced Health Context
                                     </h4>
                                     <span className="text-[10px] text-slate-600">Updated: {selectedApt.sharedContext.lastCheckin}</span>
                                 </div>
                                 
                                 <div className="space-y-4">
                                     <div>
                                         <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-slate-700 pl-3">
                                             "{selectedApt.sharedContext.reportSummary}"
                                         </p>
                                     </div>
                                     <div className="flex gap-4">
                                         <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
                                            <p className="text-[10px] text-slate-500 uppercase mb-1">Fitness Trend</p>
                                            <span className={`text-sm font-bold capitalize ${selectedApt.sharedContext.fitnessTrend === 'improving' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {selectedApt.sharedContext.fitnessTrend} ↗
                                            </span>
                                         </div>
                                         <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800 flex-grow">
                                            <p className="text-[10px] text-slate-500 uppercase mb-1">Active Flags</p>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedApt.sharedContext.risks.length > 0 ? (
                                                    selectedApt.sharedContext.risks.map(r => <span key={r} className="text-[10px] bg-red-500/10 text-red-400 px-1.5 rounded">{r}</span>)
                                                ) : <span className="text-[10px] text-slate-500">None</span>}
                                            </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Action Area */}
                             <div className="space-y-3">
                                 <div className="grid grid-cols-2 gap-3">
                                     <Button onClick={openTwin} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200">
                                         Open Full Digital Twin
                                     </Button>
                                     <Button onClick={startConsult} className="bg-aegis-teal text-white shadow-lg shadow-aegis-teal/20">
                                         Start Consult
                                     </Button>
                                 </div>
                                 <p className="text-center text-[10px] text-slate-500">
                                     Starting consult will open the triage questionnaire.
                                 </p>
                             </div>
                         </div>
                     </HospitalCard>
                 ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-slate-800 rounded-xl border-dashed bg-slate-900/20">
                         <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                             <span className="text-2xl">📅</span>
                         </div>
                         <p>Select an appointment to view details</p>
                     </div>
                 )}
             </div>
        </div>
    );
};
