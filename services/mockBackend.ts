import { User, UserRole, StoredUser, TriageCase, CaseStatus, AuditLog, TriageInput, VisionAnalysis, SharedContext, HospitalSchema, CaseRoutingEdge, HospitalUserProfile, OperationEntry, MedicineEntry, EmergencyRequest, SessionState, HospitalAccessLog, HealthReport, WeeklyPlan, Appointment, FitnessMessage } from "../types";

// --- DATABASE TABLES (LOCAL STORAGE KEYS) ---
const TABLE_USERS = 'db_users';
const TABLE_HOSPITALS = 'db_hospitals';
const TABLE_CASES = 'db_cases';
const GRAPH_EDGES = 'db_graph_edges'; 
const TABLE_AUDIT = 'db_audit_log';
const TABLE_EMERGENCY_REQUESTS = 'db_emergency_requests';
const TABLE_SESSIONS = 'db_sessions';
const TABLE_ACCESS_LOGS = 'db_access_logs';
const TABLE_APPOINTMENTS = 'db_appointments'; 
const TABLE_EMERGENCY_CHATS = 'db_emergency_chats'; // NEW

// HEALTH DATA TABLES
const TABLE_HEALTH_REPORTS = 'db_health_reports';
const TABLE_DIET_PLANS = 'db_diet_plans';

// HOSPITAL DASHBOARD TABLES
const TABLE_STAFF_PROFILES = 'db_staff_profiles';
const TABLE_OPERATIONS = 'db_operations';
const TABLE_MEDICINES = 'db_medicines';

// --- INITIALIZATION & SEEDING ---
const initDatabase = () => {
  if (typeof window === 'undefined') return;
  
  // Seed Hospitals (Reference Data)
  if (!localStorage.getItem(TABLE_HOSPITALS)) {
      const hospitals: HospitalSchema[] = [
          { id: 'h1', name: 'City General Hospital (Trauma L1)', region: 'North', type: 'GOVT', rating: 4.2, capabilities: ['Trauma', 'Stroke', 'Emergency'] },
          { id: 'h2', name: 'St. Mary’s Cardiac Center', region: 'Central', type: 'PRIVATE', rating: 4.8, capabilities: ['Cardiac', 'Thoracic', 'ICU'] },
          { id: 'h3', name: 'Westside Urgent Care', region: 'West', type: 'PRIVATE', rating: 3.9, capabilities: ['General', 'Pediatrics'] },
          { id: 'h4', name: 'Apollo Spectra', region: 'South', type: 'PRIVATE', rating: 4.5, capabilities: ['Ortho', 'General Surgery'] },
      ];
      localStorage.setItem(TABLE_HOSPITALS, JSON.stringify(hospitals));
  }
  
  // Initialize Empty Tables if not exist
  [TABLE_CASES, TABLE_USERS, GRAPH_EDGES, TABLE_AUDIT, TABLE_EMERGENCY_REQUESTS, TABLE_SESSIONS, TABLE_ACCESS_LOGS, TABLE_STAFF_PROFILES, TABLE_OPERATIONS, TABLE_MEDICINES, TABLE_HEALTH_REPORTS, TABLE_DIET_PLANS, TABLE_APPOINTMENTS, TABLE_EMERGENCY_CHATS].forEach(key => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([]));
  });

  // --- ROBUST SEEDING (FIX FOR MISSING ACCOUNTS) ---
  
  // 1. Ensure Admin User Exists (even if table already exists)
  const currentUsers = JSON.parse(localStorage.getItem(TABLE_USERS) || '[]');
  const adminEmail = 'admin@citygeneral.com';
  
  if (!currentUsers.some((u: any) => u.email === adminEmail)) {
      console.log("Seeding missing Admin User...");
      currentUsers.push({ 
        id: '1000', 
        name: 'Dr. Default', 
        email: adminEmail, 
        role: UserRole.HOSPITAL_STAFF, 
        hospitalId: 'h1',
        phone: '1234567890',
        age: '40',
        gender: 'Male',
        address: 'Hospital Quarters',
        password: 'password'
      });
      localStorage.setItem(TABLE_USERS, JSON.stringify(currentUsers));
  }

  // 2. Ensure Staff Profile Exists
  const currentProfiles = JSON.parse(localStorage.getItem(TABLE_STAFF_PROFILES) || '[]');
  if (!currentProfiles.some((p: any) => p.id === '1000')) {
      console.log("Seeding missing Staff Profile...");
      currentProfiles.push({
          id: '1000',
          name: 'Dr. Default',
          role: 'Doctor',
          phone: '1234567890',
          address: 'Hospital Quarters',
          dutyTime: { start: '08:00', end: '18:00' },
          hospitalId: 'h1'
      });
      localStorage.setItem(TABLE_STAFF_PROFILES, JSON.stringify(currentProfiles));
  }
};

