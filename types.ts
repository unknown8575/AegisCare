
export enum UserRole {
  PATIENT = 'PATIENT',
  HOSPITAL_STAFF = 'HOSPITAL_STAFF',
  ADMIN = 'ADMIN'
}

export type Language = 'en' | 'hi';

export enum ESILevel {
  ONE = 1, // Resuscitation
  TWO = 2, // Emergent
  THREE = 3, // Urgent
  FOUR = 4, // Less Urgent
  FIVE = 5  // Non-urgent
}

export enum CaseStatus {
  NEW = 'NEW',
  ANALYZING = 'ANALYZING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISPATCHED = 'DISPATCHED',
  CLOSED = 'CLOSED',
  DEFERRED = 'DEFERRED'
}

export interface NotificationPreferences {
  emailAlerts: boolean;
  smsAlerts: boolean;
  dietReminders: boolean;
  emergencyUpdates: boolean;
}

export interface User {
  id: string; // Internal UUID or 4-digit ID for staff
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  age: string;
  gender: string;
  address: string;
  
  // Optional/Specific fields
  abhaId?: string;
  language?: Language;
  city?: string;
  pincode?: string;
  hospitalId?: string; // Foreign Key to HospitalSchema (Staff only)
  preferences?: NotificationPreferences;
}

// Internal Interface for DB Storage (extends User with Password)
export interface StoredUser extends User {
  password?: string;
}

export interface SBAR {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

export interface VisionAnalysis {
  detected: boolean;
  boundingBox?: { x: number; y: number; w: number; h: number }; // Percentages
  tags: string[]; // e.g., "Pallor", "Sweating"
  imageUrl?: string; // Placeholder for demo
}

export interface SharedContext {
  reportSummary: string;
  risks: string[];
  fitnessTrend: 'improving' | 'stable' | 'worsening';
  lastCheckin: string;
}

// --- DATABASE ENTITIES ---

export interface HospitalSchema {
  id: string;
  name: string;
  region: string;
  type: 'GOVT' | 'PRIVATE';
  rating: number;
  capabilities: string[];
}

// Graph Edge: Connects a Case to a Hospital efficiently
export interface CaseRoutingEdge {
  caseId: string;
  hospitalId: string;
  timestamp: number;
  status: 'ACTIVE' | 'ARCHIVED';
  edgeType: 'DIRECT_DISPATCH' | 'BROADCAST';
}

export interface TriageCase {
  id: string;
  patientId: string; // Foreign Key to User
  patientAlias: string; // PII Vault: "Patient-X7Z"
  ageRange: string;
  gender: string;
  chiefComplaint: string;
  symptoms: string[];
  painScore: number;
  duration: string;
  sbar: SBAR | null;
  esiSuggestion: ESILevel | null;
  esiReasoning: string | null;
  visionData?: VisionAnalysis;
  status: CaseStatus;
  timestamp: number;
  flags: string[]; // "Chest Pain", "Low Confidence"
  auditLogId: string;
  history: string[]; // Mock digital memory
  sharedContext?: SharedContext; // New field for consented data
  assignedHospitalId?: string; // Foreign Key to HospitalSchema
  
