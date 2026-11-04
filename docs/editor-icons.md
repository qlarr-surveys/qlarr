# Editor icons

The survey editor takes every icon from one set, [lucide](https://lucide.dev),
and the specific glyph for each question type comes from the phase-3.3 editor
design, kept at [`docs/design/editor-phase-3.3.html`](design/editor-phase-3.3.html).
Open that file in a browser to see the design; it is the prototype the mapping
below was read from, so it settles any disagreement about which glyph belongs
to a type.

The map itself lives in `QUESTION_ICONS` in
`frontend/src/components/Questions/utils.jsx`. Adding a question type means
adding a row there.

## Question types

| Type | Design row | Icon |
|---|---|---|
| `text` | Short Text | `Type` |
| `paragraph` | Long Text | `AlignLeft` |
| `number` | Number | `Hash` |
| `email` | Email | `Mail` |
| `multiple_text` | Multiple Short Text | `Menu` |
| `scq` | Single Choice (Radio) | `CircleDot` |
| `mcq` | Multiple Choice (Checkbox) | `SquareCheck` |
| `autocomplete` | Autocomplete | `Search` |
| `hierarchical_autocomplete` | — | `ListTree` |
| `scq_array` | Single Choice Array | `LayoutGrid` |
| `mcq_array` | Multiple Choice Array | `Grid3x3` |
| `nps` | NPS | `Star` |
| `icon_scq` | Single Icon Choice | `Smile` |
| `image_scq` | Single Image Choice | `Image` |
| `scq_icon_array` | Single Choice Icon Array | `Grid2x2` |
| `icon_mcq` | Multiple Icon Choice | `Smile` |
| `image_mcq` | Multiple Image Choice | `Image` |
| `date` | Date | `Calendar` |
| `time` | Time | `Clock` |
| `date_time` | Date and Time | `Calendar` |
| `text_display` | Text Display | `FileText` |
| `image_display` | Image Display | `Image` |
| `video_display` | Video Display | `Video` |
| `barcode` | Barcode Scanner | `Menu` |
| `photo_capture` | Capture Photo | `Camera` |
| `video_capture` | Capture Video | `Video` |
| `ranking` | Ranking | `ChartNoAxesColumn` |
| `image_ranking` | Image Ranking | `ChartNoAxesColumn` |
| `file_upload` | File Upload | `Upload` |
| `signature` | — | `Signature` |
| pages | Add a new Page | `FilePlus` |

Several glyphs repeat — the two icon choices, the three image types, the two
video types, `multiple_text` and `barcode`, `date` and `date_time`, the two
rankings. That is how the design draws them.

Two rows are marked — above: the design has no hierarchical autocomplete and
no signature row, so those two glyphs were chosen to sit with the rest and are
the ones to revisit when the design covers them.

## Workspaces

| Tab | Icon |
|---|---|
| Builder | `SquarePen` |
| Theme | `Palette` |
| Translation | `Languages` |
| Settings | `SlidersHorizontal` |
| Responses | `ChartColumn` |

The design labels these Builder, Theme, Survey Languages, Configure and Survey
Results. The app still uses its own labels.

## Stroke

`ICON_STROKE` in `frontend/src/components/Questions/utils.jsx` is the stroke
width every editor icon draws with, at every size. Sharing one value is what
makes an icon in the type list read as the same set as the one in the
workspace strip above it.
