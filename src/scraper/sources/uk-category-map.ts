import type { ProcurementCategory } from "../../types/index.js";

// UK service/staffing tenders (OT, nursing, social work) rarely carry a
// clean CPV code the way equipment tenders do, so keyword matching on the
// title/description comes first, falling back to CPV prefix matching.
const KEYWORD_CATEGORY_MAP: Array<{ keywords: RegExp; category: ProcurementCategory }> = [
  // Patient transport (usually non-emergency) — checked before paramedic so an
  // explicit "patient transport service" doesn't get swept up as ambulance.
  { keywords: /patient transport|non.?emergency transport|\bpts\b|non.?emergency patient/i, category: "patient_transport" },
  // Paramedic / ambulance / emergency medical services — checked before
  // allied_health so they don't fall into it via the broad "paramedical
  // services" CPV (85142000).
  { keywords: /ambulance|paramedic|rettungsdienst|emergency medical|rescue service|emergency response/i, category: "paramedic_services" },
  // Allied health / rehabilitation therapies AND allied-health equipment
  // (OT equipment — mobility aids, home adaptations, assistive tech, daily
  // living aids). Checked before clinical_services so OT & physiotherapy land
  // in their own category rather than the generic clinical bucket.
  { keywords: /occupational therap|physiotherap|physical therap|\bphysio\b|speech.?and.?language|\bslt\b|dietet|podiatr|osteopath|rehabilitation therap|occupational therapy equipment|\bot equipment\b|mobility aid|walking aid|home adaptation|assistive technolog|daily living aid|grab rail|rehabilitation equipment|disability equipment/i, category: "allied_health" },
  { keywords: /nursing agency|clinical staff|\blocum\b|therapist/i, category: "clinical_services" },
  { keywords: /social care|adult social|children.?s social|domiciliary care|care worker|residential care|social work/i, category: "social_care" },
  { keywords: /personal protective equipment|\bppe\b|surgical gown|face mask/i, category: "personal_protective_equipment" },
  { keywords: /surgical instrument|robotic surgery|surgical kit|surgical device|surgical stapler|endoscop|laparoscop|arthroscop|orthopaedic implant|orthopedic implant|scalpel|forceps|operating theatre equipment|operating room equipment/i, category: "surgical_instruments" },
  { keywords: /diagnostic|pathology|imaging|radiolog/i, category: "diagnostics" },
  { keywords: /pharmac|medicine|drug supply/i, category: "pharmaceuticals" },
  { keywords: /telehealth|telemedicine|remote monitoring/i, category: "telemedicine" },
  { keywords: /electronic health record|health it|clinical system|nhs digital/i, category: "health_it" },
  { keywords: /laboratory|lab equipment/i, category: "laboratory_equipment" },
  { keywords: /hospital construction|hospital building|modular hospital/i, category: "hospital_infrastructure" },
];

const CPV_CATEGORY_MAP: Record<string, ProcurementCategory> = {
  "33169000": "surgical_instruments", // surgical instruments
  "33162000": "surgical_instruments", // operating theatre apparatus
  "33100000": "medical_devices",
  "33140000": "personal_protective_equipment",
  "33600000": "pharmaceuticals",
  "38000000": "laboratory_equipment",
  "48000000": "health_it",
  "85140000": "telemedicine",
  "85143000": "paramedic_services", // ambulance services
  "85142100": "allied_health", // physiotherapy services
  "85142000": "allied_health", // paramedical services (physio, OT, SLT, etc.)
  "85312500": "allied_health", // rehabilitation services
  "33196200": "allied_health", // devices for the disabled (OT equipment)
  "33196000": "allied_health", // medical aids (OT / assistive equipment)
  "85300000": "social_care", // social work and related services
  "85310000": "social_care", // social work services
  "45000000": "hospital_infrastructure",
};

export function classifyUkTender(title: string, description: string, cpvCode?: string): ProcurementCategory {
  const text = `${title} ${description}`;
  for (const { keywords, category } of KEYWORD_CATEGORY_MAP) {
    if (keywords.test(text)) return category;
  }
  if (cpvCode) {
    const prefix = cpvCode.replace(/\D/g, "").slice(0, 8);
    for (const [code, category] of Object.entries(CPV_CATEGORY_MAP)) {
      if (prefix.startsWith(code.slice(0, 6))) return category;
    }
  }
  return "other";
}
