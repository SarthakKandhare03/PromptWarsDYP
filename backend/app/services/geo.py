"""Small geospatial helpers (no external dependency)."""

from __future__ import annotations

import math
from collections.abc import Sequence

EARTH_RADIUS_M = 6_371_000.0

LatLng = tuple[float, float]


def haversine_m(a: LatLng, b: LatLng) -> float:
    """Great-circle distance between two (lat, lng) points in metres."""
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    dlat, dlng = lat2 - lat1, lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def path_length_m(path: Sequence[LatLng]) -> float:
    return sum(haversine_m(path[i], path[i + 1]) for i in range(len(path) - 1))


def sample_path(path: Sequence[LatLng], step_m: float = 150.0) -> list[LatLng]:
    """Return points spaced roughly `step_m` apart along a polyline (endpoints included)."""
    if not path:
        return []
    if len(path) == 1:
        return [path[0]]
    samples: list[LatLng] = [path[0]]
    carry = 0.0
    for i in range(len(path) - 1):
        a, b = path[i], path[i + 1]
        seg = haversine_m(a, b)
        if seg == 0:
            continue
        d = step_m - carry
        while d <= seg:
            t = d / seg
            samples.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            d += step_m
        carry = seg - (d - step_m)
    if samples[-1] != path[-1]:
        samples.append(path[-1])
    return samples


def straight_line(a: LatLng, b: LatLng, points: int = 20) -> list[LatLng]:
    """Interpolated straight segment, used when no road router is reachable."""
    return [(a[0] + (b[0] - a[0]) * i / points, a[1] + (b[1] - a[1]) * i / points) for i in range(points + 1)]
