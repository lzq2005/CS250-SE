"""Offline build helper, not an application dependency.

Requires pyproj/shapely in a separate tool environment. Input: saved DSEC layer-0
query JSON with ORIGINAL Macau Grid coordinates (not degrees). See A-04 handoff.
Usage: python build_macau_land.py <zones.json>
"""
import json
import sys
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import Polygon
from shapely.ops import transform, unary_union

data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
transformer = Transformer.from_crs(8433, 4326, always_xy=True)
polygons = []
for feature in data["features"]:
    if feature["attributes"]["Zona"] in [0, 99]:  # maritime / Hengqin campus
        continue
    polygon = Polygon()
    for ring in feature["geometry"]["rings"]:
        polygon = polygon.symmetric_difference(Polygon(ring).buffer(0))
    polygons.append(transform(transformer.transform, polygon))
land = unary_union(polygons).buffer(-0.00010).simplify(0.00001, preserve_topology=True)
parts = land.geoms if land.geom_type == "MultiPolygon" else [land]
coordinates = [
    [[[round(x, 7), round(y, 7)] for x, y in ring.coords]
     for ring in [part.exterior, *part.interiors]]
    for part in parts
]
Path(__file__).with_name("macau-land.ts").write_text(
    "// DSEC Census 2021 land statistical zones; EPSG:8433 to WGS84.\n"
    "// Source, conservative exclusions and conversion: docs/engineering/A-04-trip-setup.md\n"
    "export const macauLand: number[][][][] = "
    + json.dumps(coordinates, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
