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
pris_etter_stromstotte = PRISMODUL.pris_etter_stromstotte
timepriser_fra_dagspriser = PRISMODUL.timepriser_fra_dagspriser
timepriser_etter_stromstotte = PRISMODUL.timepriser_etter_stromstotte
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

    def test_today_med_kvarterspriser_blir_timepriser_etter_stotte(self) -> None:
        """96 kvarterspriser skal bli 24 støttekorrigerte timepriser."""
        today = [0.5] * 4 + [1.5] * 92

        priser = timepriser_etter_stromstotte(today, self.start)

        self.assertEqual(len(priser), 24)
        self.assertEqual(priser[0], 0.5)
        self.assertEqual(priser[1:], [1.02] * 23)

    def test_kvarterspriser_blir_24_timepriser(self) -> None:
        """Fire kvarterspriser skal gjennomsnittberegnes til én timepris."""
        dagspriser = [1.0, 1.0, 2.0, 2.0] * 24

        priser = timepriser_fra_dagspriser(dagspriser, self.start)

        self.assertEqual(priser, [1.5] * 24)

    def test_sommertid_dogn_med_23_timer_godtas(self) -> None:
        """92 kvarterspriser skal bli 23 timepriser."""
        dagspriser = [1.0, 1.0, 2.0, 2.0] * 23

        priser = timepriser_fra_dagspriser(dagspriser, self.start)

        self.assertEqual(priser, [1.5] * 23)

    def test_vintertid_dogn_med_25_timer_godtas(self) -> None:
        """100 kvarterspriser skal bli 25 timepriser."""
        dagspriser = [1.0, 1.0, 2.0, 2.0] * 25

        priser = timepriser_fra_dagspriser(dagspriser, self.start)

        self.assertEqual(priser, [1.5] * 25)

    def test_ugyldig_dagsliste_gir_ingen_timepriser(self) -> None:
        """En ufullstendig dagsliste skal ikke gi delvise timepriser."""
        self.assertEqual(
            timepriser_fra_dagspriser([1.0] * 95, self.start),
            [],
        )

    def test_ugyldig_today_gir_ingen_timepriser(self) -> None:
        """En ufullstendig dagsliste skal ikke gi delvise attributtverdier."""
        self.assertEqual(
            timepriser_etter_stromstotte([1.0] * 95, self.start),
            [],
        )

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


class StromstotteTest(unittest.TestCase):
    """Kontroller beregning av pris etter strømstøtte."""

    def test_pris_under_grensen_endres_ikke(self) -> None:
        """Det gis ikke støtte når prisen er under grensen."""
        self.assertEqual(pris_etter_stromstotte(0.5), 0.5)

    def test_pris_pa_grensen_endres_ikke(self) -> None:
        """Prisen avrundes til to desimaler når den er lik grensen."""
        self.assertEqual(pris_etter_stromstotte(0.9625), 0.96)

    def test_nitti_prosent_over_grensen_dekkes(self) -> None:
        """Staten dekker 90 prosent og resultatet får to desimaler."""
        self.assertEqual(pris_etter_stromstotte(1.5), 1.02)


if __name__ == "__main__":
    unittest.main()
