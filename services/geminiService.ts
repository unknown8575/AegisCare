import { TriageInput, ESILevel, VisionAnalysis, HealthReport, DietPlan, FitnessMessage, AssumptionInput, RiskCategory, SimulatedLab, WeeklyPlan, DietPreferences, DayPlan, MealSlot, DishOption, HospitalResource, FirstAidResult } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// --- TRISHUL LAYER 1: INPUT SHIELD ---
const MEDICAL_KEYWORDS = ['pain', 'hurt', 'ache', 'blood', 'dizzy', 'faint', 'chest', 'breath', 'broken', 'cut', 'burn', 'sick', 'emergency', 'help', 'stomach', 'head', 'vomit', 'nausea', 'fever', 'unconscious', 'collapse'];

const isMedicalIntent = (text: string): boolean => {
  const lower = text.toLowerCase();
  if (lower.includes('joke') || lower.includes('recipe') || lower.includes('weather') || lower.includes('stock market')) return false;
  if (lower.split(' ').length < 3) return true;
  return true;
};

// --- TRISHUL LAYER 2: PII MASKING ---
export const maskPII = (text: string): string => {
  let masked = text;
  masked = masked.replace(/(my name is|i am) ([A-Z][a-z]+)/gi, "$1 [Patient_ID_XXXX]");
  masked = masked.replace(/\b\d{10}\b/g, "[PHONE_REDACTED]");
  masked = masked.replace(/(Mumbai|Delhi|Bangalore|Chennai|Kolkata|Pune)/gi, "[LOCATION_REGION_1]");
  return masked;
};

// --- VISION SIMULATION ---
export const analyzeVisionSnapshot = async (): Promise<{
  detected: boolean;
  boundingBox: { x: number; y: number; w: number; h: number };
  tags: string[];
  imageUrl: string;
}> => {
  await new Promise(r => setTimeout(r, 1200));
  return {
    detected: true,
    boundingBox: { x: 35, y: 25, w: 30, h: 40 },
    tags: ["Pallor: Detected", "Sweating: High", "Respiration: Rapid", "ECG Pattern"],
    imageUrl: "https://placehold.co/400x300/1e293b/d97706?text=Chest+Analysis+Frame",
  };
};


// --- ADVANCED TRIAGE LOGIC (FALLBACK) ---
interface ClinicalProfile {
    category: 'CARDIAC' | 'RESPIRATORY' | 'NEURO' | 'TRAUMA' | 'GENERAL';
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
    keywords: string[];
}

const analyzeTextClinical = (text: string): ClinicalProfile => {
    const t = text.toLowerCase();
    const keywords: string[] = [];
    
    // 1. Cardiac
    if (t.includes('chest') || t.includes('heart') || t.includes('squeezing') || t.includes('pressure') || t.includes('left arm')) {
        keywords.push('Cardiac Symptoms');
        if (t.includes('sweat') || t.includes('crushing')) return { category: 'CARDIAC', severity: 'CRITICAL', keywords };
        return { category: 'CARDIAC', severity: 'HIGH', keywords };
    }
    // 2. Neuro
    if (t.includes('slurred') || t.includes('drooping') || t.includes('weakness') || t.includes('confusion') || t.includes('dizzy') || t.includes('faint')) {
        keywords.push('Neurological Deficit');
        return { category: 'NEURO', severity: 'CRITICAL', keywords };
    }
    // 3. Respiratory
    if (t.includes('breath') || t.includes('gasping') || t.includes('choking') || t.includes('air')) {
        keywords.push('Respiratory Distress');
        if (t.includes('blue') || t.includes('cannot speak')) return { category: 'RESPIRATORY', severity: 'CRITICAL', keywords };
        return { category: 'RESPIRATORY', severity: 'HIGH', keywords };
    }
    // 4. Trauma
    if (t.includes('blood') || t.includes('cut') || t.includes('bone') || t.includes('fall') || t.includes('accident')) {
        keywords.push('Trauma/Injury');
        if (t.includes('heavy') || t.includes('unconscious') || t.includes('head')) return { category: 'TRAUMA', severity: 'HIGH', keywords };
        return { category: 'TRAUMA', severity: 'MODERATE', keywords };
    }
    // 5. General
    keywords.push('General Malaise');
    if (t.includes('severe') || t.includes('worst')) return { category: 'GENERAL', severity: 'HIGH', keywords };
    return { category: 'GENERAL', severity: 'LOW', keywords };
};

const generateRecommendation = (level: number, category: string): string => {
    if (level === 1) return "ACTIVATE CODE BLUE. Prepare Resuscitation Room immediately.";
    if (level === 2) {
        if (category === 'CARDIAC') return "Immediate ECG (within 10 mins). Prepare Cardiac Monitor. Notify Physician.";
        if (category === 'NEURO') return "Activate Stroke Protocol. Immediate CT Scan.";
        return "Immediate placement in acute care bed. Continuous monitoring.";
    }
    if (level === 3) return "Place in treatment room. Order baseline labs/imaging. Re-assess pain.";
    return "Fast Track / Waiting Room. Vitals check every 2 hours.";
};

