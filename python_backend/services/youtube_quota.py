#!/usr/bin/env python3
"""Simple YouTube Data API quota tracker (in-memory fallback).
Not perfectly accurate but prevents blowing the daily 10 000-unit limit.
Costs based on Google docs: search.list = 100, videos.list = 1.
"""

from datetime import datetime
import threading

_SEARCH_COST = 100
_VIDEOS_COST = 1
_DAILY_LIMIT = 9800  # leave a safety buffer

_lock = threading.Lock()
_state = {
    "date": datetime.utcnow().date(),
    "used": 0,
}


def _reset_if_new_day():
    today = datetime.utcnow().date()
    if _state["date"] != today:
        _state["date"] = today
        _state["used"] = 0


def remaining_quota() -> int:
    """Return remaining estimated units for today"""
    with _lock:
        _reset_if_new_day()
        return max(_DAILY_LIMIT - _state["used"], 0)


def can_spend(cost: int) -> bool:
    """Check if we can spend this many units"""
    with _lock:
        _reset_if_new_day()
        return (_state["used"] + cost) <= _DAILY_LIMIT


def spend(cost: int) -> bool:
    """Atomically spend units; returns False if not enough left."""
    with _lock:
        _reset_if_new_day()
        if (_state["used"] + cost) > _DAILY_LIMIT:
            return False
        _state["used"] += cost
        return True


# Convenience helpers ---------------------------------------------------------

def spend_search() -> bool:
    return spend(_SEARCH_COST)


def spend_videos(details_count: int = 1) -> bool:
    # Even if we request 20 ids, cost is 1 unit per call (not per id)
    return spend(_VIDEOS_COST) 