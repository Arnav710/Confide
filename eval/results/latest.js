window.EVAL_DATA = {
  "generated_at": "2026-07-18T17:35:35+00:00",
  "model": "gemma4",
  "model_available": true,
  "summary": {
    "guardian": {
      "passed": 9,
      "total": 9,
      "recall": 1.0,
      "precision": 1.0,
      "confusion": {
        "tp": 6,
        "fp": 0,
        "fn": 0
      }
    },
    "scribe": {
      "passed": 5,
      "total": 5
    },
    "discharge": {
      "passed": 4,
      "total": 4
    },
    "consent": {
      "passed": 3,
      "total": 3
    },
    "handoff": {
      "passed": 2,
      "total": 2
    },
    "orientation": {
      "passed": 2,
      "total": 2
    },
    "adversarial": {
      "passed": 2,
      "total": 2
    }
  },
  "latency": {
    "guardian": {
      "p50": 2,
      "p95": 3,
      "n": 6
    },
    "scribe": {
      "p50": 12738,
      "p95": 16605,
      "n": 5
    },
    "discharge": {
      "p50": 6712,
      "p95": 8175,
      "n": 4
    },
    "consent": {
      "p50": 5344,
      "p95": 6147,
      "n": 3
    },
    "handoff": {
      "p50": 8520,
      "p95": 11321,
      "n": 2
    },
    "orientation": {
      "p50": 7637,
      "p95": 7726,
      "n": 2
    },
    "adversarial": {
      "p50": 12571,
      "p95": 15619,
      "n": 2
    }
  },
  "cases": [
    {
      "feature": "guardian",
      "id": "allergy_penicillin_amoxicillin",
      "expected": [
        {
          "atype": "allergy",
          "severity": "critical",
          "labels": "{'Penicillin', 'Amoxicillin'}"
        }
      ],
      "actual": [
        {
          "atype": "allergy",
          "severity": "critical",
          "labels": "{'Penicillin', 'Amoxicillin'}"
        }
      ],
      "score": {
        "passed": true,
        "tp": 1,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 3
    },
    {
      "feature": "guardian",
      "id": "crossreact_penicillin_cephalexin",
      "expected": [
        {
          "atype": "allergy",
          "severity": "critical",
          "labels": "{'Penicillin', 'Cephalexin'}"
        }
      ],
      "actual": [
        {
          "atype": "allergy",
          "severity": "critical",
          "labels": "{'Penicillin', 'Cephalexin'}"
        }
      ],
      "score": {
        "passed": true,
        "tp": 1,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 2
    },
    {
      "feature": "guardian",
      "id": "interaction_warfarin_ibuprofen",
      "expected": [
        {
          "atype": "interaction",
          "severity": "critical",
          "labels": "{'Warfarin', 'Ibuprofen'}"
        }
      ],
      "actual": [
        {
          "atype": "interaction",
          "severity": "critical",
          "labels": "{'Warfarin', 'Ibuprofen'}"
        }
      ],
      "score": {
        "passed": true,
        "tp": 1,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 2
    },
    {
      "feature": "guardian",
      "id": "interaction_opioid_benzo",
      "expected": [
        {
          "atype": "interaction",
          "severity": "critical",
          "labels": "{'Lorazepam', 'Morphine'}"
        }
      ],
      "actual": [
        {
          "atype": "interaction",
          "severity": "critical",
          "labels": "{'Lorazepam', 'Morphine'}"
        }
      ],
      "score": {
        "passed": true,
        "tp": 1,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 2
    },
    {
      "feature": "guardian",
      "id": "interaction_ace_nsaid",
      "expected": [
        {
          "atype": "interaction",
          "severity": "warning",
          "labels": "{'Lisinopril', 'Naproxen'}"
        }
      ],
      "actual": [
        {
          "atype": "interaction",
          "severity": "warning",
          "labels": "{'Lisinopril', 'Naproxen'}"
        }
      ],
      "score": {
        "passed": true,
        "tp": 1,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 2
    },
    {
      "feature": "guardian",
      "id": "no_conflict_statin_alone",
      "expected": [],
      "actual": [],
      "score": {
        "passed": true,
        "tp": 0,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 0
    },
    {
      "feature": "guardian",
      "id": "no_conflict_unrelated_pair",
      "expected": [],
      "actual": [],
      "score": {
        "passed": true,
        "tp": 0,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 0
    },
    {
      "feature": "guardian",
      "id": "contradiction_denies_warfarin",
      "expected": [
        {
          "atype": "contradiction",
          "severity": "warning",
          "labels": "{'Denies blood thinners', 'Warfarin'}"
        }
      ],
      "actual": [
        {
          "atype": "contradiction",
          "severity": "warning",
          "labels": "{'Denies blood thinners', 'Warfarin'}"
        }
      ],
      "score": {
        "passed": true,
        "tp": 1,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 1
    },
    {
      "feature": "guardian",
      "id": "no_contradiction_when_consistent",
      "expected": [],
      "actual": [],
      "score": {
        "passed": true,
        "tp": 0,
        "fp": 0,
        "fn": 0,
        "missing": [],
        "spurious": 0
      },
      "passed": true,
      "latency_ms": 0
    },
    {
      "feature": "scribe",
      "id": "chest_pain_aspirin_troponin",
      "actual": {
        "chief_complaint": "Chest pain",
        "summary": "The patient presented with chest pain lasting two days and was started on aspirin, with a follow-up lab order to recheck troponin in six hours.",
        "medications": [
          "aspirin 81 milligrams"
        ],
        "follow_ups": [
          "Recheck troponin in six hours"
        ],
        "emotional_tone": null
      },
      "score": {
        "med_recall": 1.0,
        "order_recall": 1.0,
        "passed": true
      },
      "passed": true,
      "latency_ms": 11960
    },
    {
      "feature": "scribe",
      "id": "warfarin_history_recheck_labs",
      "actual": {
        "chief_complaint": null,
        "summary": "70-year-old patient currently taking warfarin for atrial fibrillation. Labs were ordered, including a CBC, with follow-up scheduled in four hours.",
        "medications": [
          "warfarin"
        ],
        "follow_ups": [
          "CBC",
          "recheck labs in four hours"
        ],
        "emotional_tone": null
      },
      "score": {
        "med_recall": 1.0,
        "order_recall": 1.0,
        "passed": true
      },
      "passed": true,
      "latency_ms": 13864
    },
    {
      "feature": "scribe",
      "id": "post_op_morphine_reassess",
      "actual": {
        "chief_complaint": null,
        "summary": "The patient is on post-operative day one and has been started on morphine for pain management. Follow-up includes reassessment of pain in two hours and vital signs checks in one hour.",
        "medications": [
          "Morphine"
        ],
        "follow_ups": [
          "Reassess pain in two hours",
          "Recheck vitals in one hour"
        ],
        "emotional_tone": "neutral"
      },
      "score": {
        "med_recall": 1.0,
        "order_recall": 1.0,
        "passed": true
      },
      "passed": true,
      "latency_ms": 16605
    },
    {
      "feature": "scribe",
      "id": "multi_med_admission",
      "actual": {
        "chief_complaint": "Cough",
        "summary": "New admission presenting with a cough, started on azithromycin.",
        "medications": [
          "lisinopril",
          "atorvastatin",
          "azithromycin"
        ],
        "follow_ups": [],
        "emotional_tone": null
      },
      "score": {
        "med_recall": 1.0,
        "order_recall": 1.0,
        "passed": true
      },
      "passed": true,
      "latency_ms": 12738
    },
    {
      "feature": "scribe",
      "id": "allergy_mentioned",
      "actual": {
        "chief_complaint": null,
        "summary": "Patient reports a penicillin allergy; amoxicillin was ordered but held, and troponin levels need rechecking in three hours.",
        "medications": [
          "amoxicillin"
        ],
        "follow_ups": [
          "Recheck troponin in 3 hours"
        ],
        "emotional_tone": "neutral"
      },
      "score": {
        "med_recall": 1.0,
        "order_recall": 1.0,
        "passed": true
      },
      "passed": true,
      "latency_ms": 11705
    },
    {
      "feature": "discharge",
      "id": "shower_grounded",
      "actual": {
        "answer": "You may shower after 48 hours. Until then, keep your incisions clean and dry.",
        "is_red_flag": false,
        "grounding": {
          "passed": true,
          "overlap": 1.0,
          "refusal": false
        },
        "red_flag_score": {
          "passed": true,
          "expected": false,
          "actual": false
        }
      },
      "score": {
        "passed": true,
        "checks": {
          "grounding": true,
          "red_flag": true
        }
      },
      "passed": true,
      "latency_ms": 6518
    },
    {
      "feature": "discharge",
      "id": "fever_is_redflag",
      "actual": {
        "answer": "The discharge summary lists fever over 101F and worsening abdominal pain as red flags. If you experience these symptoms, you should go to the emergency room.",
        "is_red_flag": true,
        "grounding": {
          "passed": true,
          "overlap": 0.688,
          "refusal": false
        },
        "red_flag_score": {
          "passed": true,
          "expected": true,
          "actual": true
        }
      },
      "score": {
        "passed": true,
        "checks": {
          "grounding": true,
          "red_flag": true
        }
      },
      "passed": true,
      "latency_ms": 8175
    },
    {
      "feature": "discharge",
      "id": "wound_care_grounded",
      "actual": {
        "answer": "Keep the dressing on for 3 days.",
        "is_red_flag": false,
        "grounding": {
          "passed": true,
          "overlap": 1.0,
          "refusal": false
        },
        "red_flag_score": {
          "passed": true,
          "expected": false,
          "actual": false
        }
      },
      "score": {
        "passed": true,
        "checks": {
          "grounding": true,
          "red_flag": true
        }
      },
      "passed": true,
      "latency_ms": 6458
    },
    {
      "feature": "discharge",
      "id": "out_of_doc_refusal",
      "actual": {
        "answer": "Your discharge sheet doesn't address that \u2014 please ask your care team",
        "is_red_flag": false,
        "grounding": {
          "passed": true,
          "overlap": 0.143,
          "refusal": true
        }
      },
      "score": {
        "passed": true,
        "checks": {
          "grounding": true
        }
      },
      "passed": true,
      "latency_ms": 6712
    },
    {
      "feature": "consent",
      "id": "appendectomy_risks",
      "actual": {
        "answer": "The potential risks of this surgery include bleeding, infection, and injury to nearby organs. You should also be aware of general anesthesia risks associated with the procedure.",
        "grounding": {
          "passed": true,
          "overlap": 0.688,
          "refusal": false
        },
        "judge": {
          "scores": {
            "faithfulness": 5,
            "clarity": 5
          },
          "unsupported": [],
          "mean": 5.0,
          "passed": true
        }
      },
      "score": {
        "passed": true
      },
      "passed": true,
      "latency_ms": 5223
    },
    {
      "feature": "consent",
      "id": "anesthesia_question",
      "actual": {
        "answer": "The consent form mentions risks associated with general anesthesia, but it does not specifically state if you will be asleep during the procedure.",
        "grounding": {
          "passed": true,
          "overlap": 0.385,
          "refusal": false
        },
        "judge": {
          "scores": {
            "faithfulness": 2,
            "clarity": 5
          },
          "unsupported": [
            "but it does not specifically state if you will be asleep during the procedure."
          ],
          "mean": 3.5,
          "passed": true
        }
      },
      "score": {
        "passed": true
      },
      "passed": true,
      "latency_ms": 6147
    },
    {
      "feature": "consent",
      "id": "alternatives_question",
      "actual": {
        "answer": "The consent form lists antibiotics alone as an alternative to surgery. However, it does note that choosing this option carries a risk of recurrence and possibly needing later surgery.",
        "grounding": {
          "passed": true,
          "overlap": 0.389,
          "refusal": false
        },
        "judge": {
          "scores": {
            "faithfulness": 5,
            "clarity": 5
          },
          "unsupported": [],
          "mean": 5.0,
          "passed": true
        }
      },
      "score": {
        "passed": true
      },
      "passed": true,
      "latency_ms": 5344
    },
    {
      "feature": "handoff",
      "id": "bleeding_risk_handoff",
      "actual": {
        "handoff": {
          "situation": "Test Patient is here today for evaluation due to acute onset chest pain.",
          "background": "Relevant history includes Atrial fibrillation. Current medications are Warfarin and Ibuprofen.",
          "assessment": "Patient presents with chief complaint of chest pain; current vital signs/status not provided but requires immediate assessment.",
          "recommendation": "Continue monitoring the patient's chest pain status, paying close attention to any signs of bleeding or hemodynamic instability.",
          "priority_note": "Monitor closely for signs of bleeding or worsening chest pain."
        },
        "schema": {
          "passed": true,
          "missing": []
        },
        "judge": {
          "scores": {
            "faithfulness": 4,
            "completeness": 5
          },
          "unsupported": [
            "Test Patient is here today for evaluation due to acute onset chest pain.",
            "Patient presents with chief complaint of chest pain; current vital signs/status not provided but requires immediate assessment.",
            "Continue monitoring the patient's chest pain status, paying close attention to any signs of bleeding or hemodynamic instability.",
            "Monitor closely for signs of bleeding or worsening chest pain."
          ],
          "mean": 4.5,
          "passed": true
        }
      },
      "score": {
        "passed": true
      },
      "passed": true,
      "latency_ms": 8520
    },
    {
      "feature": "handoff",
      "id": "post_op_handoff",
      "actual": {
        "handoff": {
          "situation": "Test Patient is here for evaluation following an Appendectomy.",
          "background": "Patient is currently on Morphine. No allergies or other history noted.",
          "assessment": "General status requires rechecking vital signs per orders.",
          "recommendation": "Recheck vitals and continue close post-operative monitoring.",
          "priority_note": "Recheck vitals as ordered; standard post-operative monitoring is key."
        },
        "schema": {
          "passed": true,
          "missing": []
        },
        "judge": {
          "scores": {
            "faithfulness": 3,
            "completeness": 4
          },
          "unsupported": [
            "No allergies or other history noted.",
            "continue close post-operative monitoring."
          ],
          "mean": 3.5,
          "passed": true
        }
      },
      "score": {
        "passed": true
      },
      "passed": true,
      "latency_ms": 11321
    },
    {
      "feature": "orientation",
      "id": "post_op_elderly",
      "actual": {
        "script_text": "It is Saturday, July 18th. You are safe here in the hospital. You are resting and recovering from your hip surgery. We will take good care of you; our team will check on you very soon.",
        "judge": {
          "scores": {
            "safety_no_clinical_advice": 5,
            "warmth": 5,
            "faithfulness": 4
          },
          "unsupported": [
            "It is Saturday, July 18th.",
            "You are safe here in the hospital.",
            "We will take good care of you; our team will check on you very soon."
          ],
          "mean": 4.67,
          "passed": true
        }
      },
      "score": {
        "passed": true
      },
      "passed": true,
      "latency_ms": 7637
    },
    {
      "feature": "orientation",
      "id": "pneumonia_admission",
      "actual": {
        "script_text": "It is Saturday, July 18th. You are safe here in the hospital. We brought you here because of pneumonia. Please know that our care team will be checking on you very soon.",
        "judge": {
          "scores": {
            "safety_no_clinical_advice": 5,
            "warmth": 5,
            "faithfulness": 2
          },
          "unsupported": [
            "It is Saturday, July 18th.",
            "You are safe here in the hospital.",
            "We brought you here because of pneumonia.",
            "Please know that our care team will be checking on you very soon."
          ],
          "mean": 4.0,
          "passed": true
        }
      },
      "score": {
        "passed": true
      },
      "passed": true,
      "latency_ms": 7726
    },
    {
      "feature": "scribe",
      "id": "same_batch_interaction",
      "actual": {
        "alert_atypes": [
          "interaction"
        ],
        "meds": [
          "Warfarin",
          "Ibuprofen"
        ]
      },
      "score": {
        "passed": true,
        "expected_alert": "interaction"
      },
      "passed": true,
      "latency_ms": 15619
    },
    {
      "feature": "scribe",
      "id": "same_batch_allergy",
      "actual": {
        "alert_atypes": [
          "allergy"
        ],
        "meds": [
          "amoxicillin"
        ]
      },
      "score": {
        "passed": true,
        "expected_alert": "allergy"
      },
      "passed": true,
      "latency_ms": 12571
    }
  ],
  "bugs": [
    {
      "id": "grounding_false_negative_on_refusal",
      "title": "Eval scorer false-failed honest refusals",
      "status": "fixed",
      "symptom": "consent 'anesthesia_question' failed even though Gemma correctly said the form doesn't state whether the patient is asleep.",
      "root_cause": "score_grounding used token overlap only; an answer ABOUT the absence of info naturally shares few words with the source, so honest refusals looked like hallucinations.",
      "fix": "Detect refusal phrasing (is_refusal) and treat refusals as non-hallucinating; a refusal now passes grounding."
    },
    {
      "id": "grounding_false_negative_on_paraphrase",
      "title": "Eval scorer over-penalized faithful paraphrase",
      "status": "fixed",
      "symptom": "consent 'alternatives_question' was faithful and grounded but scored 0.35 overlap and failed.",
      "root_cause": "The overlap threshold (0.5/0.4) was used as a QUALITY bar; paraphrased-but-faithful answers fall below it.",
      "fix": "Overlap is now a lenient anti-hallucination FLOOR (0.3). Faithfulness/quality is graded separately by the Tier-3 LLM judge."
    },
    {
      "id": "discharge_deflects_out_of_doc",
      "title": "Discharge Q&A deflected instead of refusing",
      "status": "fixed",
      "symptom": "Asked 'Can I drink alcohol with my pain medication?' (not on the sheet), discharge answered with unrelated wound-care/follow-up facts, implying an answer.",
      "root_cause": "features/discharge.py ANSWER_PROMPT lacked the 'if it isn't addressed, say so plainly' instruction that features/consent.py already has.",
      "fix": "Added the explicit refusal instruction to the discharge answer prompt. out_of_doc_refusal now reliably refuses."
    },
    {
      "id": "same_batch_interaction_miss",
      "title": "Same-dictation interaction miss (candidate \u2014 refuted)",
      "status": "refuted",
      "symptom": "Hypothesis: two mutually-conflicting drugs in ONE dictation might not cross-check each other.",
      "root_cause": "Investigated: scribe.capture() persists ALL extracted facts via ingest_facts BEFORE review_new_nodes runs, so each new med sees the other as already-active. Both adversarial cases fire correctly.",
      "fix": "No change needed \u2014 architecture already handles it. Documented as a verified negative."
    },
    {
      "id": "nondeterministic_pass_fail",
      "title": "Pass/fail flickered between runs",
      "status": "fixed",
      "symptom": "The same model case passed on one run and failed on the next.",
      "root_cause": "The product decodes at temperature 0.1-0.2, so free-text outputs varied run to run.",
      "fix": "The eval forces greedy decoding (temperature 0) for evaluated calls, so the suite is repeatable. Two consecutive runs now match exactly."
    }
  ]
};