const generateRecommendationHindi = (level: number, category: string): string => {
    if (level <= 2) return "तत्काल ईआर मूल्यांकन. डॉक्टर को सूचित करें.";
    return "प्रतीक्षा क्षेत्र में निगरानी करें. विटाल की जांच करें.";
}

// Fallback Rule-Based Logic (Used when AI is offline or fails)
const generateSBARFallback = async (input: TriageInput) => {
  await new Promise(r => setTimeout(r, 1500)); // Simulate processing

  const profile = analyzeTextClinical(input.symptomsText);
  const isElderly = input.age > 50;
  const isHighPain = input.painScore >= 7;

  let esiLevel: ESILevel = ESILevel.FIVE;
  let reasoning = "";
  let flags: string[] = [...profile.keywords];

  if (input.symptomsText.toLowerCase().includes('unconscious') || input.symptomsText.toLowerCase().includes('not breathing')) {
      esiLevel = ESILevel.ONE;
      reasoning = "IMMEDIATE LIFE THREAT: Patient unresponsive or apneic. Requires resuscitation.";
      flags.push("CODE BLUE");
  }
  else if (profile.severity === 'CRITICAL' || (profile.category === 'CARDIAC' && (isElderly || isHighPain)) || (profile.category === 'NEURO') || input.hasChestPain || input.hasBreathingIssue) {
      esiLevel = ESILevel.TWO;
      reasoning = `HIGH RISK: ${profile.category} symptoms with ${isElderly ? 'age factor' : 'high severity indicators'}. Potential for rapid deterioration.`;
      flags.push("High Risk");
      if(input.hasChestPain) flags.push("Red Flag: Chest Pain");
  }
  else if (isHighPain || profile.severity === 'HIGH' || input.age > 70) {
      esiLevel = ESILevel.THREE;
      reasoning = "URGENT: Severe symptoms reported. Vitals likely stable but requires multiple resources (labs/imaging).";
  }
  else if (profile.category === 'TRAUMA' || profile.severity === 'MODERATE') {
      esiLevel = ESILevel.FOUR;
      reasoning = "STABLE: Condition appears localized or minor. Likely requires single resource (e.g., X-ray or stitches).";
  }
  else {
      esiLevel = ESILevel.FIVE;
      reasoning = "NON-URGENT: Symptoms consistent with minor illness. No immediate resource needs indicated.";
  }

  const sbar = {
    situation: input.language === 'en' 
      ? `Patient reports ${input.symptomsText}. Pain score ${input.painScore}/10. Duration: ${input.duration}. Category: ${profile.category}.`
      : `रोगी की रिपोर्ट: ${input.symptomsText}. दर्द स्कोर ${input.painScore}/10. अवधि: ${input.duration}. श्रेणी: ${profile.category}.`,
    background: input.language === 'en'
      ? `${input.gender}, Age ${input.age}. ${isElderly ? 'Age puts patient in higher risk bracket.' : 'No major age-related risk factors.'}`
      : `${input.gender}, आयु ${input.age}. ${isElderly ? 'आयु के कारण उच्च जोखिम.' : 'कोई प्रमुख आयु संबंधित जोखिम नहीं.'}`,
    assessment: input.language === 'en'
      ? `Triaged as ESI Level ${esiLevel}. ${reasoning}`
      : `ESI स्तर ${esiLevel} के रूप में वर्गीकृत. ${reasoning} (अनुवादित)`,
    recommendation: input.language === 'en'
      ? generateRecommendation(esiLevel, profile.category)
      : generateRecommendationHindi(esiLevel, profile.category)
  };

  return { sbar, esiLevel, reasoning, flags };
};

