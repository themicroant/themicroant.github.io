# Image slots

Everything on screen is requested by a key (`<kind>_<id>`). Images here are written by the generate-art skill's
importer to `<kind dir>/<id>.<ext>`, as set in [`art.config.json`](../../art.config.json). The game loads every id
listed in [`art/descriptions.json`](../../art/descriptions.json) and draws a procedural placeholder for any that are
missing. To add an image: add its id to `descriptions.json`, then generate and import it. No code change needed.

| kind | folder | used for | size |
|---|---|---|---|
| `bg` | `backgrounds/*.jpg` | full-screen backgrounds (title, hub, dialogue) | 720×1338 |
| `portrait` | `portraits/*.png` | dialogue speaker | 384×384 |
| `tile` | `tiles/*.png` | battle terrain, seamless | 128×128 |
| `mech` | `mechs/<chassis>_<team>.png` | battle sprite, facing RIGHT, transparent | 256×256 |
| `unit` | `units/*.png` | the water cart "Bessie", transparent | 256×256 |

Part icons (`part_<partId>`) and crates (`crate_<kind>`) have no kind in `art.config.json` yet and always use
placeholders. Files not listed in `descriptions.json` (such as the `portraits/*_b.png` alternates) are ignored.
