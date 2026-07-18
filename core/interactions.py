"""Curated drug/allergy interaction table for the LiveRoom safety alert.

Per the demo script: we do NOT ask an LLM to invent pharmacology live. This is a
small, deterministic lookup keyed on the substances we've rehearsed. Adding a new
pair is a one-line change — treat this as the demo's formulary, not a real one.

All keys are lowercased. `contains` matches substring in either direction so
`amoxicillin` triggers the `penicillin` class allergy.
"""
from __future__ import annotations

# Class-level allergies: if the patient is allergic to KEY, avoid any drug whose name
# contains one of these tokens.
ALLERGY_CLASSES: dict[str, list[str]] = {
    "penicillin": ["amoxicillin", "ampicillin", "penicillin", "augmentin", "dicloxacillin"],
    "sulfa": ["sulfamethoxazole", "bactrim", "sulfonamide", "sulfadiazine"],
    "nsaid": ["ibuprofen", "naproxen", "aspirin", "ketorolac", "diclofenac"],
    "aspirin": ["aspirin", "asa"],
    "codeine": ["codeine", "hydrocodone", "oxycodone"],
    "latex": [],  # non-drug, informational only
}

# A minimal known-drug lexicon so a stray word in the transcript ("amoxicillin") is
# recognized as a drug even if the surrounding sentence is casual. Extending this at
# demo time is cheap — one line per drug.
KNOWN_DRUGS = {
    "amoxicillin", "azithromycin", "ampicillin", "penicillin", "augmentin",
    "ibuprofen", "acetaminophen", "tylenol", "aspirin", "asa",
    "metformin", "insulin", "lisinopril", "atorvastatin",
    "warfarin", "heparin", "morphine", "codeine", "oxycodone", "hydrocodone",
    "bactrim", "sulfamethoxazole", "ciprofloxacin", "ceftriaxone",
    "prednisone", "albuterol", "omeprazole",
}


def check_drug_against_allergies(drug: str, patient_allergies: list[str]) -> dict | None:
    """If `drug` is contraindicated by any of `patient_allergies`, return an alert dict.
    Otherwise return None. Comparison is lowercase and substring-based so we catch
    'the patient's allergic to penicillins' vs 'penicillin'."""
    drug_lc = (drug or "").strip().lower()
    if not drug_lc:
        return None

    for raw_allergy in patient_allergies or []:
        allergy_lc = (raw_allergy or "").strip().lower()
        if not allergy_lc:
            continue

        # Direct class-name match (patient allergy 'penicillin' → check the class list).
        for class_name, members in ALLERGY_CLASSES.items():
            if class_name in allergy_lc:
                if any(m in drug_lc or drug_lc in m for m in members) or class_name in drug_lc:
                    return {
                        "kind": "drug_allergy",
                        "severity": "high",
                        "drug": drug,
                        "allergy": raw_allergy,
                        "class": class_name,
                        "message": (
                            f"⚠ {drug.title()} is contraindicated — patient allergic to "
                            f"{class_name} (on record)."
                        ),
                    }

        # Direct substring overlap (patient allergy 'amoxicillin' and drug 'amoxicillin').
        if allergy_lc in drug_lc or drug_lc in allergy_lc:
            return {
                "kind": "drug_allergy",
                "severity": "high",
                "drug": drug,
                "allergy": raw_allergy,
                "class": None,
                "message": f"⚠ {drug.title()} is contraindicated — patient allergic to {raw_allergy}.",
            }

    return None


def is_known_drug(token: str) -> bool:
    return (token or "").strip().lower() in KNOWN_DRUGS
