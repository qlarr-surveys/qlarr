# Locales Structure

This folder contains internationalization (i18n) files organized by language and namespace.

## Folder Structure

```
locales/
├── en/                    # English
│   ├── design/            # Design-related namespaces
│   │   ├── core.json      # Main designer UI
│   │   ├── editor.json    # TipTap rich text editor
│   │   ├── logic.json     # Logic builder
│   │   └── tooltips.json  # Help tooltips
│   ├── manage.json        # Dashboard, auth, survey management
│   └── run.json           # Respondent-facing survey runtime
├── ar/                    # Arabic (same structure)
├── de/                    # German
├── es/                    # Spanish
├── fr/                    # French
├── nl/                    # Dutch
├── pt/                    # Portuguese
└── README.md              # This file
```

Each language folder contains the same namespace files.

---

## Namespaces

### `manage.json`
**Purpose:** Dashboard, authentication, and survey management pages.

**When to use:** Any text on pages like login, dashboard, profile, user management, responses.

**Examples:**
- Login/logout labels
- Dashboard titles
- User management table headers
- Survey list actions
- Error messages for auth

**Loaded:** Initially on app start (for web mode)

---

### `run.json`
**Purpose:** Survey runtime/preview - the respondent-facing survey experience.

**When to use:** Text shown to respondents when filling out a survey.

**Examples:**
- "Next", "Previous", "Submit" buttons
- Validation messages shown to respondents
- Progress indicators
- Survey completion messages

**Loaded:** On preview/run routes, or initially for Android mode

---

### `design/core.json`
**Purpose:** Main survey designer UI elements.

**When to use:** Labels, buttons, and text in the survey designer that are NOT in the rich text editor or logic builder.

**Examples:**
- Side panel labels ("Design", "Theme", "Translation")
- Question type names
- Setup panel labels
- General buttons ("Save", "Cancel", "Delete")
- Validation setup labels
- Error messages in designer

**Loaded:** On design routes

---

### `design/editor.json`
**Purpose:** TipTap rich text editor toolbar and controls.

**When to use:** All text related to the rich text editor (question content editing).

**Key pattern:** Flat keys (no prefix needed since file scope is clear)

**Examples:**
- `bold`, `italic`, `underline`
- `insert_image`, `link`
- `font_size_small`, `font_size_large`
- `ordered_list`, `bullet_list`

**Loaded:** On design routes

---

### `design/logic.json`
**Purpose:** Logic Builder / Query Builder for conditional visibility and skip logic.

**When to use:** Labels and text within the logic builder dialog.

**Key prefix:** All keys are nested under `logic_builder.`

**Examples:**
- `logic_builder.add_rule`, `logic_builder.add_group`
- `logic_builder.equals`, `logic_builder.not_equals`
- `logic_builder.is_displayed`, `logic_builder.is_hidden`
- `logic_builder.field`, `logic_builder.value`

**Loaded:** On design routes

---

### `design/tooltips.json`
**Purpose:** Help tooltips throughout the survey designer.

**When to use:** Explanatory tooltip text that appears on hover over help icons.

**Key prefix:** All keys are nested under `tooltips.`

**Examples:**
- `tooltips.relevance` - explains conditional visibility
- `tooltips.validation_required` - explains required field setting
- `tooltips.randomize_options` - explains option randomization

**Loaded:** On design routes

---

## Quick Reference

| Namespace | Use For | Key Pattern |
|-----------|---------|-------------|
| `manage` | Dashboard, auth, survey list | Flat keys |
| `run` | Respondent-facing survey | Flat keys |
| `design/core` | Designer UI (main) | Flat keys |
| `design/editor` | Rich text editor | Flat keys |
| `design/logic` | Logic builder | `logic_builder.*` |
| `design/tooltips` | Help tooltips |  Flat keys |

---

## Adding New Translations

1. **Identify the correct namespace** using the table above
2. **Add the key** to the English file first: `en/<namespace>.json`
3. **Add translations** to all other language files
4. **Use in code:**
   ```javascript
   // Most components - namespace loaded automatically via route
   const { t } = useTranslation("design/core");

   // For editor components
   const { t } = useTranslation("design/editor");

   // If you need keys from multiple namespaces
   const { t } = useTranslation(["design/editor", "design/core"]);
   ```

---

## Adding a New Language

1. Copy an existing language folder (e.g., `en/`)
2. Rename to the new language code (e.g., `ja/` for Japanese)
3. Translate all files (including the `design/` subfolder)
4. Add the language code to `supportedLngs` in `src/App.jsx`
5. Add the language option to `LanguageSelector` component
