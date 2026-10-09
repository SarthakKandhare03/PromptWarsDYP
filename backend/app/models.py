"""Pydantic schemas shared by the API and the engines."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Pune metropolitan bounding box: rejects coordinates outside the supported city.
PUNE_BOUNDS = {"min_lat": 18.30, "max_lat": 18.75, "min_lng": 73.65, "max_lng": 74.10}


class Coord(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)

    def in_city(self) -> bool:
        b = PUNE_BOUNDS
        return b["min_lat"] <= self.lat <= b["max_lat"] and b["min_lng"] <= self.lng <= b["max_lng"]


class PlaceCategory(str, Enum):
    heritage = "heritage"
    food = "food"
    cafe = "cafe"
    attraction = "attraction"
    hotel = "hotel"


class Place(BaseModel):
    id: str
    name: str
    category: PlaceCategory
    lat: float
    lng: float
    area: str
    summary: str
    price_level: int = Field(ge=1, le=4, description="1 = budget, 4 = premium")
    rating: float | None = None
    review_count: int | None = None
    wheelchair: bool | None = None
    cleanliness: float | None = Field(default=None, ge=0, le=5)
    tags: list[str] = []
    image: str | None = None
    image_note: str | None = None  # set when the photo is representative, not of this exact place
    demo: bool = True


class ReportCategory(str, Enum):
    waterlogging = "waterlogging"
    pothole = "pothole"
    accident = "accident"
    traffic = "traffic"
    streetlight = "streetlight"
    accessibility = "accessibility"
    other = "other"


class SourceType(str, Enum):
    community = "community"
    official = "official"


class Report(BaseModel):
    id: str
    category: ReportCategory
    description: str
    lat: float
    lng: float
    created_at: datetime
    source: SourceType = SourceType.community
    severity: int = Field(ge=1, le=3, default=2)
    has_photo: bool = False
    has_audio: bool = False
    ai_summary: str | None = None
    ai_consistency: float | None = Field(default=None, ge=0, le=1)
    trust_score: int = 0
    trust_label: str = "Unverified"
    trust_reasons: list[str] = []
    demo: bool = False
    reporter_id: str | None = None  # anonymous device id, never returned by the API
    status: Literal["active", "resolved"] = "active"
    confirmations: int = 0
    disputes: int = 0
    resolved_votes: int = 0


VOTER_ID_PATTERN = r"^[A-Za-z0-9-]{8,64}$"


class VoteRequest(BaseModel):
    vote: Literal["confirm", "dispute", "resolved"]
    voter_id: str = Field(pattern=VOTER_ID_PATTERN)


class RouteRequest(BaseModel):
    origin: Coord
    destination: Coord
    hour: int = Field(ge=0, le=23, description="Local hour of planned travel")

    @field_validator("destination")
    @classmethod
    def _distinct(cls, v: Coord, info):
        origin = info.data.get("origin")
        if origin and abs(origin.lat - v.lat) < 1e-5 and abs(origin.lng - v.lng) < 1e-5:
            raise ValueError("origin and destination must differ")
        return v


class RouteFactor(BaseModel):
    label: str
    impact: float
    kind: Literal["risk", "support", "missing"]


class ScoredRoute(BaseModel):
    id: str
    geometry: list[tuple[float, float]]
    distance_m: float
    duration_s: float
    safety_score: int | None
    confidence: Literal["low", "medium", "high"]
    factors: list[RouteFactor]
    is_fastest: bool = False
    is_safest: bool = False


class RouteResponse(BaseModel):
    routes: list[ScoredRoute]
    explanation: str
    explanation_source: Literal["gemini", "rules"]
    routing_source: Literal["osrm", "fallback"]
    is_night: bool


class CompareWeights(BaseModel):
    affordability: float = Field(default=1, ge=0, le=5)
    rating: float = Field(default=1, ge=0, le=5)
    accessibility: float = Field(default=1, ge=0, le=5)
    cleanliness: float = Field(default=1, ge=0, le=5)
    safety: float = Field(default=1, ge=0, le=5)


class CompareRequest(BaseModel):
    place_ids: list[str] = Field(min_length=2, max_length=4)
    weights: CompareWeights = CompareWeights()


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=2000)


class AssistantRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    location: Coord | None = None
    history: list[ChatTurn] = Field(default_factory=list, max_length=8)

    @field_validator("query")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("query too short")
        return v
