"""Tester for beregning av billigste og dyreste time."""

from datetime import datetime, timedelta, timezone
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
import unittest

PRISMODUL_STI = (
    Path(__file__).parents[1]
    / "custom_components"
    / "nordpool_stromoversikt"
    / "price.py"
)
SPESIFIKASJON = spec_from_file_location("nordpool_pris", PRISMODUL_STI)
assert SPESIFIKASJON is not None
assert SPESIFIKASJON.loader is not None
PRISMODUL = module_from_spec(SPESIFIKASJON)
sys.modules[SPESIFIKASJON.name] = PRISMODUL
SPESIFIKASJON.loader.exec_module(PRISMODUL)

hele_timer_fra_raw_today = PRISMODUL.hele_timer_fra_raw_today
hele_timer_fra_today = PRISMODUL.hele_timer_fra_today
formater_tidsrom = PRISMODUL.formater_tidsrom
velg_time = PRISMODUL.velg_time


class PristimeTest(unittest.TestCase):
    """Kontroller beregning av hele pristimer."""

    def setUp(self) -> None:
        """Lag et fast starttidspunkt."""
        self.start = datetime(2026, 7, 19, tzinfo=timezone.utc)

    def test_kvarterspriser_blir_hele_timer(self) -> None:
        """Fire kvarterspriser skal bli én hel time med eksklusiv stopptid."""
        raw_today = []
        for indeks in range(96):
            delstart = self.start + timedelta(minutes=15 * indeks)
            time = indeks // 4
            pris = 0.1 if time == 3 else 1.0
            raw_today.append(
                {
                    "start": delstart,
                    "end": delstart + timedelta(minutes=15),
                    "value": pris,
                }
            )

        timer = hele_timer_fra_raw_today(raw_today)
        billigste = velg_time(timer, høyeste=False)

        self.assertEqual(len(timer), 24)
        self.assertIsNotNone(billigste)
        assert billigste is not None
        self.assertEqual(billigste[0], 0.1)
        self.assertEqual(billigste[1].hour, 3)
        self.assertEqual(
            (billigste[2].hour, billigste[2].minute, billigste[2].second),
            (4, 0, 0),
        )

    def test_today_finner_billigste_og_dyreste(self) -> None:
        """Laveste og høyeste pris skal velges fra 24 timepriser."""
        today = [1.0] * 24
        today[5] = -0.2
        today[18] = 2.5

        timer = hele_timer_fra_today(today, self.start)
        billigste = velg_time(timer, høyeste=False)
        dyreste = velg_time(timer, høyeste=True)

        self.assertIsNotNone(billigste)
        self.assertIsNotNone(dyreste)
        assert billigste is not None
        assert dyreste is not None
        self.assertEqual(billigste[1].hour, 5)
        self.assertEqual(dyreste[1].hour, 18)

    def test_første_time_velges_ved_lik_pris(self) -> None:
        """Første time skal velges når flere timer har samme pris."""
        today = [1.0] * 24

        timer = hele_timer_fra_today(today, self.start)
        billigste = velg_time(timer, høyeste=False)
        dyreste = velg_time(timer, høyeste=True)

        self.assertIsNotNone(billigste)
        self.assertIsNotNone(dyreste)
        assert billigste is not None
        assert dyreste is not None
        self.assertEqual(billigste[1].hour, 0)
        self.assertEqual(dyreste[1].hour, 0)

    def test_time_med_manglende_kvarter_utelates(self) -> None:
        """En klokktime med et hull skal ikke regnes som hel."""
        raw_today = [
            {
                "start": self.start + timedelta(minutes=15 * indeks),
                "end": self.start + timedelta(minutes=15 * (indeks + 1)),
                "value": 1.0,
            }
            for indeks in (0, 1, 3)
        ]

        self.assertEqual(hele_timer_fra_raw_today(raw_today), [])

    def test_tidsrom_formateres_som_sensorverdi(self) -> None:
        """Start og stopp skal vises som ett lesbart tidsrom."""
        start = self.start.replace(hour=23)
        stopp = start + timedelta(hours=1)

        self.assertEqual(formater_tidsrom(start, stopp), "23:00-00:00")


if __name__ == "__main__":
    unittest.main()
