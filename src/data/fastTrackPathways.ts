// Fast-Track (CarePath) clinical and navigation config. This is appointment
// NAVIGATION, never diagnosis. The 7 core NHS Pharmacy First pathways are encoded
// as verified (publicly documented, live since 2024). Newer/expansion pathways and
// anything subject to local ICB commissioning carry status "check_locally" so the
// UI shows a "Confirm with your pharmacy / current NHS England guidance" badge
// rather than asserting unverified clinical rules as fact.

export type PathwayStatus = "verified" | "check_locally";

export interface PharmacyFirstPathway {
  id: string;
  name: string;
  status: PathwayStatus;
  ageRule: string;
  exclusions: string[];
  note?: string;
}

// 7 core NHS Pharmacy First clinical pathways (England), available nationwide.
export const PHARMACY_FIRST_CORE: PharmacyFirstPathway[] = [
  {
    id: "uti",
    name: "Uncomplicated urinary tract infection (UTI)",
    status: "verified",
    ageRule: "Women aged 16 to 64",
    exclusions: ["Pregnancy", "Under 16 or 65 and over", "Fever, rigors or feeling very unwell", "Flank or lower back pain", "Recurrent UTIs", "Men and catheter users"],
    note: "If excluded, your pharmacist will direct you to your GP or NHS 111.",
  },
  {
    id: "sore_throat",
    name: "Acute sore throat",
    status: "verified",
    ageRule: "Aged 5 and over",
    exclusions: ["Difficulty breathing or swallowing saliva", "Severe or one-sided throat swelling", "Signs of serious infection"],
  },
  {
    id: "earache",
    name: "Acute otitis media (childhood earache)",
    status: "verified",
    ageRule: "Aged 1 to 17",
    exclusions: ["Distance-selling (online) pharmacies cannot provide this; it must be in person", "Discharge, severe pain or a very unwell child may need GP or 111"],
    note: "In-person pharmacy only.",
  },
  {
    id: "sinusitis",
    name: "Acute sinusitis",
    status: "verified",
    ageRule: "Aged 12 and over",
    exclusions: ["Symptoms suggesting a serious complication (swelling around the eye, severe headache)"],
  },
  {
    id: "impetigo",
    name: "Impetigo",
    status: "verified",
    ageRule: "Aged 1 and over",
    exclusions: ["Widespread or recurrent impetigo", "Signs of spreading infection or feeling unwell"],
  },
  {
    id: "insect_bites",
    name: "Infected insect bites",
    status: "verified",
    ageRule: "Aged 1 and over",
    exclusions: ["Spreading redness, fever or feeling unwell", "Bites near the eye"],
  },
  {
    id: "shingles",
    name: "Shingles",
    status: "verified",
    ageRule: "Aged 18 and over",
    exclusions: ["Rash near the eye", "Pregnancy", "Severely weakened immune system"],
  },
];

// Expansion / newer prescribing pathways. Rollout and local availability vary, so
// these are "check_locally" and must be confirmed with the pharmacy or current NHS
// England guidance, never presented as settled nationwide rules.
export const PHARMACY_FIRST_EXPANSION: PharmacyFirstPathway[] = [
  { id: "hay_fever_child", name: "Childhood hay fever (seasonal allergic rhinitis)", status: "check_locally", ageRule: "Reported for children (approx. 4 to 11)", exclusions: ["Confirm eligibility and availability with your local pharmacy"] },
  { id: "acne", name: "Mild to moderate acne", status: "check_locally", ageRule: "Reported for young people and adults", exclusions: ["Confirm with your local pharmacy"] },
  { id: "migraine", name: "Adult episodic migraine (low frequency)", status: "check_locally", ageRule: "Reported for adults (approx. 18 to 64)", exclusions: ["New, severe or unusual headache needs urgent assessment, call 111 or 999", "Confirm with your local pharmacy"] },
  { id: "otitis_externa", name: "Outer ear infection (otitis externa)", status: "check_locally", ageRule: "Reported for adults 18 and over", exclusions: ["Confirm with your local pharmacy"] },
  { id: "skin_soft_tissue", name: "Mild skin & soft-tissue infections / scabies", status: "check_locally", ageRule: "Per pathway, eligible children and adults", exclusions: ["Confirm with your local pharmacy"] },
];

export interface WomensHealthPathway {
  id: string;
  name: string;
  specialtyCategory: string;
  prepPrompts: string[];
}

