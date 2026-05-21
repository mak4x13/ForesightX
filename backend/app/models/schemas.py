from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SimulationRequest(BaseModel):
    situation: str = Field(..., min_length=10, max_length=2400)
    decision: str = Field(..., min_length=4, max_length=1200)
    domain: str = Field(..., min_length=2, max_length=64)


class Milestone(BaseModel):
    step: int
    description: str
    timeframe: str


class SimulationInput(BaseModel):
    situation: str
    decision: str
    domain: str


class OptimisticOutcome(BaseModel):
    probability: int
    label: Literal["OPTIMISTIC"] = "OPTIMISTIC"
    enabling_factors: list[str]
    milestones: list[Milestone]
    final_state: str
    emotional_tone: str


class RealisticOutcome(BaseModel):
    probability: int
    label: Literal["REALISTIC"] = "REALISTIC"
    friction_points: list[str]
    milestones: list[Milestone]
    trade_offs: list[str]
    final_state: str


class PessimisticOutcome(BaseModel):
    probability: int
    label: Literal["PESSIMISTIC"] = "PESSIMISTIC"
    risk_factors: list[str]
    milestones: list[Milestone]
    failure_triggers: list[str]
    final_state: str
    mitigation: str


class SimulationOutcomes(BaseModel):
    optimistic: OptimisticOutcome
    realistic: RealisticOutcome
    pessimistic: PessimisticOutcome


class SimulationMeta(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    total_agents: int = 4
    execution_time_ms: int
    model_orchestrator: str = "gemini-1.5-flash"
    model_agents: str = "llama-3.3-70b-versatile"


class SimulationResult(BaseModel):
    simulation_id: str
    timestamp: datetime
    input: SimulationInput
    outcomes: SimulationOutcomes
    meta: SimulationMeta
