"""Beregning av hele klokketimer fra Nord Pool-priser."""

from __future__ import annotations

from datetime import datetime, timedelta
import math
from typing import Any

Pristime = tuple[float, datetime, datetime]


def formater_tidsrom(start: datetime, stopp: datetime) -> str:
    """Formater et tidsrom som klokkeslett uten dato."""
    return f"{start:%H:%M}-{stopp:%H:%M}"


def hele_timer_fra_raw_today(raw_today: Any) -> list[Pristime]:
    """Lag hele klokketimer fra tidsfestede prisintervaller."""
    if not isinstance(raw_today, list):
        return []

    perioder: list[tuple[datetime, datetime, float]] = []
    for oppføring in raw_today:
        if not isinstance(oppføring, dict):
            continue

        start = _som_datetime(oppføring.get("start"))
        slutt = _som_datetime(oppføring.get("end"))
        try:
            pris = float(oppføring["value"])
        except (KeyError, TypeError, ValueError):
            continue

        if start is None or slutt is None or slutt <= start:
            continue
        if not math.isfinite(pris):
            continue

        perioder.append((start, slutt, pris))

    kandidater = {
        start.replace(minute=0, second=0, microsecond=0)
        for start, _slutt, _pris in perioder
    }
    hele_timer: list[Pristime] = []

    for timestart in sorted(kandidater):
        timeslutt = timestart + timedelta(hours=1)
        deler: list[tuple[datetime, datetime, float]] = []

        for start, slutt, pris in perioder:
            delstart = max(start, timestart)
            delslutt = min(slutt, timeslutt)
            if delstart < delslutt:
                deler.append((delstart, delslutt, pris))

        deler.sort(key=lambda delperiode: delperiode[0])
        neste_tid = timestart
        pris_ganger_sekunder = 0.0

        for delstart, delslutt, pris in deler:
            if delstart > neste_tid:
                break

            gyldig_start = max(delstart, neste_tid)
            if delslutt <= gyldig_start:
                continue

            sekunder = (delslutt - gyldig_start).total_seconds()
            pris_ganger_sekunder += pris * sekunder
            neste_tid = delslutt

            if neste_tid >= timeslutt:
                break

        if neste_tid < timeslutt:
            continue

        timepris = pris_ganger_sekunder / timedelta(hours=1).total_seconds()
        hele_timer.append((timepris, timestart, timeslutt))

    return hele_timer


def hele_timer_fra_today(today: Any, nå: datetime) -> list[Pristime]:
    """Lag hele klokketimer fra en liste med time- eller kvarterspriser."""
    if (
        not isinstance(today, list)
        or len(today) < 24
        or len(today) % 24 != 0
    ):
        return []

    verdier_per_time = len(today) // 24
    hele_timer: list[Pristime] = []

    for time in range(24):
        timeverdier = today[
            time * verdier_per_time : (time + 1) * verdier_per_time
        ]
        try:
            gyldige_verdier = [float(verdi) for verdi in timeverdier]
        except (TypeError, ValueError):
            continue

        if (
            len(gyldige_verdier) != verdier_per_time
            or not all(math.isfinite(verdi) for verdi in gyldige_verdier)
        ):
            continue

        start = nå.replace(hour=time, minute=0, second=0, microsecond=0)
        hele_timer.append(
            (
                sum(gyldige_verdier) / verdier_per_time,
                start,
                start + timedelta(hours=1),
            )
        )

    return hele_timer


def velg_time(timer: list[Pristime], *, høyeste: bool) -> Pristime | None:
    """Velg første time med lavest eller høyest pris."""
    if not timer:
        return None
    velger = max if høyeste else min
    return velger(timer, key=lambda time: time[0])


def _som_datetime(verdi: Any) -> datetime | None:
    """Gjør om en datetime eller ISO-tekst til datetime."""
    if isinstance(verdi, datetime):
        return verdi
    if isinstance(verdi, str):
        try:
            return datetime.fromisoformat(verdi.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None