// Women's health: strictly appointment preparation, aligned to NHS/NICE navigation.
export const WOMENS_HEALTH: WomensHealthPathway[] = [
  { id: "endometriosis", name: "Endometriosis & chronic pelvic pain", specialtyCategory: "clinical_services", prepPrompts: ["Where is the pain and how long have you had it?", "How does it track with your cycle?", "Pain score at its worst (0 to 10) and how it affects daily life, work, sleep", "What you have already tried (pain relief, hormonal options)"] },
  { id: "pcos", name: "PCOS & cycle irregularities", specialtyCategory: "clinical_services", prepPrompts: ["Cycle length and how irregular it is", "Other changes (skin, hair, weight)", "Family history", "Any fertility plans or concerns"] },
  { id: "fibroids", name: "Fibroids & heavy menstrual bleeding", specialtyCategory: "clinical_services", prepPrompts: ["How heavy is bleeding (flooding, clots, products used per hour)?", "Impact on daily life and energy (tiredness suggests you may want iron checked)", "Pain and cycle length", "Previous treatments"] },
  { id: "menopause", name: "Perimenopause & menopause support", specialtyCategory: "clinical_services", prepPrompts: ["Main symptoms and how long", "Impact on sleep, mood, work", "Cycle changes", "Preferences and questions about options (including HRT)"] },
  { id: "gynae_fertility", name: "Gynaecology / fertility specialist pathway", specialtyCategory: "clinical_services", prepPrompts: ["Main concern and timeline", "Cycle details", "Relevant history", "Questions you want answered at the appointment"] },
  { id: "recurrent_uti", name: "Recurrent UTI & bladder comfort", specialtyCategory: "clinical_services", prepPrompts: ["How many infections in the last 6 to 12 months?", "Triggers you have noticed", "What has helped or not", "Impact on daily life"] },
];

export interface RightToChoosePathway {
  id: string;
  name: string;
  specialtyCategory: string;
}

// NHS Right to Choose / waiting-list conditions, mapped to the nearest procurement
// category so the search can surface commissioned services in the patient's region.
export const RIGHT_TO_CHOOSE: RightToChoosePathway[] = [
  { id: "dermatology", name: "Dermatology", specialtyCategory: "clinical_services" },
  { id: "ent", name: "ENT (Ear, Nose & Throat)", specialtyCategory: "clinical_services" },
  { id: "physio_msk", name: "Physiotherapy & MSK", specialtyCategory: "allied_health" },
  { id: "imaging", name: "Diagnostic Ultrasound / MRI Scan", specialtyCategory: "diagnostics" },
  { id: "adhd_autism", name: "ADHD & Autism Assessment (Adult & Child)", specialtyCategory: "clinical_services" },
];

export interface SelfCareTopic {
  id: string;
  name: string;
  tips: string[];
}

// Tab 3: strictly neutral comfort and lifestyle support. No treatment or cure
// claims. Every topic defers to a pharmacist or GP.
export const SELF_CARE: SelfCareTopic[] = [
  { id: "stress_sleep", name: "Stress & sleep support", tips: ["A consistent wind-down routine and regular sleep and wake times", "Reducing caffeine later in the day", "Light daytime activity and daylight exposure", "If stress or sleep problems persist or affect daily life, speak to your pharmacist or GP"] },
  { id: "gut", name: "Gut health & bloating", tips: ["Regular meals, fibre and hydration", "Noticing foods that seem to trigger symptoms", "Gentle movement after meals", "Persistent changes in bowel habit, pain or weight loss should be checked by your GP"] },
  { id: "eczema_skin", name: "Eczema & sensitive skin", tips: ["Frequent fragrance-free moisturising", "Gentle, non-soap washes and lukewarm water", "Avoiding known irritants", "Your pharmacist can advise on emollients; see your GP if skin is infected or not improving"] },
  { id: "immune_seasonal", name: "Immune & seasonal wellness", tips: ["A balanced diet, hydration and rest", "Staying up to date with eligible NHS vaccinations", "Hand hygiene in cold and flu season", "Speak to your pharmacist about seasonal symptoms and eligibility for free NHS services"] },
];

export const PRACTITIONER_SPECIALTIES = ["Homeopathy", "Acupuncture", "Osteopathy", "Nutritional Therapy", "Pelvic Health", "Other"] as const;

// Map a free-text condition or pathway id to the nearest procurement category used
// in the contracts database, so the provider search can find commissioned services.
export function conditionToCategory(condition: string): string {
  const c = (condition || "").toLowerCase();
  if (/physio|msk|muscul|joint|back|knee/.test(c)) return "allied_health";
  if (/mri|ultrasound|scan|imag|x.?ray|diagnostic/.test(c)) return "diagnostics";
  if (/medicine|prescrib|pharmac/.test(c)) return "pharmaceuticals";
  if (/occupational|\bot\b/.test(c)) return "occupational_therapy";
  return "clinical_services";
}
