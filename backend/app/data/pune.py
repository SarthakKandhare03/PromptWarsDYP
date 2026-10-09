"""Seed dataset for Pune.

Place names are real, well-known Pune landmarks and eateries. Coordinates are
approximate. Ratings, prices, cleanliness and accessibility values are
ILLUSTRATIVE DEMO VALUES, not live data, and every record is flagged `demo=True`.

Accident-prone corridors are approximate points on corridors publicly reported
by Pune City Police / district administration (Pune-Solapur Rd, Pune-Nagar Rd,
Pune-Satara Rd, Mumbai-Bengaluru bypass). They are not an official list.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.models import Place, PlaceCategory, Report, ReportCategory, SourceType

CITY = {"name": "Pune", "center": (18.5204, 73.8567), "zoom": 13}

H, F, C, A, HO = (
    PlaceCategory.heritage,
    PlaceCategory.food,
    PlaceCategory.cafe,
    PlaceCategory.attraction,
    PlaceCategory.hotel,
)


def _p(id, name, cat, lat, lng, area, summary, price, rating, reviews, wheelchair, clean, tags):
    return Place(
        id=id, name=name, category=cat, lat=lat, lng=lng, area=area, summary=summary,
        price_level=price, rating=rating, review_count=reviews, wheelchair=wheelchair,
        cleanliness=clean, tags=tags,
    )


PLACES: list[Place] = [
    _p("shaniwar-wada", "Shaniwar Wada", H, 18.5195, 73.8553, "Shaniwar Peth",
       "18th-century seat of the Peshwas. Fortified walls and the Delhi Gate survive a fire that destroyed the palace.",
       1, 4.3, 52000, False, 3.8, ["peshwa", "fort", "history", "evening show"]),
    _p("lal-mahal", "Lal Mahal", H, 18.5186, 73.8567, "Kasba Peth",
       "Reconstructed palace linked to Chhatrapati Shivaji Maharaj's childhood.",
       1, 4.1, 18000, True, 4.0, ["shivaji", "maratha", "history"]),
    _p("kasba-ganpati", "Kasba Ganpati Temple", H, 18.5193, 73.8583, "Kasba Peth",
       "Pune's presiding deity, roughly four centuries old, at the heart of the original settlement.",
       1, 4.7, 21000, False, 4.1, ["temple", "ganpati", "old city"]),
    _p("dagdusheth", "Shrimant Dagdusheth Halwai Ganpati", H, 18.5164, 73.8561, "Budhwar Peth",
       "Iconic Ganpati temple, especially vibrant during Ganeshotsav.",
       1, 4.8, 95000, True, 4.2, ["temple", "ganpati", "festival"]),
    _p("tambat-ali", "Tambat Ali (Coppersmith Lane)", H, 18.5207, 73.8604, "Kasba Peth",
       "Living craft lane where coppersmiths still hand-beat utensils, a hidden heritage gem.",
       1, 4.4, 900, False, 3.4, ["craft", "hidden gem", "copper", "walk"]),
    _p("vishrambaug-wada", "Vishrambaug Wada", H, 18.5131, 73.8531, "Sadashiv Peth",
       "Ornate Peshwa-era mansion known for its carved wooden facade.",
       1, 4.2, 7000, False, 3.7, ["peshwa", "architecture", "wood carving"]),
    _p("kelkar-museum", "Raja Dinkar Kelkar Museum", A, 18.5106, 73.8566, "Shukrawar Peth",
       "One man's collection of everyday Indian objects: lamps, instruments, utensils.",
       2, 4.5, 14000, True, 4.5, ["museum", "culture", "indoor"]),
    _p("aga-khan-palace", "Aga Khan Palace", H, 18.5524, 73.9015, "Kalyani Nagar",
       "Where Mahatma Gandhi was interned during the Quit India movement; memorial and gardens.",
       1, 4.4, 40000, True, 4.6, ["gandhi", "freedom struggle", "gardens"]),
    _p("pataleshwar", "Pataleshwar Cave Temple", H, 18.5268, 73.8497, "Shivajinagar",
       "8th-century rock-cut cave temple hidden in the middle of the city.",
       1, 4.3, 12000, False, 3.9, ["rock-cut", "hidden gem", "ancient"]),
    _p("parvati-hill", "Parvati Hill Temple", A, 18.4972, 73.8470, "Parvati",
       "103 steps to a hilltop temple complex with sweeping city views at sunrise.",
       1, 4.5, 26000, False, 3.8, ["viewpoint", "sunrise", "temple", "steps"]),
    _p("sinhagad", "Sinhagad Fort", A, 18.3664, 73.7559, "Sinhagad",
       "Hill fort of the Battle of Sinhagad (1670); monsoon trek and pithla-bhakri stalls.",
       1, 4.5, 60000, False, 3.5, ["fort", "trek", "monsoon", "maratha"]),
    _p("vaishali", "Vaishali", F, 18.5208, 73.8411, "FC Road",
       "Legendary FC Road South Indian joint; SPDP and filter coffee.",
       2, 4.4, 30000, True, 4.2, ["south indian", "breakfast", "student favourite", "veg"]),
    _p("roopali", "Roopali", F, 18.5222, 73.8412, "FC Road",
       "Old-school FC Road eatery for quick dosas and misal.",
       1, 4.2, 15000, True, 4.0, ["budget", "veg", "breakfast"]),
    _p("bedekar-misal", "Bedekar Misal", F, 18.5148, 73.8508, "Narayan Peth",
       "Decades-old misal spot with a sweet-spicy Puneri style.",
       1, 4.3, 11000, False, 3.6, ["misal", "street food", "budget", "veg"]),
    _p("chitale-bandhu", "Chitale Bandhu Mithaiwale", F, 18.5135, 73.8525, "Deccan",
       "Pune's famous sweet shop: bakarwadi and amba barfi.",
       1, 4.5, 20000, True, 4.4, ["sweets", "bakarwadi", "souvenir"]),
    _p("goodluck-cafe", "Cafe Goodluck", C, 18.5175, 73.8418, "Deccan",
       "Irani cafe since 1935: bun maska, chai and keema pav.",
       2, 4.3, 25000, True, 4.0, ["irani cafe", "bun maska", "heritage"]),
    _p("kayani-bakery", "Kayani Bakery", C, 18.5170, 73.8790, "Camp",
       "Cult bakery famous for Shrewsbury biscuits and mawa cakes.",
       1, 4.5, 18000, False, 3.9, ["bakery", "shrewsbury", "camp"]),
    _p("durga-cafe", "Durga Cafe", C, 18.5070, 73.8170, "Kothrud",
       "Cold coffee institution packed with students every evening.",
       1, 4.2, 9000, False, 3.5, ["cold coffee", "budget", "students"]),
    _p("george-restaurant", "George Restaurant", F, 18.5150, 73.8780, "Camp",
       "Old Camp restaurant known for biryani and Parsi-style dishes.",
       2, 4.1, 8000, True, 3.9, ["biryani", "non-veg", "camp"]),
    _p("demo-stay-deccan", "Budget stay near Deccan (demo)", HO, 18.5160, 73.8430, "Deccan",
       "Synthetic demo listing for a budget hotel near Deccan Gymkhana.",
       2, 3.9, 120, None, None, ["budget", "hotel", "demo"]),
    _p("demo-stay-camp", "Boutique stay in Camp (demo)", HO, 18.5190, 73.8800, "Camp",
       "Synthetic demo listing for a mid-range hotel in Camp.",
       3, 4.6, 14, True, 4.6, ["boutique", "hotel", "demo"]),
]

# Photos: Wikimedia Commons (via Wikipedia page images), credited in the UI footer.
# `None` note = photo of the place itself; otherwise a labelled representative image.
_W = "https://thumb.wikimedia.org/wikipedia/commons/thumb/"
IMAGES: dict[str, tuple[str, str | None]] = {
    "shaniwar-wada": (_W + "4/4d/Front_view_of_Shaniwar_Wada_illuminated.jpg/960px-Front_view_of_Shaniwar_Wada_illuminated.jpg", None),
    "lal-mahal": (_W + "0/0e/Lal_Mahal%2C_Pune.jpg/960px-Lal_Mahal%2C_Pune.jpg", None),
    "kasba-ganpati": (_W + "0/03/KasbaganpatiMandir.JPG/960px-KasbaganpatiMandir.JPG", None),
    "dagdusheth": (_W + "a/a9/Dagdusheth_Ganpati_Temple_Decorated_during_Ganesh_Chaturti_September_2012_%281%29.JPG/960px-Dagdusheth_Ganpati_Temple_Decorated_during_Ganesh_Chaturti_September_2012_%281%29.JPG", None),
    "vishrambaug-wada": (_W + "c/cd/Vishram_Baug_Wada.jpg/960px-Vishram_Baug_Wada.jpg", None),
    "kelkar-museum": (_W + "6/6d/Building_of_Raja_Dinkar_Kelkar_Museum%2C_Pune.jpg/960px-Building_of_Raja_Dinkar_Kelkar_Museum%2C_Pune.jpg", None),
    "aga-khan-palace": (_W + "c/cd/Pune_Palace.jpg/960px-Pune_Palace.jpg", None),
    "pataleshwar": (_W + "3/3e/Pataleshwar_cave_temple.JPG/960px-Pataleshwar_cave_temple.JPG", None),
    "parvati-hill": (_W + "9/95/Parvati.JPG/960px-Parvati.JPG", None),
    "sinhagad": (_W + "f/f5/Sinhagad.jpg/960px-Sinhagad.jpg", None),
    "tambat-ali": (_W + "f/f0/NatCopper.jpg/960px-NatCopper.jpg", "Representative: copper"),
    "vaishali": (_W + "b/ba/Masala_Dosa_2023.jpg/960px-Masala_Dosa_2023.jpg", "Representative dish"),
    "roopali": (_W + "b/ba/Masala_Dosa_2023.jpg/960px-Masala_Dosa_2023.jpg", "Representative dish"),
    "bedekar-misal": (_W + "a/a0/Kolhapuri_Misal_Pav.jpg/960px-Kolhapuri_Misal_Pav.jpg", "Representative: misal pav"),
    "george-restaurant": (_W + "5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/960px-%22Hyderabadi_Dum_Biryani%22.jpg", "Representative: biryani"),
    "goodluck-cafe": (_W + "0/00/Yazdani_Bakery_in_Fort.jpg/960px-Yazdani_Bakery_in_Fort.jpg", "Representative Irani cafe (Mumbai)"),
    "kayani-bakery": (_W + "3/39/Shrewsbury_biscuits_%28with_fruit%29.JPG/960px-Shrewsbury_biscuits_%28with_fruit%29.JPG", "Representative: Shrewsbury biscuits"),
    "demo-stay-camp": (_W + "5/52/MGRd_Pune_Camp.jpg/960px-MGRd_Pune_Camp.jpg", "Area photo: MG Road, Camp"),
}
for _place in PLACES:
    if _place.id in IMAGES:
        _place.image, _place.image_note = IMAGES[_place.id]

PLACES_BY_ID = {p.id: p for p in PLACES}

# (name, lat, lng) approximate points on publicly reported accident-prone corridors.
ACCIDENT_ZONES: list[tuple[str, float, float]] = [
    ("Navale Bridge, Mumbai-Bengaluru bypass", 18.4560, 73.8185),
    ("Katraj Chowk, Pune-Satara Rd", 18.4575, 73.8585),
    ("Hadapsar, Pune-Solapur Rd", 18.5018, 73.9260),
    ("Wagholi, Pune-Nagar Rd", 18.5800, 73.9787),
    ("Chandni Chowk, Mumbai-Bengaluru bypass", 18.5085, 73.7838),
    ("Warje, Mumbai-Bengaluru bypass", 18.4847, 73.8037),
    ("Swargate Chowk", 18.5018, 73.8636),
]

# (name, kind, lat, lng): approximate locations of police stations / hospitals.
SUPPORT_POINTS: list[tuple[str, str, float, float]] = [
    ("Sassoon General Hospital", "hospital", 18.5285, 73.8740),
    ("Ruby Hall Clinic", "hospital", 18.5333, 73.8770),
    ("Deenanath Mangeshkar Hospital", "hospital", 18.5025, 73.8320),
    ("Shivajinagar Police Station", "police", 18.5300, 73.8480),
    ("Deccan Police Station", "police", 18.5170, 73.8410),
    ("Faraskhana Police Station", "police", 18.5200, 73.8575),
    ("Kothrud Police Station", "police", 18.5080, 73.8100),
    ("Swargate Police Station", "police", 18.5005, 73.8620),
]


def seed_reports(now: datetime | None = None) -> list[Report]:
    """Synthetic demo reports, timestamped relative to `now` so freshness is meaningful."""
    now = now or datetime.now(timezone.utc)

    def r(id, cat, desc, lat, lng, hours_ago, sev, photo=False, source=SourceType.community):
        return Report(
            id=id, category=cat, description=desc, lat=lat, lng=lng,
            created_at=now - timedelta(hours=hours_ago), severity=sev, has_photo=photo,
            source=source, demo=True,
        )

    return [
        r("demo-1", ReportCategory.waterlogging, "Knee-deep water under the flyover after rain.", 18.5010, 73.8640, 2, 3, True),
        r("demo-2", ReportCategory.waterlogging, "Road flooded near Swargate bus stand.", 18.5022, 73.8628, 3, 2),
        r("demo-3", ReportCategory.pothole, "Large pothole in left lane, bikes swerving.", 18.5160, 73.8420, 20, 2, True),
        r("demo-4", ReportCategory.streetlight, "Three streetlights out on this stretch after 8pm.", 18.5240, 73.8470, 30, 2),
        r("demo-5", ReportCategory.accessibility, "Footpath blocked by construction; no ramp.", 18.5190, 73.8560, 8, 1, True),
        r("demo-6", ReportCategory.traffic, "Signal not working, heavy jam.", 18.4578, 73.8590, 1, 2),
        r("demo-7", ReportCategory.accident, "Two-wheeler skid reported on the bridge slope.", 18.4562, 73.8190, 5, 3),
        r("demo-8", ReportCategory.pothole, "Road resurfacing scheduled (demo official notice).", 18.5130, 73.8540, 48, 1,
          source=SourceType.official),
    ]


# Recurring patterns for the hotspot model to learn: (place, lat, lng, category, IST hours, reports in 30 days).
# Synthetic and labelled demo, shaped after publicly reported Pune trouble spots.
_HISTORY_PATTERNS = [
    ("Swargate flyover", 18.5012, 73.8638, ReportCategory.waterlogging, (17, 18, 19, 20), 9),
    ("Katraj Chowk", 18.4576, 73.8587, ReportCategory.traffic, (8, 9, 18, 19), 8),
    ("Navale Bridge", 18.4561, 73.8188, ReportCategory.accident, (22, 23, 0, 1), 7),
    ("University Rd", 18.5300, 73.8440, ReportCategory.streetlight, (20, 21, 22), 6),
    ("Shaniwar Peth lanes", 18.5190, 73.8562, ReportCategory.accessibility, (10, 11, 16), 5),
    ("Hadapsar, Solapur Rd", 18.5016, 73.9255, ReportCategory.pothole, (7, 8, 9, 18), 6),
]


def seed_history(now: datetime | None = None) -> list[Report]:
    """~40 deterministic historical demo reports spread over the last 30 days (all resolved)."""
    import random

    now = now or datetime.now(timezone.utc)
    rng = random.Random(42)
    out: list[Report] = []
    ist = timezone(timedelta(hours=5, minutes=30))
    for name, lat, lng, cat, hours, n in _HISTORY_PATTERNS:
        for i in range(n):
            day = now.astimezone(ist) - timedelta(days=rng.randint(2, 30))
            when = day.replace(hour=rng.choice(hours), minute=rng.randint(0, 59), second=0, microsecond=0)
            out.append(Report(
                id=f"hist-{len(out) + 1}", category=cat, description=f"Recurring {cat.value} at {name} (historical demo).",
                lat=lat + rng.uniform(-0.0012, 0.0012), lng=lng + rng.uniform(-0.0012, 0.0012),
                created_at=when.astimezone(timezone.utc), severity=rng.choice((1, 2, 2, 3)),
                has_photo=rng.random() < 0.5, confirmations=rng.randint(0, 3), disputes=int(rng.random() < 0.1),
                status="resolved", demo=True,
            ))
    return out
