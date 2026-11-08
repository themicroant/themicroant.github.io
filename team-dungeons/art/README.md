# Placeholder art

Every file here is a deliberately simple placeholder. Replace any file with a same-named file of your own art.

| File | What it is | Size |
|---|---|---|
| `art/units/warrior.png` | Party hero: warrior | 128x128 |
| `art/units/paladin.png` | Party hero: paladin | 128x128 |
| `art/units/priest.png` | Party hero: priest | 128x128 |
| `art/units/mage.png` | Party hero: mage | 128x128 |
| `art/units/rogue.png` | Party hero: rogue | 128x128 |
| `art/units/hunter.png` | Party hero: hunter | 128x128 |
| `art/units/skeleton.png` | Enemy: skeleton | 128x128 |
| `art/units/archer.png` | Enemy: skeleton archer | 128x128 |
| `art/units/ghoul.png` | Enemy: ghoul | 128x128 |
| `art/units/acolyte.png` | Enemy: acolyte | 128x128 |
| `art/units/spider.png` | Enemy: spider | 128x128 |
| `art/units/broodmother.png` | Enemy (elite): broodmother | 128x128 |
| `art/units/golem.png` | Enemy (elite): golem | 128x128 |
| `art/units/bishop.png` | Boss: bishop | 128x128 |
| `art/tiles/floor.png` | Terrain tile: floor | 64x64 |
| `art/tiles/wall.png` | Terrain tile: wall | 64x64 |
| `art/tiles/pillar.png` | Terrain tile: pillar | 64x64 |
| `art/tiles/water.png` | Terrain tile: water | 64x64 |
| `art/tiles/rubble.png` | Terrain tile: rubble | 64x64 |

## Notes

- Any file can be replaced by a same-named file. PNG works too: change the matching path in `client/src/art.ts` from `.svg` to `.png`.
- Units are drawn standing on a tile and scaled to the tile width (elite units 1.25x, the boss 1.45x). Use a square canvas with a transparent background and put the feet at the bottom edge.
- Tiles are square and fully opaque, and should tile seamlessly next to copies of themselves (no outer shadows or glows).
- Recommended sizes: 128x128 for units, 64x64 or 128x128 for tiles.