initDatabase();

// --- CORE DB HELPERS ---
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const getTable = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setTable = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('local-storage'));
};

const cleanUser = (user: StoredUser): User => {
    const { password, ...safeUser } = user;
    return safeUser;
};

// --- AUTH SERVICES ---

export const registerPatient = async (details: { name: string, age: string, phone: string, email: string, gender: string, address: string, password?: string }): Promise<User> => {
    await delay(800);
    const users = getTable<StoredUser>(TABLE_USERS);
    if (users.find(u => u.email === details.email)) throw new Error("User already exists.");

    const newUser: StoredUser = {
        id: `p_${Date.now()}`,
        role: UserRole.PATIENT,
        name: details.name,
        email: details.email,
        phone: details.phone,
        age: details.age,
        gender: details.gender,
        address: details.address,
        password: details.password,
        abhaId: `91-${Math.floor(Math.random()*1000)}-${Math.floor(Math.random()*1000)}`,
        preferences: {
            emailAlerts: true,
            smsAlerts: true,
            dietReminders: true,
            emergencyUpdates: true
        }
    };

    users.push(newUser);
    setTable(TABLE_USERS, users);
    return cleanUser(newUser);
};

export const registerStaff = async (details: any): Promise<User> => {
    await delay(1000);
    const users = getTable<StoredUser>(TABLE_USERS);
    if (users.find(u => u.email === details.email)) throw new Error("Staff email already registered.");

    let newId = Math.floor(1000 + Math.random() * 9000).toString();
    while (users.find(u => u.id === newId)) newId = Math.floor(1000 + Math.random() * 9000).toString();

    const newStaff: StoredUser = {
        ...details,
        id: newId,
        role: UserRole.HOSPITAL_STAFF, 
    };

    users.push(newStaff);
    setTable(TABLE_USERS, users);
    
    // Create Profile
    const profiles = getTable<HospitalUserProfile>(TABLE_STAFF_PROFILES);
    profiles.push({
        id: newId,
        name: details.name,
        role: details.role, 
        phone: details.phone,
        address: details.address,
        dutyTime: { start: '08:00', end: '18:00' },
        hospitalId: details.hospitalId
    });
    setTable(TABLE_STAFF_PROFILES, profiles);

    return cleanUser(newStaff);
};

export const loginPatient = async (creds: { email?: string, password?: string }): Promise<User> => {
    await delay(800);
    const users = getTable<StoredUser>(TABLE_USERS);
    const user = users.find(u => u.email === creds.email && u.role === UserRole.PATIENT);
    
    if (!user) throw new Error("Patient not found.");
    if (user.password && user.password !== creds.password) throw new Error("Incorrect Password.");

    return cleanUser(user);
};

export const loginStaff = async (email: string, password?: string): Promise<User> => {
    await delay(800);
    const users = getTable<StoredUser>(TABLE_USERS);
    const user = users.find(u => u.email === email && u.role === UserRole.HOSPITAL_STAFF);

    if (!user) throw new Error("Staff account not found. Please try 'admin@citygeneral.com' / 'password'");
    if (user.password && user.password !== password) throw new Error("Incorrect Password.");

    return cleanUser(user);
};

export const updateUser = async (user: User): Promise<User> => {
    await delay(500);
    const users = getTable<StoredUser>(TABLE_USERS);
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...user };
        setTable(TABLE_USERS, users);
        return cleanUser(users[idx]);
    }
    throw new Error("User not found");
};

export const getHospitals = (): HospitalSchema[] => getTable(TABLE_HOSPITALS);

// --- HEALTH REPORT PERSISTENCE ---

