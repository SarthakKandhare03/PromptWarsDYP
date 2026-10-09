"""Clients for free public data sources, each with a timeout and an honest fallback."""

from __future__ import annotations

import time

import httpx

from app.config import settings
from app.services.geo import LatLng, haversine_m, straight_line

OSRM_URL = "https://router.project-osrm.org/route/v1/driving/{a};{b}"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
USER_AGENT = "CityPulseAI/1.0 (hackathon demo)"

_weather_cache: dict[str, tuple[float, dict]] = {}
WEATHER_TTL_S = 600


async def fetch_routes(origin: LatLng, dest: LatLng) -> tuple[list[dict], str]:
    """Road routes from the public OSRM demo server, or one straight-line estimate."""
    url = OSRM_URL.format(a=f"{origin[1]},{origin[0]}", b=f"{dest[1]},{dest[0]}")
    params = {"alternatives": "3", "overview": "full", "geometries": "geojson"}
    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout_s, headers={"User-Agent": USER_AGENT}) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        routes = [
            {
                "geometry": [(lat, lng) for lng, lat in r["geometry"]["coordinates"]],
                "distance_m": r["distance"],
                "duration_s": r["duration"],
            }
            for r in data.get("routes", [])
        ]
        if routes:
            return routes, "osrm"
    except (httpx.HTTPError, KeyError, ValueError):
        pass
    dist = haversine_m(origin, dest) * 1.3  # typical road-network detour factor
    return [{"geometry": straight_line(origin, dest), "distance_m": dist, "duration_s": dist / 6.5}], "fallback"


async def fetch_weather(center: LatLng) -> dict:
    """Current conditions + recent rain from Open-Meteo (no key required). Cached 10 min."""
    key = f"{center[0]:.2f},{center[1]:.2f}"
    cached = _weather_cache.get(key)
    if cached and time.monotonic() - cached[0] < WEATHER_TTL_S:
        return cached[1]
    params = {
        "latitude": center[0],
        "longitude": center[1],
        "current": "temperature_2m,precipitation,weather_code,wind_speed_10m,relative_humidity_2m",
        "hourly": "precipitation",
        "past_hours": 3,
        "forecast_hours": 6,
        "timezone": "Asia/Kolkata",
    }
    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout_s, headers={"User-Agent": USER_AGENT}) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
        hourly = data.get("hourly", {}).get("precipitation", []) or []
        result = {
            "available": True,
            "source": "Open-Meteo",
            "temperature_c": data["current"]["temperature_2m"],
            "humidity": data["current"].get("relative_humidity_2m"),
            "wind_kmh": data["current"].get("wind_speed_10m"),
            "weather_code": data["current"].get("weather_code"),
            "recent_rain_mm": round(sum(hourly[:3]), 1),
            "next_6h_rain_mm": round(sum(hourly[3:]), 1),
            "observed_at": data["current"].get("time"),
        }
    except (httpx.HTTPError, KeyError, ValueError):
        result = {"available": False, "source": "Open-Meteo", "recent_rain_mm": None}
    _weather_cache[key] = (time.monotonic(), result)
    return result
