import re


def _keywords(text: str, limit: int = 8) -> list[str]:
    words = re.findall(r"[A-Za-z][A-Za-z\-]{3,}", text.lower())
    ignored = {
        "with",
        "that",
        "this",
        "from",
        "have",
        "will",
        "would",
        "should",
        "about",
        "there",
        "their",
        "because",
        "considering",
    }
    unique = []
    for word in words:
        if word not in ignored and word not in unique:
            unique.append(word)
        if len(unique) == limit:
            break
    return unique


def analyze_decision_context(situation: str, decision: str, domain: str) -> dict:
    combined = f"{situation} {decision}"
    return {
        "variables": _keywords(combined),
        "domain": domain,
        "decision_pressure": "high" if len(decision) > 160 else "moderate",
        "time_horizon": "near-term to 18 months",
        "hidden_assumptions": [
            "The stated situation contains incomplete information.",
            "External market and personal constraints may shift during execution.",
        ],
        "analogies": [
            f"Comparable {domain.lower()} decisions tend to hinge on timing, resource focus, and feedback loops."
        ],
        "constraints": [
            "Forecasts are scenario simulations, not guarantees.",
            "Probabilities are directional and normalized by the synthesizer.",
        ],
        "situation_length": len(situation),
        "decision_length": len(decision),
    }


def normalize_milestones(raw_steps: list[dict]) -> list[dict]:
    milestones = []
    for index, item in enumerate(raw_steps[:5], start=1):
        milestones.append(
            {
                "step": int(item.get("step", index)),
                "description": str(item.get("description", ""))[:280],
                "timeframe": str(item.get("timeframe", "TBD"))[:80],
            }
        )
    return milestones


def generate_milestone_steps(scenario: str, tone: str) -> list[dict]:
    tone_map = {
        "optimistic": [
            ("0-30 days", "Early signal appears and the decision gains momentum."),
            ("1-3 months", "Resources align around the strongest opportunity."),
            ("3-6 months", "Compounding progress creates visible external validation."),
            ("6-12 months", "The decision becomes a durable advantage."),
        ],
        "realistic": [
            ("0-30 days", "Initial action exposes the first practical trade-off."),
            ("1-3 months", "Progress continues, but capacity and focus become constraints."),
            ("3-6 months", "The outcome stabilizes around consistent execution quality."),
            ("6-12 months", "Benefits arrive alongside a few persistent costs."),
        ],
        "pessimistic": [
            ("0-30 days", "Early friction is underestimated and slows execution."),
            ("1-3 months", "Small unresolved issues combine into a visible drag."),
            ("3-6 months", "The decision forces costly rework or reputation repair."),
            ("6-12 months", "The path remains recoverable only with a tighter mitigation plan."),
        ],
    }
    return [
        {"step": index, "description": f"{description} {scenario}", "timeframe": timeframe}
        for index, (timeframe, description) in enumerate(
            tone_map.get(tone, tone_map["realistic"]), start=1
        )
    ]


def score_outcome_probability(
    optimist_out: dict, realist_out: dict, pessimist_out: dict
) -> dict:
    raw = {
        "optimistic": int(
            optimist_out.get("probability_score", optimist_out.get("probability", 35))
        ),
        "realistic": int(
            realist_out.get("probability_score", realist_out.get("probability", 45))
        ),
        "pessimistic": int(
            pessimist_out.get("probability_score", pessimist_out.get("probability", 20))
        ),
    }
    total = max(sum(max(value, 0) for value in raw.values()), 1)
    normalized = {key: round(max(value, 0) * 100 / total) for key, value in raw.items()}
    drift = 100 - sum(normalized.values())
    normalized["realistic"] += drift
    return normalized


def flag_logical_inconsistency(outputs: list[dict]) -> list[str]:
    issues = []
    for output in outputs:
        if not output.get("milestones"):
            issues.append("One outcome is missing milestone steps.")
        if not output.get("final_state"):
            issues.append("One outcome is missing a final state.")
    return issues


def fallback_briefing(situation: str, decision: str, domain: str) -> dict:
    analysis = analyze_decision_context(situation, decision, domain)
    return {
        "variables": analysis["variables"],
        "context": {
            "domain": domain,
            "situation": situation,
            "decision": decision,
            "decision_pressure": analysis["decision_pressure"],
            "time_horizon": analysis["time_horizon"],
        },
        "analogies": analysis["analogies"],
        "constraints": analysis["constraints"],
        "hidden_assumptions": analysis["hidden_assumptions"],
    }


def fallback_agent_output(tone: str, briefing: dict) -> dict:
    decision = briefing.get("context", {}).get("decision", "the decision")
    milestones = generate_milestone_steps(decision, tone)
    if tone == "optimistic":
        return {
            "probability_score": 35,
            "enabling_factors": [
                "Clear early feedback validates the choice.",
                "Resources are focused instead of diluted.",
                "The user adapts quickly as new evidence appears.",
            ],
            "milestones": milestones,
            "final_state": "The decision opens a stronger path with visible momentum and manageable cost.",
            "emotional_tone": "energized but disciplined",
        }
    if tone == "pessimistic":
        return {
            "probability_score": 20,
            "risk_factors": [
                "Key assumptions remain untested too long.",
                "Execution load exceeds available capacity.",
                "A small delay triggers a wider loss of confidence.",
            ],
            "milestones": milestones,
            "failure_triggers": [
                "No measurable signal after the first checkpoint.",
                "Rising opportunity cost without a mitigation plan.",
            ],
            "final_state": "The decision becomes costly and forces a retreat or reset.",
            "mitigation": "Set a 30-day evidence checkpoint with a predefined stop, pivot, or double-down rule.",
        }
    return {
        "probability_score": 45,
        "friction_points": [
            "Some benefits arrive slower than expected.",
            "Trade-offs become clearer only after action starts.",
        ],
        "milestones": milestones,
        "trade_offs": [
            "More focus on this path means less optionality elsewhere.",
            "Short-term uncertainty is exchanged for long-term clarity.",
        ],
        "final_state": "The decision produces useful progress, but only with deliberate follow-through.",
    }