  // VECTOR DATABASE FIELD
  vectorEmbedding?: number[]; // [0.12, 0.44, ...] for semantic search
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceId: string;
  timestamp: number;
  ip: string;
}

export interface TriageInput {
  symptomsText: string;
  painScore: number;
  duration: string;
  hasChestPain: boolean;
  hasBreathingIssue: boolean;
  hasConfusion: boolean;
  age: number;
  gender: string;
  language: Language;
}

// --- NEW DASHBOARD TYPES ---

export interface AssumptionInput {
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  heightCm?: number;
  weightKg?: number;
  activityLevel?: 'Sedentary' | 'Moderate' | 'Active';
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  tempF?: number;
  spo2?: number;
  primaryComplaints: string[];
  painLocation?: string;
  painSeverity?: number;
  energyLevel?: 'High' | 'Normal' | 'Low' | 'Exhausted';
  appetite?: 'No Change' | 'Increased' | 'Decreased';
  sleep?: 'Good' | 'Insomnia' | 'Excessive' | 'Irregular';
  smoking?: boolean;
  alcohol?: 'Never' | 'Social' | 'Regular' | 'Heavy';
  familyDiabetes?: boolean;
  familyHeart?: boolean;
  diet?: 'Veg' | 'Non-Veg' | 'Vegan';
  fastingSugar?: number;
  waistCircumference?: number;
  isPale?: boolean;
  feetSwelling?: boolean;
  deepDiveContext?: string[];
  workType?: 'Desk' | 'Physical' | 'Mixed';
  dailyWaterIntake?: number;
  perceivedStress?: number;
}

export interface RiskCategory {
  category: string;
  status: 'Low Risk' | 'Medium Risk' | 'High Risk';
  reasoning: string;
}

export interface SimulatedLab {
  testName: string;
  predictedRange: string;
  status: 'Normal' | 'Borderline' | 'High' | 'Low';
  insight: string;
}

export interface HealthReport {
  type: 'UPLOAD' | 'ASSUMPTION';
  date: string;
  wellnessScore: number;
  wellnessStatus: string;
  simulatedLabs: SimulatedLab[];
  riskRadar: RiskCategory[];
  recommendedTests: string[];
  actionPlanSteps: string[];
  doctorsNote: string;
  summary: string;
  detailedAnalysis?: string;
  vitals: {
    bp?: string;
    heartRate?: string;
    stressLevel?: number;
    bmi?: string;
    isPredicted?: boolean;
  };
  flags: string[]; 
  affectedOrgans: ('HEART' | 'BRAIN' | 'LUNGS' | 'STOMACH' | 'JOINTS')[];
  graphLogicTrace?: string[];
}

// --- DIET TYPES ---

export interface DishOption {
  id: string;
  name: string;
  shortReason: string;
  recipeSteps: string[];
  ingredients: string[];
  prepTime: string;
  calories: number;
  tags: string[];
}

export interface MealSlot {
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Brunch';
  timeSuggestion: string;
  options: DishOption[];
}

export interface DayPlan {
  dayIndex: number;
  label: string;
  meals: MealSlot[];
}

export interface WeeklyPlan {
  days: DayPlan[];
  generatedAt: number;
  preferences: DietPreferences;
}

export interface DietPreferences {
  mealsPerDay: 2 | 3;
  cuisine: 'North Indian' | 'South Indian' | 'Continental' | 'Mixed';
  type: 'Veg' | 'Non-Veg' | 'Vegan' | 'Eggetarian';
  allergies: string[];
}

export interface DietPlan {
  country: string;
  preference: 'VEG' | 'NON_VEG' | 'VEGAN';
  summary: string;
  meals: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
}

export interface FitnessMessage {
  sender: 'AI' | 'USER';
  text: string;
}

// --- EMERGENCY TYPES ---

export interface HospitalResource {
  id: string;
  name: string;
  distance: string;
  driveTime: string;
  erWaitTime: string;
  status: 'Open' | 'Crowded' | 'Full';
  specialties: string[];
  type?: 'GOVT' | 'PRIVATE'; // Added for routing logic
}

export interface FirstAidResult {
  condition: string;
  steps: string[];
  warning: string;
}

// --- HOSPITAL DASHBOARD TYPES (NEW) ---

export type StaffRole = 'Doctor' | 'Nurse' | 'Surgeon' | 'Resident' | 'Intern' | 'Admin';

export interface HospitalUserProfile {
  id: string; // matches User.id
  name: string;
  role: StaffRole;
  phone: string;
  address: string;
  dutyTime: { start: string; end: string };
  hospitalId: string;
}

export interface OperationEntry {
  id: string;
  patientId: string;
  patientName: string;
  procedureName: string;
  scheduledAt: string; // ISO or HH:mm
  otNumber: string;
  priority: 'Elective' | 'Emergency';
  status: 'Scheduled' | 'In Progress' | 'Completed';
  notes?: string;
  assistantStaff?: string;
}

export interface HospitalPatientHeader {
  patientId: string;
  patientName: string;
  caregiverName?: string;
  caregiverPhone?: string;
  age: number;
  primaryProblem: string;
  assignedDoctorId: string;
}

export interface HospitalPatientView {
  header: HospitalPatientHeader;
  report: HealthReport | null; // Null if no consent/data
}

export interface MedicineEntry {
  id: string;
  patientId: string;
  time: string;          // "08:00"
  name: string;          // e.g., "Metformin"
  dose: string;          // "500 mg"
  route: 'Oral' | 'IV' | 'IM' | 'SC' | 'Topical';
  frequency: 'Once' | 'Daily' | 'BID' | 'TID' | 'QID' | 'AlternateDay';
  notes?: string;
}

export interface HospitalDietView {
  patientId: string;
  dietPlan: WeeklyPlan | null;
  overrideMode: 'AI' | 'HOSPITAL';
  overrides?: {
    [dayIndex: number]: {
      [mealType: string]: string; // dishId
    };
  };
}

export interface EmergencyRequest {
  requestId: string;
  patientId: string;
  selectedHospitalId: string;
  createdAt: number;
  status: 'OPEN' | 'ACKED' | 'CLOSED';
  patientConsented: boolean;
  sharedContext?: SharedContext;
}

export interface SessionState {
  activeSection: string;
  dietDayIndex: number;
  assumptionStep: number;
  lastViewedReportId?: string;
}

export interface HospitalAccessLog {
  logId: string;
  hospitalId: string;
  doctorId: string;
  patientId: string;
  action: string;
  timestamp: number;
}

// --- APPOINTMENTS (NEW) ---

export type VisitType = 'General Checkup' | 'Follow-up' | 'Emergency' | 'Tele-consult';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string; // Snapshot
  hospitalId: string;
  hospitalName: string; // Snapshot
  date: string;
  time: string;
  visitType: VisitType;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  sharedContext: SharedContext; // The sync data snapshot
  createdAt: number;
}
