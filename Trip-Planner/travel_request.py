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

# Buffer for agent text output only (call save() to capture TextBlock content)
_output_buf = io.StringIO()


def save(text):
    """Capture agent text to the output file (and print to console)."""
    print(text)
    _output_buf.write(text)


def run(title, coro, filename, subtitle=None):
    """Print a header, run an async main(), and save agent output to Outputs/<filename>."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    _output_buf.truncate(0)
    _output_buf.seek(0)

    print("=" * 60)
    print(title)
    if subtitle:
        print(f"  What's New: {subtitle}")
    print("=" * 60)

    asyncio.run(coro)

    with open(os.path.join(OUTPUT_DIR, filename), "w", encoding="utf-8") as f:
        f.write(_output_buf.getvalue())


# ── The messy human request our agents will process ────────

TRAVEL_REQUEST = """
hey so me and my friend want to plan a trip in October,
maybe 5-6 days? We love food and history but hate touristy crowds. Thinking
Europe but open to ideas — already done Paris and London.

Budget: $5,000-$7,000 (not counting flights). Nice hotel but nothing crazy.
He's vegetarian. And I get motion sick on boats so no cruises!

Let me know what you think!
"""

SYSTEM_PROMPT = (
    "You are a travel planning specialist. "
    "Analyze travel requests and recommend destinations. "
    "Be concise and professional. Keep responses short — "
    "use bullet points over paragraphs, skip filler, "
    "and aim for under 300 words."
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
    "lisbon": {
        "city": "Lisbon",
        "country": "Portugal",
        "best_months": ["September", "October", "March", "April"],
        "avg_daily_cost_usd": 130,
        "avg_hotel_per_night_usd": 150,
        "crowd_level": "Moderate-High in Alfama/Belém, but many quiet neighborhoods",
        "food_scene": "Booming vegetarian scene -- 30+ dedicated restaurants. Incredible pastéis de nata and petiscos culture",
        "history_highlights": ["Belém Tower (UNESCO)", "Jerónimos Monastery", "São Jorge Castle", "Alfama district"],
        "vegetarian_friendly": 4.3,
        "motion_sick_risk": "Low -- trams and walkable, no boats needed",
        "insider_tip": "Skip Belém at weekends. LX Factory for creative food scene, Mouraria for authentic local dining",
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