// --- MAIN AI TRIAGE FUNCTION ---
export const generateSBAR = async (input: TriageInput) => {
  // 1. Guardrails
  if (!isMedicalIntent(input.symptomsText)) {
    throw new Error("TRISHUL_BLOCK: Non-medical intent detected. System restricted to Emergency Triage.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    // Using Gemini 3 Pro for advanced medical reasoning and ESI classification
    const model = 'gemini-3-pro-preview';

    const prompt = `Act as an expert Triage Nurse and Emergency Physician. 
    Analyze the following patient intake to generate a Triage Report.
    
    PATIENT DATA:
    - Age/Gender: ${input.age} / ${input.gender}
    - Chief Complaint: ${input.symptomsText}
    - Pain Score: ${input.painScore}/10
    - Duration: ${input.duration}
    - Chest Pain: ${input.hasChestPain ? 'Yes' : 'No'}
    - Breathing Difficulty: ${input.hasBreathingIssue ? 'Yes' : 'No'}
    - Language: ${input.language}

    REQUIRED OUTPUT (JSON):
    1. medicalCategory: One of [CARDIAC, RESPIRATORY, NEURO, TRAUMA, GENERAL, GASTRO, ORTHO]
    2. severity: One of [CRITICAL, HIGH, MODERATE, LOW]
    3. esiLevel: Integer 1 (Most Critical) to 5 (Least Critical) based on ESI Triage Algorithm.
    4. reasoning: A concise clinical explanation for the ESI level.
    5. flags: Array of strings for key risk factors (e.g. "Red Flag: Chest Pain", "High Pain Score").
    6. sbar: Object with situation, background, assessment, recommendation keys.
       - situation: Concise summary of complaint.
       - background: Patient demographics and risk context.
       - assessment: Clinical impression and severity.
       - recommendation: Immediate next steps for the ER team (e.g. "ECG within 10 mins", "Standard Bed").

    Ensure the tone is clinical, professional, and precise.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    medicalCategory: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    esiLevel: { type: Type.INTEGER },
                    reasoning: { type: Type.STRING },
                    flags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sbar: {
                        type: Type.OBJECT,
                        properties: {
                            situation: { type: Type.STRING },
                            background: { type: Type.STRING },
                            assessment: { type: Type.STRING },
                            recommendation: { type: Type.STRING }
                        },
                        required: ['situation', 'background', 'assessment', 'recommendation']
                    }
                },
                required: ['medicalCategory', 'severity', 'esiLevel', 'reasoning', 'flags', 'sbar']
            }
        }
    });


    const jsonText = response.text || "{}";
    const result = JSON.parse(jsonText);



    // Normalize output for the app
    return {
        sbar: result.sbar,
        esiLevel: result.esiLevel,
        reasoning: result.reasoning,
        flags: result.flags || []
    };

  } catch (error) {
      console.warn("AI Triage unavailable/failed, using rule-based fallback.", error);
      return generateSBARFallback(input);
  }
};

// --- NEW: AI FIRST AID ASSISTANT ---
export const generateFirstAidAdvice = async (
  query: string
): Promise<{
  condition: string;
  steps: string[];
  warning: string;
}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const model = "gemini-2.5-flash";
    const prompt = `Provide immediate, short, actionable first aid steps for: "${query}".
Focus on immediate stabilization until help arrives.
Format as JSON with fields: condition (string), steps (array of strings, max 3), warning (string).
Keep it under 50 words total.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text || "{}";
    const json = JSON.parse(jsonText);

    return {
      condition: json.condition || query,
      steps:
        json.steps || [
          "Call emergency services immediately.",
          "Keep patient calm.",
          "Do not give food or water.",
        ],
      warning:
        json.warning || "Seek professional medical help immediately.",
    };
  } catch (e) {
    return {
      condition: query,
      steps: [
        "Ensure safety of scene.",
        "Call Emergency Services (108/911).",
        "Monitor breathing and pulse.",
      ],
      warning: "Offline Mode: Seek help immediately.",
    };
  }
};


// --- NEW: SIMULATED HOSPITAL LOCATOR ---
export const getNearbyHospitals = async (): Promise<
  {
    id: string;
    name: string;
    distance: string;
    driveTime: string;
    erWaitTime: string;
    status: string;
    specialties: string[];
  }[]
> => {
  await new Promise(r => setTimeout(r, 800)); // Simulate API call
  return [
    {
      id: "h1",
      name: "City General Hospital",
      distance: "1.2 km",
      driveTime: "5 mins",
      erWaitTime: "Low (< 15m)",
      status: "Open",
      specialties: ["Trauma L1", "Stroke"],
    },
    {
      id: "h2",
      name: "St. Mary’s Cardiac Center",
      distance: "3.5 km",
      driveTime: "12 mins",
      erWaitTime: "Med (30m)",
      status: "Crowded",
      specialties: ["Cardiac", "Thoracic"],
    },
    {
      id: "h3",
      name: "Westside Urgent Care",
      distance: "0.8 km",
      driveTime: "3 mins",
      erWaitTime: "High (> 1h)",
      status: "Full",
      specialties: ["General"],
    },
  ];
};


// --- NEW: EMERGENCY CHAT BOT ---
export const generateEmergencyChatResponse = async (history: FitnessMessage[], lastMessage: string): Promise<string> => {
    // Simulate latency for AI thought
    await new Promise(r => setTimeout(r, 1500));
    
    const lower = lastMessage.toLowerCase();
    
    // Simple logic rules for the mock demo
    if (lower.includes('where') && lower.includes('ambulance')) {
        return "Ambulance #402 is currently 1.2km away. ETA is approximately 4 minutes. Please ensure the entrance is accessible.";
    }
    if (lower.includes('bleeding')) {
        return "Please apply direct, steady pressure to the wound with a clean cloth. Do not remove the cloth if it soaks through; add more on top. Keep the patient warm.";
    }
    if (lower.includes('chest') || lower.includes('pain')) {
        return "I have flagged this as a Priority 1 Cardiac Event. The team is preparing the cath lab. Has the patient taken any Aspirin?";
    }
    if (lower.includes('panic') || lower.includes('scared')) {
        return "I understand this is a scary situation. Help is on the way. Focus on taking slow, deep breaths. Count to 4 on inhale, hold for 4, exhale for 4.";
    }
    
    return "Message received. Our Triage Command Center is monitoring your live telemetry. Please keep this secure line open for updates.";
};

// --- AI HEALTH ESTIMATE LOGIC ---

// NEW: AI Doctor Deep Dive Questions
export const generateDeepDiveQuestion = async (input: AssumptionInput, history: FitnessMessage[]): Promise<string> => {
    await new Promise(r => setTimeout(r, 800)); // Simulate thinking
    
    const context = history.map(h => h.text).join(' ').toLowerCase();
    const aiMsgCount = history.filter(h => h.sender === 'AI').length;

    // 1. Initial Probe: Routine & Morning
    if (history.length === 0) {
        return "I've reviewed your initial inputs. To build a high-fidelity Digital Twin, I need to know the 'why' behind the data. Let's start with your daily routine. Walk me through a typical morning - breakfast, activity, and energy levels?";
    }

    // 2. Work environment & Past Trauma
    if (aiMsgCount === 1) {
        return "Thanks. Now, tell me about your work environment and history. Do you sit for long hours? Also, have you had any past surgeries, accidents, or long-term injuries that still bother you?";
    }

    // 3. Sleep Hygiene & Stress
    if (aiMsgCount === 2) {
        return "Understood. Sleep is often the missing piece. Do you sleep soundly through the night, or is your sleep fragmented? Do you wake up feeling recharged or groggy?";
    }

    // 4. Targeted Metabolic/Gut Check
    if (aiMsgCount === 3) {
         return "One last area: Nutrition and Gut Health. Do you experience bloating or acidity frequently? Do you mostly eat home-cooked meals or rely on outside food?";
    }

    // Fallback/Dynamic
    if (input.perceivedStress && input.perceivedStress > 6 && !context.includes('stress')) {
        return "You mentioned high stress earlier. Is this constant low-grade stress (like work pressure) or acute spikes? This changes how we calculate heart risk.";
    }

    return "I have a good picture now. Is there anything else about your lifestyle or past health - big or small - that you think I should know before I generate the report?";
};


export const generateHealthReport = async (data: any, type: 'UPLOAD' | 'ASSUMPTION'): Promise<HealthReport> => {
  // Simulate heavy processing latency
  await new Promise(r => setTimeout(r, 2000));

  if (type === 'UPLOAD') {
    // Mock response for Upload remains simple for now
    return {
      type: 'UPLOAD',
      date: new Date().toLocaleDateString(),
      wellnessScore: 65,
      wellnessStatus: "Attention Needed",
      summary: "Uploaded Lipid Profile indicates elevated cholesterol.",
      doctorsNote: "Your lab results show high LDL. We need to focus on diet.",
      vitals: { bp: "135/85", heartRate: "78 bpm", bmi: "26.5", stressLevel: 4 },
      flags: ["High Cholesterol", "Pre-Hypertension"],
      affectedOrgans: ['HEART'],
      graphLogicTrace: ["Document Parsed: PDF", "Extracted: Lipid Panel", "Extracted: CBC"],
      riskRadar: [{category: 'Heart', status: 'High Risk', reasoning: 'LDL > 160'}],
      simulatedLabs: [],
      recommendedTests: ['Follow up Lipid Profile'],
      actionPlanSteps: ['Reduce Saturated Fats']
    };
  } else {
    // --- ADVANCED ASSUMPTION LOGIC (NEW REWRITE) ---
    const input = data as AssumptionInput;
    const logicTrace: string[] = [];
    
    // 1. CALCULATE WELLNESS SCORE (Base 100)
    let score = 100;
    const deduct = (amount: number, reason: string) => {
        score -= amount;
        logicTrace.push(`SCORE: -${amount} (${reason})`);
    };

    // Demographic Deductions
    let bmiValue = 0;
    if (input.heightCm && input.weightKg) {
        const heightM = input.heightCm / 100;
        bmiValue = parseFloat((input.weightKg / (heightM * heightM)).toFixed(1));
        if (bmiValue > 30) deduct(15, "Obesity Class I");
        else if (bmiValue > 25) deduct(10, "Overweight");
    }

    if (input.smoking) deduct(20, "Smoker");
    if (input.activityLevel === 'Sedentary') deduct(10, "Sedentary Lifestyle");
    if (input.perceivedStress && input.perceivedStress > 7) deduct(10, "High Stress");
    if (input.familyDiabetes) deduct(5, "Family History: Diabetes");
    if (input.familyHeart) deduct(5, "Family History: Heart");

    // Clamp Score
    score = Math.max(0, Math.min(100, score));
    
    let wellnessStatus = "Excellent";
    if (score < 80) wellnessStatus = "Good";
    if (score < 60) wellnessStatus = "Moderate Risk";
    if (score < 40) wellnessStatus = "Action Needed";

    // 2. GENERATE RISK RADAR
    const riskRadar: RiskCategory[] = [];
    const organs: ('HEART' | 'BRAIN' | 'LUNGS' | 'STOMACH' | 'JOINTS')[] = [];

    // Metabolic Risk
    if (bmiValue > 25 || input.familyDiabetes || (input.fastingSugar && input.fastingSugar > 100)) {
        riskRadar.push({
            category: "Metabolic Health",
            status: bmiValue > 30 ? "High Risk" : "Medium Risk",
            reasoning: `BMI ${bmiValue} + ${input.familyDiabetes ? 'Family History' : 'Lifestyle Factors'}`
        });
        organs.push('HEART', 'STOMACH');
    } else {
        riskRadar.push({ category: "Metabolic Health", status: "Low Risk", reasoning: "BMI Normal & No Family History" });
    }

    // Cardiovascular Risk
    if (input.smoking || (input.systolicBp && input.systolicBp > 130) || input.feetSwelling) {
        riskRadar.push({
            category: "Cardiovascular",
            status: input.smoking ? "High Risk" : "Medium Risk",
            reasoning: input.smoking ? "Smoker Status is major risk factor" : "Elevated BP / Symptoms"
        });
        organs.push('HEART');
    } else {
        riskRadar.push({ category: "Cardiovascular", status: "Low Risk", reasoning: "No acute symptoms reported" });
    }

    // Nutritional Risk (The "Vibe" mapping)
    const complaints = input.primaryComplaints || [];
    if (complaints.includes('Fatigue/Weakness') && (input.diet === 'Veg' || input.diet === 'Vegan')) {
         riskRadar.push({
             category: "Nutritional Balance",
             status: "Medium Risk",
             reasoning: "Fatigue + Plant-based diet suggests B12/Iron gaps"
         });
    } else {
         riskRadar.push({ category: "Nutritional Balance", status: "Low Risk", reasoning: "Diet and Energy levels appear aligned" });
    }

    // 3. SIMULATED LABS (The "Cool" Part)
    const simulatedLabs: SimulatedLab[] = [];
    
    // Glucose Prediction
    if (bmiValue > 25 || input.familyDiabetes) {
        simulatedLabs.push({
            testName: "Fasting Blood Sugar",
            predictedRange: "100 - 125 mg/dL",
            status: "Borderline",
            insight: "Inputs suggest insulin resistance."
        });
    } else {
        simulatedLabs.push({
            testName: "Fasting Blood Sugar",
            predictedRange: "80 - 99 mg/dL",
            status: "Normal",
            insight: "Metabolic indicators are stable."
        });
    }

    // Vitamin D Prediction (Based on 'Sedentary/Desk' + 'Fatigue')
    if (input.workType === 'Desk' && complaints.includes('Fatigue/Weakness')) {
        simulatedLabs.push({
            testName: "Vitamin D3",
            predictedRange: "15 - 25 ng/mL",
            status: "Low",
            insight: "Indoor lifestyle often correlates with deficiency."
        });
    }

    // Hemoglobin Prediction (Pale check)
    if (input.isPale || (input.gender === 'Female' && complaints.includes('Fatigue/Weakness'))) {
        simulatedLabs.push({
            testName: "Hemoglobin",
            predictedRange: "10.5 - 11.5 g/dL",
            status: "Low",
            insight: "Symptoms match mild anemia profile."
        });
    } else {
        simulatedLabs.push({
            testName: "Hemoglobin",
            predictedRange: "13.5 - 15.5 g/dL",
            status: "Normal",
            insight: "No pallor or exhaustion reported."
        });
    }

    // 4. ACTION PLAN
    const recommendedTests = ["Lipid Profile", "Complete Blood Count (CBC)"];
    if (riskRadar.find(r => r.category === "Metabolic Health" && r.status !== "Low Risk")) recommendedTests.push("HbA1c (Diabetes Screen)");
    if (input.age && input.age > 40) recommendedTests.push("Kidney Function Test (KFT)");

    const actionPlanSteps = [
        input.dailyWaterIntake && input.dailyWaterIntake < 2 ? "Increase water intake to 2.5L daily" : "Maintain hydration",
        input.activityLevel === 'Sedentary' ? "Start with 20 min brisk walking daily" : "Maintain active routine",
        "Schedule the recommended lab tests within 2 weeks"
    ];

    // 5. DOCTOR'S NOTE
    const doctorsNote = `Hey ${input.gender === 'Male' ? 'mate' : 'there'}, based on your age (${input.age}) and symptoms, your wellness score is ${score}/100. 
    ${score < 70 ? "Your lifestyle inputs (like stress and activity) are pulling your score down." : "You're doing a great job maintaining a baseline."}
    ${complaints.length > 0 ? `I'm noticing a pattern with your ${complaints[0].toLowerCase()} that points towards ${riskRadar.find(r => r.status !== 'Low Risk')?.category || 'minor nutritional gaps'}.` : "No major complaints is a great sign!"}
    The simulated lab view below shows where your levels *might* be. Let's get them tested to be sure!`;

    // Vitals Logic for Display
    let bpString = "N/A";
    let hrString = "N/A";
    if (input.systolicBp) {
        bpString = `${input.systolicBp}/${input.diastolicBp}`;
        hrString = `${input.pulseRate} bpm`;
    } else {
        // Predict
        bpString = (input.perceivedStress && input.perceivedStress > 7) ? "130/85 (Est)" : "120/80 (Est)";
        hrString = (input.activityLevel === 'Active') ? "65 bpm (Est)" : "75 bpm (Est)";
    }

    return {
      type: 'ASSUMPTION',
      date: new Date().toLocaleDateString(),
      wellnessScore: score,
      wellnessStatus: wellnessStatus,
      riskRadar: riskRadar,
      simulatedLabs: simulatedLabs,
      recommendedTests: recommendedTests,
      actionPlanSteps: actionPlanSteps,
      doctorsNote: doctorsNote,
      summary: `Wellness Score: ${score}/100. ${wellnessStatus}.`,
      vitals: { 
          bp: bpString, 
          heartRate: hrString, 
          bmi: bmiValue.toString(),
          stressLevel: input.perceivedStress || 5,
          isPredicted: !input.systolicBp
      },
      flags: riskRadar.filter(r => r.status !== 'Low Risk').map(r => r.category),
      affectedOrgans: Array.from(new Set(organs)),
      graphLogicTrace: logicTrace
    };
  }
};

// --- DIET PLAN GENERATOR (7-DAY, 3-OPTIONS) ---

const FOOD_DB: { [key: string]: DishOption[] } = {
  BREAKFAST: [
    { id: 'b1', name: 'Besan Chilla with Mint Chutney', shortReason: 'High protein, lower carbs.', tags: ['High Protein', 'Diabetic Friendly'], calories: 280, prepTime: '15 min', ingredients: ['Gram flour', 'Onions', 'Mint', 'Spices'], recipeSteps: ['Mix flour and water', 'Add veggies', 'Cook on pan'] },
    { id: 'b2', name: 'Vegetable Poha with Peanuts', shortReason: 'High fiber, steady energy.', tags: ['Fiber Rich'], calories: 300, prepTime: '20 min', ingredients: ['Flattened rice', 'Peas', 'Peanuts', 'Mustard seeds'], recipeSteps: ['Rinse poha', 'Sauté veggies', 'Mix and serve'] },
    { id: 'b3', name: 'Oats Upma with Veggies', shortReason: 'Heart healthy fiber.', tags: ['Heart Healthy'], calories: 250, prepTime: '15 min', ingredients: ['Rolled oats', 'Carrots', 'Beans', 'Curry leaves'], recipeSteps: ['Roast oats', 'Sauté veggies', 'Cook together'] },
    { id: 'b4', name: 'Multigrain Toast & Eggs', shortReason: 'Protein boost.', tags: ['High Protein', 'Non-Veg'], calories: 350, prepTime: '10 min', ingredients: ['Multigrain bread', 'Eggs', 'Pepper'], recipeSteps: ['Toast bread', 'Scramble/Boil eggs', 'Serve'] },
    { id: 'b5', name: 'Methi Thepla with Curd', shortReason: 'Good for blood sugar.', tags: ['Diabetic Friendly'], calories: 220, prepTime: '20 min', ingredients: ['Wheat flour', 'Fenugreek leaves', 'Yogurt'], recipeSteps: ['Knead dough', 'Roll and cook', 'Serve with curd'] },
    { id: 'b6', name: 'Smoothie Bowl (Berries & Seeds)', shortReason: 'Antioxidant rich.', tags: ['Vegan', 'Heart Healthy'], calories: 320, prepTime: '10 min', ingredients: ['Frozen berries', 'Chia seeds', 'Almond milk'], recipeSteps: ['Blend fruits', 'Top with seeds', 'Serve cold'] },
  ],
  LUNCH: [
    { id: 'l1', name: 'Dal Tadka & Brown Rice', shortReason: 'Complete protein source.', tags: ['High Protein', 'Fiber Rich'], calories: 450, prepTime: '30 min', ingredients: ['Toor dal', 'Brown rice', 'Garlic', 'Ghee'], recipeSteps: ['Boil dal', 'Prepare tadka', 'Serve with rice'] },
    { id: 'l2', name: 'Grilled Chicken Salad', shortReason: 'Lean protein, low carb.', tags: ['High Protein', 'Non-Veg', 'Keto'], calories: 380, prepTime: '25 min', ingredients: ['Chicken breast', 'Lettuce', 'Olive oil', 'Cucumber'], recipeSteps: ['Grill chicken', 'Chop veggies', 'Toss with dressing'] },
    { id: 'l3', name: 'Roti with Palak Paneer', shortReason: 'Iron and Calcium rich.', tags: ['High Protein'], calories: 500, prepTime: '40 min', ingredients: ['Wheat flour', 'Spinach', 'Paneer', 'Spices'], recipeSteps: ['Blanch spinach', 'Cook gravy', 'Add paneer'] },
    { id: 'l4', name: 'Quinoa Khichdi', shortReason: 'Light and easy to digest.', tags: ['Gluten Free', 'Vegan'], calories: 350, prepTime: '25 min', ingredients: ['Quinoa', 'Moong dal', 'Ghee', 'Veggies'], recipeSteps: ['Rinse quinoa', 'Pressure cook with dal', 'Serve hot'] },
    { id: 'l5', name: 'Rajma Masala & Rice', shortReason: 'High fiber comfort food.', tags: ['Fiber Rich'], calories: 550, prepTime: '45 min', ingredients: ['Kidney beans', 'Rice', 'Tomato', 'Onion'], recipeSteps: ['Soak rajma', 'Cook gravy', 'Simmer until soft'] },
  ],
  DINNER: [
    { id: 'd1', name: 'Grilled Fish with Steamed Veg', shortReason: 'Omega-3 rich, light.', tags: ['Heart Healthy', 'Non-Veg'], calories: 350, prepTime: '25 min', ingredients: ['White fish', 'Lemon', 'Broccoli', 'Carrots'], recipeSteps: ['Marinate fish', 'Grill', 'Steam veggies'] },
    { id: 'd2', name: 'Stir Fry Tofu & Veggies', shortReason: 'Plant protein powerhouse.', tags: ['Vegan', 'High Protein'], calories: 300, prepTime: '20 min', ingredients: ['Tofu', 'Bell peppers', 'Soy sauce', 'Ginger'], recipeSteps: ['Press tofu', 'Stir fry veggies', 'Combine'] },
    { id: 'd3', name: 'Moong Dal Cheela', shortReason: 'Very low carb dinner.', tags: ['Diabetic Friendly'], calories: 250, prepTime: '20 min', ingredients: ['Moong dal', 'Green chillies', 'Coriander'], recipeSteps: ['Grind soaked dal', 'Spread on pan', 'Cook till crisp'] },
    { id: 'd4', name: 'Millet Khichdi', shortReason: 'Slow release energy.', tags: ['Gluten Free'], calories: 320, prepTime: '30 min', ingredients: ['Foxtail millet', 'Lentils', 'Ghee'], recipeSteps: ['Wash millet', 'Cook with spices', 'Serve warm'] },
    { id: 'd5', name: 'Chicken Clear Soup', shortReason: 'Hydrating and light.', tags: ['Non-Veg', 'Low Calorie'], calories: 200, prepTime: '40 min', ingredients: ['Chicken bone broth', 'Celery', 'Carrots'], recipeSteps: ['Simmer broth', 'Add veggies', 'Season'] },
  ]
};

const filterDishes = (category: string, pref: DietPreferences, flags: string[]): DishOption[] => {
    let pool = FOOD_DB[category] || [];
    
    // 1. Diet Type Filter
    if (pref.type === 'Veg' || pref.type === 'Vegan') {
        pool = pool.filter(d => !d.tags.includes('Non-Veg'));
    }
    if (pref.type === 'Vegan') {
        pool = pool.filter(d => d.tags.includes('Vegan') || !d.ingredients.some(i => ['Curd', 'Ghee', 'Paneer', 'Yogurt', 'Eggs'].includes(i)));
    }

    // 2. Health Flag Logic (Simulated AI)
    if (flags.includes('Metabolic Health') || flags.includes('Diabetes')) {
        // Prioritize diabetic friendly, penalize high carb implicitly by boosting protein/fiber
        pool = pool.sort((a, b) => (b.tags.includes('Diabetic Friendly') ? 1 : 0) - (a.tags.includes('Diabetic Friendly') ? 1 : 0));
    }
    if (flags.includes('Cardiovascular') || flags.includes('High Cholesterol')) {
        pool = pool.filter(d => d.tags.includes('Heart Healthy') || d.tags.includes('Fiber Rich') || d.tags.includes('Vegan'));
    }

    return pool;
};

// --- RECIPE GENERATION (REAL AI) ---
export const generateDetailedRecipe = async (dishName: string, healthFlags: string[]): Promise<DishOption> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const model = 'gemini-2.5-flash';

        const prompt = `Create a detailed, healthy cooking recipe for "${dishName}".
        Tailor it for a patient with the following health considerations: ${healthFlags.join(', ')}.
        Include preparation time, ingredient list with quantities, and clear step-by-step cooking instructions.
        Explain briefly why this is good for their specific health condition.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        shortReason: { type: Type.STRING },
                        prepTime: { type: Type.STRING },
                        calories: { type: Type.NUMBER },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recipeSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    }
                }
            }
        });

        // The SDK returns text which is a JSON string.
        const jsonText = response.text || "{}";
        const json = JSON.parse(jsonText);
        
        return {
            id: `gen_${Date.now()}`,
            name: json.name || dishName,
            shortReason: json.shortReason || "Customized for your health.",
            prepTime: json.prepTime || "20 mins",
            calories: json.calories || 300,
            tags: json.tags || [],
            ingredients: json.ingredients || [],
            recipeSteps: json.recipeSteps || []
        };

    } catch (error) {
        console.error("Recipe generation failed", error);
        // Fallback to basic info if AI fails
        return {
            id: 'err',
            name: dishName,
            shortReason: 'Detailed recipe unavailable offline.',
            recipeSteps: ['Please consult a nutritionist.'],
            ingredients: ['Not available'],
            prepTime: 'N/A',
            calories: 0,
            tags: []
        };
    }
}

export const generateWeeklyDietPlan = async (preferences: DietPreferences, report?: HealthReport): Promise<WeeklyPlan> => {
    await new Promise(r => setTimeout(r, 2000)); // Simulate generation
    
    const flags = report?.flags || [];
    const days: DayPlan[] = [];
    const dayLabels = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

    for (let i = 0; i < 7; i++) {
        const meals: MealSlot[] = [];
        
        // 1. Breakfast (or Brunch if 2 meals)
        const bfOptions = filterDishes('BREAKFAST', preferences, flags);
        // Shuffle and pick 3
        const bfPicks = bfOptions.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        meals.push({
            type: preferences.mealsPerDay === 2 ? 'Brunch' : 'Breakfast',
            timeSuggestion: preferences.mealsPerDay === 2 ? '10:30 AM - 11:30 AM' : '8:00 AM - 9:00 AM',
            options: bfPicks
        });

        // 2. Lunch (Only if 3 meals)
        if (preferences.mealsPerDay === 3) {
             const lunchOptions = filterDishes('LUNCH', preferences, flags);
             const lunchPicks = lunchOptions.sort(() => 0.5 - Math.random()).slice(0, 3);
             meals.push({
                type: 'Lunch',
                timeSuggestion: '1:00 PM - 2:00 PM',
                options: lunchPicks
             });
        }

        // 3. Dinner
        const dinnerOptions = filterDishes('DINNER', preferences, flags);
        const dinnerPicks = dinnerOptions.sort(() => 0.5 - Math.random()).slice(0, 3);
        meals.push({
            type: 'Dinner',
            timeSuggestion: preferences.mealsPerDay === 2 ? '7:00 PM - 8:00 PM' : '8:00 PM - 9:00 PM',
            options: dinnerPicks
        });

        days.push({
            dayIndex: i,
            label: dayLabels[i],
            meals: meals
        });
    }

    return {
        days,
        generatedAt: Date.now(),
        preferences
    };
};

// Legacy support (to be deprecated or mapped)
export const generateDietPlan = async (country: string, pref: string): Promise<DietPlan> => {
  // Mapping to new system internally if needed, but keeping separate for now to avoid breaking other imports
  await new Promise(r => setTimeout(r, 1500));
  const isVeg = pref === 'VEG' || pref === 'VEGAN';
  return {
    country,
    preference: pref as any,
    summary: `A balanced ${pref.toLowerCase()} diet plan optimized for ${country}n cuisine.`,
    meals: {
      breakfast: isVeg ? "Oatmeal with nuts & berries" : "Egg white omelet",
      lunch: isVeg ? "Lentil soup (Dal) & rice" : "Grilled chicken & quinoa",
      dinner: isVeg ? "Steamed vegetables & tofu" : "Baked fish & greens"
    }
  };
};

export const runFitnessCheckup = async (history: FitnessMessage[], input: string): Promise<string> => {
  await new Promise(r => setTimeout(r, 1000));
  const lower = input.toLowerCase();
  if (lower.includes('pain') || lower.includes('chest') || lower.includes('faint')) {
    return "ALERT: Your response indicates a potential medical issue. I have flagged this for the hospital team. Please go to the 'Emergency Query' tab immediately.";
  }
  if (history.length < 2) return "I see. How have your energy levels been throughout the day? (1-10)";
  if (history.length < 4) return "Have you experienced any shortness of breath during simple activities like walking?";
  if (history.length < 6) return "Are you getting at least 7 hours of sleep regularly?";
  return "Thank you. Based on this quick checkup, your health trajectory looks stable. Keep maintaining your hydration and light activity. Next checkup scheduled in 2 weeks.";
};
