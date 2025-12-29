import React, { useState, useEffect } from 'react';
import { User, UserRole, HospitalSchema } from './types';
import { registerPatient, registerStaff, loginPatient, loginStaff, getHospitals } from './services/mockBackend';
import { Layout } from './components/Layout';
import { Button, Input } from './components/UI';
import { Footer, LegalPage } from './components/Footer';
import { LegalModal } from './components/LegalModals';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { HospitalDashboard } from './pages/hospital/HospitalDashboard';

type AuthMode = 'LANDING' | 'PATIENT_LOGIN' | 'PATIENT_REGISTER' | 'STAFF_LOGIN' | 'STAFF_REGISTER';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('LANDING');
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalSchema[]>([]);
  const [legalPage, setLegalPage] = useState<LegalPage | null>(null);

  // Registration Generated ID State
  const [generatedStaffId, setGeneratedStaffId] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      age: '',
      gender: 'Male',
      address: '',
      role: 'Doctor', // Staff only
      hospitalId: '', // Staff only
      staffIdInput: '', // Staff Login only
      password: '',
      confirmPassword: ''
  });

  useEffect(() => {
      setHospitals(getHospitals());
  }, []);

  const handleChange = (field: string, value: string) => {
      if (field === 'phone') {
          // Enforce numeric only and max 10 digits
          const numeric = value.replace(/[^0-9]/g, '');
          if (numeric.length <= 10) {
              setFormData(prev => ({ ...prev, [field]: numeric }));
          }
      } else {
          setFormData(prev => ({ ...prev, [field]: value }));
      }
  };

  const resetForm = () => {
      setFormData({
          name: '', email: '', phone: '', age: '', gender: 'Male', address: '', role: 'Doctor', hospitalId: '', staffIdInput: '', password: '', confirmPassword: ''
      });
  };

  const handleLogout = () => {
      setUser(null);
      setAuthMode('LANDING');
      resetForm();
  };

  // --- HANDLERS ---

  const handlePatientRegister = async () => {
      if (!formData.name || !formData.phone || !formData.email || !formData.age || !formData.address || !formData.password) {
          alert("All fields are mandatory.");
          return;
      }
      if (formData.phone.length !== 10) {
          alert("Phone number must be exactly 10 digits.");
          return;
      }
      if (formData.password !== formData.confirmPassword) {
          alert("Passwords do not match.");
          return;
      }
      setLoading(true);
      try {
          const u = await registerPatient({
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              age: formData.age,
              gender: formData.gender,
              address: formData.address,
              password: formData.password
          });
          setUser(u);
      } catch (e: any) {
          alert(e.message);
      }
      setLoading(false);
  };

  const handlePatientLogin = async () => {
      if (!formData.email || !formData.password) {
          alert("Please enter email and password.");
          return;
      }
      setLoading(true);
      try {
          const u = await loginPatient({ email: formData.email, password: formData.password });
          setUser(u);
      } catch (e: any) {
          alert(e.message);
      }
      setLoading(false);
  };

  const handleStaffRegister = async () => {
      if (!formData.name || !formData.phone || !formData.email || !formData.age || !formData.hospitalId || !formData.password) {
          alert("All fields are mandatory.");
          return;
      }
      if (formData.phone.length !== 10) {
          alert("Phone number must be exactly 10 digits.");
          return;
      }
      if (formData.password !== formData.confirmPassword) {
          alert("Passwords do not match.");
          return;
      }
      setLoading(true);
      try {
          const u = await registerStaff({
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              age: formData.age,
              gender: formData.gender,
              address: formData.address,
              role: formData.role,
              hospitalId: formData.hospitalId,
              password: formData.password
          });
          setGeneratedStaffId(u.id); // Show success screen with ID
      } catch (e: any) {
          alert(e.message);
      }
      setLoading(false);
  };

  const handleStaffLogin = async () => {
      if (!formData.email) {
          alert("Please enter your registered email address.");
          return;
      }
      if (!formData.password) {
          alert("Please enter your password.");
          return;
      }
      setLoading(true);
      try {
          // Pass email instead of staff ID
          const u = await loginStaff(formData.email, formData.password);
          setUser(u);
      } catch (e: any) {
          alert(e.message);
      }
      setLoading(false);
  };

  // --- VIEWS ---

  if (user) {
      if (user.role === UserRole.PATIENT) {
          return (
            <>
              <PatientDashboard 
                user={user} 
                onLogout={handleLogout} 
                onOpenLegal={setLegalPage} 
                onUpdateUser={setUser}
              />
              <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />
            </>
          );
      }
      if (user.role === UserRole.HOSPITAL_STAFF) {
          return (
              <Layout user={user} onLogout={handleLogout} onOpenLegal={setLegalPage}>
                  <HospitalDashboard user={user} />
                  <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />
              </Layout>
          );
      }
  }

  // --- AUTH PORTAL RENDER ---

  const Landing = () => (
      <div className="flex flex-col min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          <div className="flex-grow flex flex-col items-center justify-center p-4 gap-8 max-w-lg w-full mx-auto animate-fade-in relative z-10">
              <div className="text-center space-y-2">
                  <h1 className="text-5xl font-bold text-white tracking-tight">Aegis<span className="text-aegis-teal">Care</span></h1>
                  <p className="text-slate-400 text-sm uppercase tracking-widest">AI-Augmented Emergency Triage</p>
              </div>
              
              <div className="w-full space-y-4">
                  <button onClick={() => { resetForm(); setAuthMode('PATIENT_LOGIN'); }} className="w-full p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 hover:border-aegis-teal hover:bg-slate-800 transition-all text-left flex items-center gap-5 group shadow-lg hover:shadow-aegis-teal/20">
                      <div className="w-14 h-14 bg-teal-900/30 rounded-full flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform border border-teal-800/50">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-aegis-teal transition-colors">I am a Patient</h3>
                          <p className="text-slate-400 text-sm">Access health records & emergency tools</p>
                      </div>
                  </button>
                  
                  <button onClick={() => { resetForm(); setAuthMode('STAFF_LOGIN'); }} className="w-full p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 hover:border-aegis-gold hover:bg-slate-800 transition-all text-left flex items-center gap-5 group shadow-lg hover:shadow-aegis-gold/20">
                      <div className="w-14 h-14 bg-amber-900/20 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform border border-amber-800/50">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-aegis-gold transition-colors">Hospital Staff</h3>
                          <p className="text-slate-400 text-sm">Triage Dashboard & Patient Management</p>
                      </div>
                  </button>
              </div>
          </div>
          <Footer onOpenLegal={setLegalPage} />
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
        <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />
        
        {authMode === 'LANDING' && <Landing />}

        {/* BACKGROUND EFFECTS FOR AUTH PAGES */}
        {authMode !== 'LANDING' && (
            <>
                {/* Background Gradients */}
                <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 pointer-events-none ${authMode.includes('STAFF') ? 'bg-aegis-gold' : 'bg-aegis-teal'}`}></div>
                <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 pointer-events-none ${authMode.includes('STAFF') ? 'bg-aegis-gold' : 'bg-blue-600'}`}></div>

                <div className="flex-grow flex items-center justify-center p-4 relative z-10">
                    
                    {/* --- PATIENT LOGIN --- */}
                    {authMode === 'PATIENT_LOGIN' && (
                        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-slate-700 shadow-2xl animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-blue-500"></div>
                            
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-teal-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                                    <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                                <p className="text-slate-400 text-sm mt-1">Sign in to your Digital Health Twin</p>
                            </div>

                            <div className="space-y-5">
                                <Input variant="dark" label="Email Address" type="email" placeholder="name@example.com" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                                <Input variant="dark" label="Password" type="password" value={formData.password} onChange={e => handleChange('password', e.target.value)} />
                                
                                <Button onClick={handlePatientLogin} isLoading={loading} className="w-full mt-2 h-12 text-lg shadow-teal-900/50">Secure Login</Button>
                                
                                <div className="flex items-center gap-4 my-6">
                                    <div className="h-px bg-slate-700 flex-grow"></div>
                                    <span className="text-slate-500 text-xs">OR</span>
                                    <div className="h-px bg-slate-700 flex-grow"></div>
                                </div>

                                <p className="text-center text-slate-400 text-sm">
                                    New to AegisCare? <button onClick={() => setAuthMode('PATIENT_REGISTER')} className="text-aegis-teal hover:text-teal-300 hover:underline font-bold transition-colors">Create Account</button>
                                </p>
                                <button onClick={() => setAuthMode('LANDING')} className="w-full text-slate-500 text-xs hover:text-white transition-colors">← Back to Portal</button>
                            </div>
                        </div>
                    )}

                    {/* --- PATIENT REGISTER --- */}
                    {authMode === 'PATIENT_REGISTER' && (
                        <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-md p-8 rounded-3xl border border-slate-700 shadow-2xl animate-fade-in relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-blue-500"></div>
                            
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm border border-teal-500/30">ID</span>
                                Patient Registration
                            </h2>
                            
                            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                                <Input variant="dark" label="Full Name *" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input variant="dark" label="Age *" type="number" value={formData.age} onChange={e => handleChange('age', e.target.value)} />
                                    <div>
                                        <label className="text-sm text-slate-400 block mb-1">Gender *</label>
                                        <select className="w-full bg-slate-950 border border-slate-600 rounded-lg p-3 text-white focus:border-aegis-teal outline-none" value={formData.gender} onChange={e => handleChange('gender', e.target.value)}>
                                            <option>Male</option><option>Female</option><option>Other</option>
                                        </select>
                                    </div>
                                </div>
                                <Input 
                                    variant="dark" 
                                    label="Phone No *" 
                                    value={formData.phone} 
                                    onChange={e => handleChange('phone', e.target.value)} 
                                    maxLength={10}
                                    type="tel"
                                    placeholder="10 digit mobile number"
                                />
                                <Input variant="dark" label="Email *" type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                                <Input variant="dark" label="Address *" value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                                
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mt-2">
                                    <h4 className="text-xs text-slate-500 uppercase font-bold mb-3">Security</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input variant="dark" label="Password *" type="password" value={formData.password} onChange={e => handleChange('password', e.target.value)} className="mb-0" />
                                        <Input variant="dark" label="Confirm *" type="password" value={formData.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} className="mb-0" />
                                    </div>
                                </div>

                                <Button onClick={handlePatientRegister} isLoading={loading} className="w-full mt-4 h-12">Create Account</Button>
                                <button onClick={() => setAuthMode('PATIENT_LOGIN')} className="w-full text-slate-500 text-sm mt-2 hover:text-white">Already have an account? Login</button>
                            </div>
                        </div>
                    )}

                    {/* --- STAFF LOGIN --- */}
                    {authMode === 'STAFF_LOGIN' && (
                        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl p-8 rounded-xl border border-aegis-gold/30 shadow-[0_0_50px_rgba(217,119,6,0.1)] animate-fade-in relative">
                            {/* Tech Decorators */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-aegis-gold"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-aegis-gold"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-aegis-gold"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-aegis-gold"></div>

                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white uppercase tracking-widest font-mono">Restricted Access</h2>
                                <p className="text-aegis-gold text-xs mt-2 font-mono flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    SYSTEM SECURE
                                </p>
                            </div>

                            {/* Demo Creds Box */}
                            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg mb-6 flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-500">DEMO CREDENTIALS:</span>
                                <span className="text-aegis-gold cursor-pointer hover:underline" onClick={() => {
                                    setFormData(prev => ({ ...prev, email: 'admin@citygeneral.com', password: 'password' }));
                                }}>admin@citygeneral.com</span>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-aegis-gold text-xs font-bold uppercase tracking-wider mb-1 block">Staff Email</label>
                                    <Input 
                                        variant="dark" 
                                        type="email"
                                        placeholder="doctor@hospital.com" 
                                        value={formData.email} 
                                        onChange={e => handleChange('email', e.target.value)} 
                                        className="font-mono bg-black/50 border-slate-700 focus:border-aegis-gold"
                                    />
                                </div>
                                <div>
                                    <label className="text-aegis-gold text-xs font-bold uppercase tracking-wider mb-1 block">Security Token</label>
                                    <Input variant="dark" type="password" value={formData.password} onChange={e => handleChange('password', e.target.value)} className="font-mono bg-black/50 border-slate-700 focus:border-aegis-gold" />
                                </div>
                                
                                <Button onClick={handleStaffLogin} isLoading={loading} className="w-full mt-4 bg-aegis-gold text-slate-900 hover:bg-amber-500 font-bold tracking-wider h-12 uppercase">
                                    Authenticate
                                </Button>
                                
                                <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-800">
                                    <button onClick={() => setAuthMode('LANDING')} className="text-slate-500 text-xs hover:text-white transition-colors">← ABORT</button>
                                    <button onClick={() => setAuthMode('STAFF_REGISTER')} className="text-aegis-gold text-xs hover:underline font-mono">REQUEST ACCESS ID</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- STAFF REGISTER --- */}
                    {authMode === 'STAFF_REGISTER' && (
                        <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl p-8 rounded-xl border border-aegis-gold/30 shadow-2xl animate-fade-in relative">
                             <div className="absolute top-0 left-0 w-full h-1 bg-aegis-gold shadow-[0_0_10px_rgba(217,119,6,0.5)]"></div>

                            {!generatedStaffId ? (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-white uppercase tracking-wider font-mono">Staff Onboarding</h2>
                                        <div className="px-2 py-1 bg-aegis-gold/20 text-aegis-gold text-[10px] font-bold border border-aegis-gold/50 rounded">ADMIN LEVEL</div>
                                    </div>
                                    
                                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                        <Input variant="dark" label="Legal Name *" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="font-mono bg-black/30" />
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-aegis-gold font-bold uppercase mb-1 block">Facility *</label>
                                                <select className="w-full bg-black/30 border border-slate-700 rounded-lg p-3 text-white focus:border-aegis-gold outline-none font-mono text-sm" value={formData.hospitalId} onChange={e => handleChange('hospitalId', e.target.value)}>
                                                    <option value="">-- ASSIGN UNIT --</option>
                                                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-aegis-gold font-bold uppercase mb-1 block">Designation *</label>
                                                <select className="w-full bg-black/30 border border-slate-700 rounded-lg p-3 text-white focus:border-aegis-gold outline-none font-mono text-sm" value={formData.role} onChange={e => handleChange('role', e.target.value)}>
                                                    {['Doctor', 'Nurse', 'Surgeon', 'Resident', 'Intern', 'Admin'].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Input variant="dark" label="Age" type="number" value={formData.age} onChange={e => handleChange('age', e.target.value)} className="font-mono bg-black/30" />
                                            <Input 
                                                variant="dark" 
                                                label="Contact" 
                                                value={formData.phone} 
                                                onChange={e => handleChange('phone', e.target.value)} 
                                                className="font-mono bg-black/30" 
                                                maxLength={10}
                                                type="tel"
                                                placeholder="10 digit mobile number"
                                            />
                                        </div>
                                        
                                        <Input variant="dark" label="Work Email *" type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} className="font-mono bg-black/30" />
                                        <Input variant="dark" label="Residential Address" value={formData.address} onChange={e => handleChange('address', e.target.value)} className="font-mono bg-black/30" />
                                        
                                        <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-lg mt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input variant="dark" label="Create Password *" type="password" value={formData.password} onChange={e => handleChange('password', e.target.value)} className="mb-0 bg-black/50" />
                                                <Input variant="dark" label="Verify *" type="password" value={formData.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} className="mb-0 bg-black/50" />
                                            </div>
                                        </div>

                                        <Button onClick={handleStaffRegister} isLoading={loading} className="w-full mt-4 bg-aegis-gold text-slate-900 hover:bg-amber-500 h-12 font-bold uppercase tracking-wider">Initialize Profile</Button>
                                        <button onClick={() => setAuthMode('STAFF_LOGIN')} className="w-full text-slate-500 text-xs mt-2 hover:text-white font-mono">ALREADY REGISTERED? AUTHENTICATE</button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center space-y-6 animate-fade-in">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)] border border-green-500">
                                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white font-mono uppercase tracking-tight">Access Granted</h2>
                                    <p className="text-slate-400 text-sm">
                                        Use your <strong>Email</strong> to log in.
                                    </p>
                                    
                                    <div className="bg-black/50 p-6 rounded-xl border border-slate-700 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-full bg-aegis-gold/5 animate-pulse"></div>
                                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 relative z-10">Internal Badge ID</div>
                                        <div className="text-4xl font-mono font-bold text-aegis-gold tracking-[0.2em] relative z-10">{generatedStaffId}</div>
                                    </div>

                                    <Button onClick={() => { setGeneratedStaffId(null); setAuthMode('STAFF_LOGIN'); }} className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold uppercase">Proceed to Login</Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
  );
};

export default App;