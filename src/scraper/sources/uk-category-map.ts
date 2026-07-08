import type { ProcurementCategory } from "../../types/index.js";

// UK service/staffing tenders (OT, nursing, social work) rarely carry a
// clean CPV code the way equipment tenders do, so keyword matching on the
// title/description comes first, falling back to CPV prefix matching.
const KEYWORD_CATEGORY_MAP: Array<{ keywords: RegExp; category: ProcurementCategory }> = [
  { keywords: /occupational therap|physiotherap|speech.?and.?language|nursing agency|clinical staff|therapist/i, category: "clinical_services" },
  { keywords: /social care|adult social|children.?s social|domiciliary care|care worker|residential care|social work/i, category: "social_care" },
  { keywords: /personal protective equipment|\bppe\b|surgical gown|face mask/i, category: "personal_protective_equipment" },
  { keywords: /surgical instrument|robotic surgery|surgical kit/i, category: "surgical_instruments" },
  { keywords: /diagnostic|pathology|imaging|radiolog/i, category: "diagnostics" },
  { keywords: /pharmac|medicine|drug supply/i, category: "pharmaceuticals" },
  { keywords: /telehealth|telemedicine|remote monitoring/i, category: "telemedicine" },
  { keywords: /electronic health record|health it|clinical system|nhs digital/i, category: "health_it" },
  { keywords: /laboratory|lab equipment/i, category: "laboratory_equipment" },
  { keywords: /hospital construction|hospital building|modular hospital/i, category: "hospital_infrastructure" },
];

const CPV_CATEGORY_MAP: Record<string, ProcurementCategory> = {
  "33100000": "medical_devices",
  "33140000": "personal_protective_equipment",
  "33600000": "pharmaceuticals",
  "38000000": "laboratory_equipment",
  "48000000": "health_it",
  "85140000": "telemedicine",
  "85142000": "clinical_services", // medical practitioner / paramedical services
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