export const saveHealthReport = async (userId: string, report: HealthReport) => {
    const reports = getTable<{userId: string, report: HealthReport, timestamp: number}>(TABLE_HEALTH_REPORTS);
    const filtered = reports.filter(r => r.userId !== userId);
    filtered.push({ userId, report, timestamp: Date.now() });
    setTable(TABLE_HEALTH_REPORTS, filtered);
};

export const getHealthReport = async (userId: string): Promise<HealthReport | null> => {
    const reports = getTable<{userId: string, report: HealthReport}>(TABLE_HEALTH_REPORTS);
    const entry = reports.find(r => r.userId === userId);
    return entry ? entry.report : null;
};

// --- DIET PLAN PERSISTENCE ---

export const saveDietPlan = async (userId: string, plan: WeeklyPlan) => {
    const plans = getTable<{userId: string, plan: WeeklyPlan}>(TABLE_DIET_PLANS);
    const filtered = plans.filter(p => p.userId !== userId);
    filtered.push({ userId, plan });
    setTable(TABLE_DIET_PLANS, filtered);
};

export const getDietPlan = async (userId: string): Promise<WeeklyPlan | null> => {
    const plans = getTable<{userId: string, plan: WeeklyPlan}>(TABLE_DIET_PLANS);
    const entry = plans.find(p => p.userId === userId);
    return entry ? entry.plan : null;
};

// --- EMERGENCY CHAT PERSISTENCE (NEW) ---

export const saveEmergencyChat = async (userId: string, messages: FitnessMessage[]) => {
    const chats = getTable<{userId: string, messages: FitnessMessage[]}>(TABLE_EMERGENCY_CHATS);
    const idx = chats.findIndex(c => c.userId === userId);
    if (idx >= 0) {
        chats[idx].messages = messages;
    } else {
        chats.push({ userId, messages });
    }
    setTable(TABLE_EMERGENCY_CHATS, chats);
};

export const getEmergencyChat = async (userId: string): Promise<FitnessMessage[]> => {
    const chats = getTable<{userId: string, messages: FitnessMessage[]}>(TABLE_EMERGENCY_CHATS);
    const entry = chats.find(c => c.userId === userId);
    return entry ? entry.messages : [];
};

// --- TRIAGE & EMERGENCY LOGIC ---

