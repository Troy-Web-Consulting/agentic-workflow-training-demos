"""
Shared data for all demo steps.
"""

import asyncio
import io
import json
import os
import sys
from claude_agent_sdk import tool
from typing import Any

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "Outputs")


def run(title, coro, filename):
    """Print a header, run an async main(), and save all output to Outputs/<filename>."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    buf = io.StringIO()
    original = sys.stdout
    sys.stdout = type("Tee", (), {
        "write": lambda _, s: (original.write(s), buf.write(s)),
        "flush": lambda _: (original.flush(), buf.flush()),
    })()
    try:
        print("=" * 60)
        print(title)
        print("=" * 60)
        asyncio.run(coro)
    finally:
        sys.stdout = original
    with open(os.path.join(OUTPUT_DIR, filename), "w", encoding="utf-8") as f:
        f.write(buf.getvalue())


# ── The messy human request our agents will process ────────

TRAVEL_REQUEST = """
hey so me and my wife have been talking and we really want to do something
for our anniversary in October, maybe like 5-6 days? We're both super into
food and history but she HATES super touristy stuff and big crowds. We were
thinking maybe somewhere in Europe but honestly open to ideas. We've already
done Paris and London so not those.

Budget-wise we could probably swing like $5,000-$7,000 for the whole trip
not counting flights? We'd want a nice hotel, nothing crazy but not a hostel
lol. Oh and she's vegetarian if that matters for the food scene.

Also I get motion sick on boats so probably no cruises or island hopping haha.

Anyway let me know what you think!!
"""

SYSTEM_PROMPT = (
    "You are a travel planning specialist. "
    "Analyze travel requests and recommend destinations. "
    "Be concise and professional."
)


# ── Destination Database ───────────────────────────────────
# The agent doesn't know what's in here — it has to call the tool.

DESTINATIONS = {
    "porto": {
        "city": "Porto",
        "country": "Portugal",
        "best_months": ["September", "October", "May", "June"],
        "avg_daily_cost_usd": 150,
        "avg_hotel_per_night_usd": 180,
        "crowd_level": "Moderate -- much less touristy than Lisbon",
        "food_scene": "World-class. Booming vegetarian scene in Cedofeita neighborhood",
        "history_highlights": ["Ribeira District (UNESCO)", "Livraria Lello", "Clerigos Tower"],
        "vegetarian_friendly": 4.2,
        "motion_sick_risk": "Low -- walkable city, no boats required",
        "insider_tip": "Port wine tasting at Graham's Lodge -- best views at sunset",
    },
    "bologna": {
        "city": "Bologna",
        "country": "Italy",
        "best_months": ["September", "October", "April", "May"],
        "avg_daily_cost_usd": 170,
        "avg_hotel_per_night_usd": 200,
        "crowd_level": "Low -- locals outnumber tourists, authentic experience",
        "food_scene": "Food capital of Italy. Excellent vegetarian pasta and gelato tradition",
        "history_highlights": ["Two Towers", "Oldest university in the world (1088)", "Piazza Maggiore"],
        "vegetarian_friendly": 4.5,
        "motion_sick_risk": "Low -- flat, very walkable",
        "insider_tip": "Day trip to Ravenna (1hr train) for Byzantine mosaics",
    },
    "kyoto": {
        "city": "Kyoto",
        "country": "Japan",
        "best_months": ["October", "November", "March", "April"],
        "avg_daily_cost_usd": 160,
        "avg_hotel_per_night_usd": 190,
        "crowd_level": "Varies -- popular temples crowded, but many hidden gems",
        "food_scene": "Exceptional. Incredible vegetarian Buddhist temple food (shojin ryori)",
        "history_highlights": ["Fushimi Inari Shrine", "Golden Pavilion", "Arashiyama Bamboo Grove"],
        "vegetarian_friendly": 4.7,
        "motion_sick_risk": "Low -- excellent subway/bus, very bikeable",
        "insider_tip": "Tofuku-ji temple for October fall colors -- way less crowded",
    },
}


# ── Tool Definition ────────────────────────────────────────
# This is all it takes to give an agent a callable tool.

@tool(
    "lookup_destination",
    "Look up travel info for a city: costs, food scene, history, crowd levels, and tips.",
    {"city_name": str},
)
async def lookup_destination(args: dict[str, Any]) -> dict[str, Any]:
    city = args["city_name"].lower().strip()
    print(f"  >> Looking up '{args['city_name']}'...")

    if city in DESTINATIONS:
        info = DESTINATIONS[city]
        print(f"  >> Found: {info['city']}, {info['country']}")
        return {"content": [{"type": "text", "text": json.dumps(info, indent=2)}]}

    print(f"  >> '{args['city_name']}' not in database")
    return {
        "content": [{"type": "text", "text": json.dumps({"error": "City not found"})}]
    }


