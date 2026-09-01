"""Dive-plan export — GeoJSON / CSV / GPX / KML (report §9 export endpoint).

Turns the ranked target list into artefacts a dive team can load into a handheld
GPS. This is the step that converts a computer-vision demo into a dive plan.
"""

from __future__ import annotations

import csv
import io
import json
from xml.sax.saxutils import escape

from app.schemas import Target

EXPORT_FORMATS = ("geojson", "csv", "gpx", "kml")

MEDIA_TYPES = {
    "geojson": "application/geo+json",
    "csv": "text/csv",
    "gpx": "application/gpx+xml",
    "kml": "application/vnd.google-earth.kml+xml",
}


def _name(t: Target) -> str:
    return f"{t.id} {t.object_class} p{t.priority:.2f}"


def to_geojson(targets: list[Target]) -> str:
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [t.lon, t.lat]},
            "properties": {
                "id": t.id,
                "class": t.object_class,
                "status": t.status,
                "priority": t.priority,
                "confidence": t.confidence,
                "depth_m": t.depth_m,
                "length_m": t.length_m,
                "entanglement_risk": t.entanglement_risk,
                "n_observations": t.n_observations,
            },
        }
        for t in targets
    ]
    return json.dumps({"type": "FeatureCollection", "features": features}, indent=2)


def to_csv(targets: list[Target]) -> str:
    buf = io.StringIO()
    cols = [
        "id", "class", "status", "lat", "lon", "depth_m", "length_m", "width_m",
        "confidence", "priority", "entanglement_risk", "reef_proximity_m",
        "diver_accessibility", "n_observations", "survey_id",
    ]
    w = csv.writer(buf)
    w.writerow(cols)
    for t in targets:
        w.writerow([
            t.id, t.object_class, t.status, t.lat, t.lon, t.depth_m, t.length_m,
            t.width_m, t.confidence, t.priority, t.entanglement_risk,
            t.reef_proximity_m, t.diver_accessibility, t.n_observations, t.survey_id,
        ])
    return buf.getvalue()


def to_gpx(targets: list[Target]) -> str:
    pts = "\n".join(
        f'  <wpt lat="{t.lat}" lon="{t.lon}">\n'
        f"    <name>{escape(_name(t))}</name>\n"
        f"    <desc>{escape(f'{t.object_class} | confidence {t.confidence:.2f} | depth {t.depth_m} m')}</desc>\n"
        f"    <sym>Diamond</sym>\n"
        f"  </wpt>"
        for t in targets
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx version="1.1" creator="Kadal Netra" xmlns="http://www.topografix.com/GPX/1/1">\n'
        f"{pts}\n"
        "</gpx>\n"
    )


def to_kml(targets: list[Target]) -> str:
    placemarks = "\n".join(
        f"    <Placemark>\n"
        f"      <name>{escape(_name(t))}</name>\n"
        f"      <description>{escape(f'{t.status} | priority {t.priority:.2f}')}</description>\n"
        f"      <Point><coordinates>{t.lon},{t.lat},0</coordinates></Point>\n"
        f"    </Placemark>"
        for t in targets
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        "  <Document>\n"
        "    <name>Kadal Netra dive plan</name>\n"
        f"{placemarks}\n"
        "  </Document>\n"
        "</kml>\n"
    )


def render(fmt: str, targets: list[Target]) -> str:
    return {
        "geojson": to_geojson,
        "csv": to_csv,
        "gpx": to_gpx,
        "kml": to_kml,
    }[fmt](targets)