export const submitTriageCase = async (patientId: string, input: TriageInput, aiResult: any, visionResult?: VisionAnalysis, sharedContext?: SharedContext, assignedHospitalId?: string): Promise<TriageCase> => {
  await delay(1000);
  const alias = `Patient-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const newCase: TriageCase = {
    id: `c_${Date.now()}`,
    patientId: patientId,
    patientAlias: alias,
    ageRange: input.age.toString(),
    gender: input.gender,
    chiefComplaint: input.symptomsText.slice(0, 100),
    symptoms: [input.hasChestPain ? 'Chest Pain' : ''],
    painScore: input.painScore,
    duration: input.duration,
    sbar: aiResult.sbar,
    esiSuggestion: aiResult.esiLevel,
    esiReasoning: aiResult.reasoning,
    status: CaseStatus.NEW,
    timestamp: Date.now(),
    flags: aiResult.flags || [],
    auditLogId: `aud_${Date.now()}`,
    history: [],
    sharedContext: sharedContext,
    assignedHospitalId: assignedHospitalId
  };

  const cases = getTable<TriageCase>(TABLE_CASES);
  cases.unshift(newCase);
  setTable(TABLE_CASES, cases);

  if (assignedHospitalId) {
      const edges = getTable<CaseRoutingEdge>(GRAPH_EDGES);
      edges.push({
          caseId: newCase.id,
          hospitalId: assignedHospitalId,
          timestamp: Date.now(),
          status: 'ACTIVE',
          edgeType: 'DIRECT_DISPATCH'
      });
      setTable(GRAPH_EDGES, edges);

      const requests = getTable<EmergencyRequest>(TABLE_EMERGENCY_REQUESTS);
      requests.push({
          requestId: `req_${Date.now()}`,
          patientId,
          selectedHospitalId: assignedHospitalId,
          createdAt: Date.now(),
          status: 'OPEN',
          patientConsented: true,
          sharedContext
      });
      setTable(TABLE_EMERGENCY_REQUESTS, requests);

      const ops = getTable<OperationEntry>(TABLE_OPERATIONS);
      ops.push({
          id: `op_auto_${Date.now()}`,
          patientId: newCase.id,
          patientName: alias, 
          procedureName: "Emergency Triage",
          scheduledAt: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          otNumber: "ER-1",
          priority: "Emergency",
          status: "Scheduled",
          notes: "Auto-generated via App"
      });
      setTable(TABLE_OPERATIONS, ops);
  }

  return newCase;
};

export const getCasesForHospital = async (userId: string): Promise<TriageCase[]> => {
    await delay(500);
    const staff = await getStaffProfile(userId);
    if (!staff) return [];

    const edges = getTable<CaseRoutingEdge>(GRAPH_EDGES);
    const linkedIds = edges.filter(e => e.hospitalId === staff.hospitalId).map(e => e.caseId);

    const cases = getTable<TriageCase>(TABLE_CASES);
    return cases.filter(c => linkedIds.includes(c.id) || !c.assignedHospitalId);
};

export const getCaseById = async (caseId: string, userId: string): Promise<TriageCase | undefined> => {
    await delay(500);
    const cases = getTable<TriageCase>(TABLE_CASES);
    return cases.find(c => c.id === caseId);
};

export const updateCaseStatus = async (caseId: string, status: CaseStatus, userId: string) => {
    const cases = getTable<TriageCase>(TABLE_CASES);
    const c = cases.find(c => c.id === caseId);
    if (c) {
        c.status = status;
        setTable(TABLE_CASES, cases);
    }
};

// --- HOSPITAL DATA ---

export const getStaffProfile = async (userId: string): Promise<HospitalUserProfile | null> => {
    const profiles = getTable<HospitalUserProfile>(TABLE_STAFF_PROFILES);
    return profiles.find(p => p.id === userId) || null;
};

export const updateStaffProfile = async (profile: HospitalUserProfile) => {
    const profiles = getTable<HospitalUserProfile>(TABLE_STAFF_PROFILES);
    const idx = profiles.findIndex(p => p.id === profile.id);
    if(idx !== -1) profiles[idx] = profile;
    setTable(TABLE_STAFF_PROFILES, profiles);
};

export const getOperations = async (): Promise<OperationEntry[]> => getTable(TABLE_OPERATIONS);
export const addOperation = async (op: any) => {
    const ops = getTable<OperationEntry>(TABLE_OPERATIONS);
    ops.push({ ...op, id: `op_${Date.now()}`, status: 'Scheduled' });
    setTable(TABLE_OPERATIONS, ops);
};
export const updateOperation = async (op: OperationEntry) => {
    const ops = getTable<OperationEntry>(TABLE_OPERATIONS);
    const idx = ops.findIndex(o => o.id === op.id);
    if(idx !== -1) { ops[idx] = op; setTable(TABLE_OPERATIONS, ops); }
};

export const getMedicineRoutine = async (patientId: string): Promise<MedicineEntry[]> => {
    const meds = getTable<MedicineEntry>(TABLE_MEDICINES);
    return meds.filter(m => m.patientId === patientId);
};
export const addMedicine = async (med: any) => {
    const meds = getTable<MedicineEntry>(TABLE_MEDICINES);
    meds.push({...med, id: `med_${Date.now()}`});
    setTable(TABLE_MEDICINES, meds);
};
export const deleteMedicine = async (id: string) => {
    let meds = getTable<MedicineEntry>(TABLE_MEDICINES);
    meds = meds.filter(m => m.id !== id);
    setTable(TABLE_MEDICINES, meds);
};

// --- PATIENT HISTORY & SESSION ---

export const getPatientCases = async (patientId: string): Promise<TriageCase[]> => {
    const cases = getTable<TriageCase>(TABLE_CASES);
    return cases.filter(c => c.patientId === patientId);
};

export const saveSession = (userId: string, state: SessionState) => {
    const sessions = getTable<{userId: string, state: SessionState}>(TABLE_SESSIONS);
    const idx = sessions.findIndex(s => s.userId === userId);
    if (idx >= 0) sessions[idx].state = state;
    else sessions.push({ userId, state });
    setTable(TABLE_SESSIONS, sessions);
};

export const restoreSession = (userId: string): SessionState | null => {
    const sessions = getTable<{userId: string, state: SessionState}>(TABLE_SESSIONS);
    const s = sessions.find(s => s.userId === userId);
    return s ? s.state : null;
};

// --- MANUAL ADMIT ---
export const admitPatient = async (hospitalId: string, details: any): Promise<TriageCase> => {
    await delay(500);
    const newP: StoredUser = {
        id: `p_admit_${Date.now()}`,
        name: details.name,
        email: `manual_${Date.now()}@hosp.com`,
        role: UserRole.PATIENT,
        phone: details.phone,
        age: details.age,
        gender: details.gender,
        address: 'Admitted',
        password: 'temp'
    };
    const users = getTable<StoredUser>(TABLE_USERS);
    users.push(newP);
    setTable(TABLE_USERS, users);

    return submitTriageCase(newP.id, { 
        symptomsText: details.complaint, 
        painScore: 0, 
        duration: '', 
        hasChestPain: false, 
        hasBreathingIssue: false, 
        hasConfusion: false, 
        age: parseInt(details.age), 
        gender: details.gender, 
        language: 'en' 
    }, { sbar: null, esiLevel: 3, reasoning: 'Manual' }, undefined, undefined, hospitalId);
};

// --- APPOINTMENTS & SYNC ---

export const bookAppointment = async (
    patientId: string, 
    hospitalId: string, 
    details: { date: string, time: string, visitType: any, reason: string }
): Promise<Appointment> => {
    await delay(1200);

    const users = getTable<StoredUser>(TABLE_USERS);
    const patient = users.find(u => u.id === patientId);
    if (!patient) throw new Error("Patient not found.");

    const hospitals = getTable<HospitalSchema>(TABLE_HOSPITALS);
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) throw new Error("Hospital not found.");

    const report = await getHealthReport(patientId);
    const sharedContext: SharedContext = {
        reportSummary: report?.summary || 'No digital twin generated.',
        risks: report?.flags || [],
        fitnessTrend: 'stable', 
        lastCheckin: new Date().toLocaleDateString()
    };

    const newAppointment: Appointment = {
        id: `apt_${Date.now()}`,
        patientId,
        patientName: patient.name,
        hospitalId,
        hospitalName: hospital.name,
        date: details.date,
        time: details.time,
        visitType: details.visitType,
        reason: details.reason,
        status: 'PENDING',
        sharedContext,
        createdAt: Date.now()
    };

    const appointments = getTable<Appointment>(TABLE_APPOINTMENTS);
    appointments.push(newAppointment);
    setTable(TABLE_APPOINTMENTS, appointments);

    return newAppointment;
};

export const getAppointmentsForHospital = async (userId: string): Promise<Appointment[]> => {
    await delay(500);
    const staff = await getStaffProfile(userId);
    if (!staff) return [];

    const apps = getTable<Appointment>(TABLE_APPOINTMENTS);
    return apps
        .filter(a => a.hospitalId === staff.hospitalId)
        .sort((a, b) => b.createdAt - a.createdAt);
};

export const convertAppointmentToAdmission = async (appointmentId: string, notes: string): Promise<string> => {
    await delay(1500);
    const appointments = getTable<Appointment>(TABLE_APPOINTMENTS);
    const idx = appointments.findIndex(a => a.id === appointmentId);
    
    if (idx === -1) throw new Error("Appointment not found");
    const apt = appointments[idx];

    const users = getTable<StoredUser>(TABLE_USERS);
    const patient = users.find(u => u.id === apt.patientId);
    if (!patient) throw new Error("Patient record missing");

    const newCase = await submitTriageCase(
        patient.id,
        {
            symptomsText: apt.reason + " [Admitted via Appointment]",
            painScore: 0,
            duration: '',
            hasChestPain: false,
            hasBreathingIssue: false,
            hasConfusion: false,
            age: parseInt(patient.age),
            gender: patient.gender,
            language: 'en'
        },
        { sbar: null, esiLevel: 3, reasoning: `Admitted from Appointment. Doctor Notes: ${notes}` },
        undefined,
        apt.sharedContext,
        apt.hospitalId
    );

    appointments[idx].status = 'COMPLETED';
    setTable(TABLE_APPOINTMENTS, appointments);

    return newCase.id;
};