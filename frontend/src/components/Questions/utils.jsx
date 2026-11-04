import React from "react";
import {
  AlignLeft,
  Calendar,
  CalendarClock,
  Camera,
  CircleDot,
  Clock,
  FileImage,
  FileText,
  FileVideo,
  GalleryVerticalEnd,
  Gauge,
  Grid2x2,
  Hash,
  Image,
  Images,
  LayoutGrid,
  ListOrdered,
  ListTree,
  Mail,
  Paperclip,
  Rows3,
  ScanBarcode,
  Search,
  Signature,
  Smile,
  SmilePlus,
  SquareCheck,
  Table,
  TextCursorInput,
  Video,
} from "lucide-react";
import { getContrastRatio } from "@mui/material";

const QUESTION_ICONS = {
  text: TextCursorInput,
  paragraph: AlignLeft,
  number: Hash,
  email: Mail,
  multiple_text: Rows3,
  scq: CircleDot,
  mcq: SquareCheck,
  autocomplete: Search,
  hierarchical_autocomplete: ListTree,
  scq_array: Grid2x2,
  mcq_array: Table,
  nps: Gauge,
  icon_scq: Smile,
  image_scq: Image,
  scq_icon_array: LayoutGrid,
  icon_mcq: SmilePlus,
  image_mcq: Images,
  date: Calendar,
  time: Clock,
  date_time: CalendarClock,
  text_display: FileText,
  image_display: FileImage,
  video_display: FileVideo,
  barcode: ScanBarcode,
  photo_capture: Camera,
  video_capture: Video,
  ranking: ListOrdered,
  image_ranking: GalleryVerticalEnd,
  file_upload: Paperclip,
  signature: Signature,
};

// 1.33 against a 16px glyph is the stroke the workspace tabs draw; keeping the
// ratio is what makes an icon in the type list read as the same set as one in
// the strip above it.
export const ICON_STROKE = 1.33;

export const questionIconByType = (type, size = "1.25em", color) => {
  const Icon = QUESTION_ICONS[type];
  return Icon ? (
    <Icon size={size} color={color} strokeWidth={ICON_STROKE} />
  ) : undefined;
};

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function blendColors(color1, color2, opacity) {
  const r = Math.round(color1[0] * (1 - opacity) + color2[0] * opacity);
  const g = Math.round(color1[1] * (1 - opacity) + color2[1] * opacity);
  const b = Math.round(color1[2] * (1 - opacity) + color2[2] * opacity);
  return [r, g, b];
}

export const getContrastColor = (hexColor, opacity = 0.2) => {
  const rgbColor = hexToRgb(hexColor);

  // Calculate luminance
  const luminance =
    (0.299 * rgbColor[0] + 0.587 * rgbColor[1] + 0.114 * rgbColor[2]) / 255;

  // Determine contrast color (black or white)
  const contrastRgb = luminance > 0.5 ? [0, 0, 0] : [255, 255, 255];
  const effectiveOpacity = luminance > 0.5 ? opacity : 1 - opacity;

  // Blend the original color with the contrasting color
  const blendedRgb = blendColors(rgbColor, contrastRgb, effectiveOpacity);

  // Convert the blended RGB color back to hex
  return rgbToHex(...blendedRgb);
};

export const getMildBorderColor = (textColor, opacity = 0.2) => {
  const rgbColor = hexToRgb(textColor);

  // Create a gray color (neutral gray)
  const grayRgb = [120, 120, 120];

  // Blend the text color with gray to create a mild version
  const mildRgb = blendColors(rgbColor, grayRgb, opacity);

  // Convert back to hex
  return rgbToHex(...mildRgb);
};

const extractRgbaValues = (colorString) => {
  // Handle hex colors
  if (colorString.startsWith("#")) {
    const rgb = hexToRgb(colorString);
    return { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 };
  }

  // Handle rgba colors: rgba(r, g, b, a)
  const rgbaMatch = colorString.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d?\.?\d+)?\)/,
  );
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  // Handle rgb colors: rgb(r, g, b)
  const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: 1,
    };
  }

  // Default fallback
  return { r: 0, g: 0, b: 0, a: 1 };
};

export const colorToThemeMode = (color) => {
  const whiteContrast = getContrastRatio(color, "#ffffff");
  const blackContrast = getContrastRatio(color, "#000000");

  // If white text has better contrast, use dark theme
  return whiteContrast > blackContrast ? "light" : "dark";
};

export const QUESTION_TYPES = [
  {
    name: "section_text_based",
    type: "text",
    items: [
      {
        type: "text",
        icon: questionIconByType("text"),
      },
      {
        type: "paragraph",
        icon: questionIconByType("paragraph"),
      },
      {
        type: "number",
        icon: questionIconByType("number"),
      },
      {
        type: "email",
        icon: questionIconByType("email"),
      },
      {
        type: "multiple_text",
        icon: questionIconByType("multiple_text"),
      },
    ],
  },
  {
    name: "section_choice_based",
    type: "choice",
    items: [
      {
        type: "scq",
        icon: questionIconByType("scq"),
      },
      {
        type: "mcq",
        icon: questionIconByType("mcq"),
      },
      {
        type: "autocomplete",
        icon: questionIconByType("autocomplete"),
      },
      {
        type: "hierarchical_autocomplete",
        icon: questionIconByType("hierarchical_autocomplete"),
      },
      {
        type: "scq_array",
        icon: questionIconByType("scq_array"),
      },
      {
        type: "mcq_array",
        icon: questionIconByType("mcq_array"),
      },

      {
        type: "nps",
        icon: questionIconByType("nps"),
      },
    ],
  },
  {
    name: "section_image_choice_based",
    type: "choice",
    items: [
      {
        type: "icon_scq",
        icon: questionIconByType("icon_scq"),
      },
      {
        type: "image_scq",
        icon: questionIconByType("image_scq"),
      },
      {
        type: "scq_icon_array",
        icon: questionIconByType("scq_icon_array"),
      },
      {
        type: "icon_mcq",
        icon: questionIconByType("icon_mcq"),
      },
      {
        type: "image_mcq",
        icon: questionIconByType("image_mcq"),
      },
    ],
  },
  {
    name: "section_date_time",
    type: "date-time",
    items: [
      {
        type: "date",
        icon: questionIconByType("date"),
      },

      {
        type: "time",
        icon: questionIconByType("time"),
      },
      {
        type: "date_time",
        icon: questionIconByType("date_time"),
      },
    ],
  },
  {
    name: "section_info",
    type: "info",
    items: [
      {
        type: "text_display",
        icon: questionIconByType("text_display"),
      },
      {
        type: "image_display",
        icon: questionIconByType("image_display"),
      },
      {
        type: "video_display",
        icon: questionIconByType("video_display"),
      },
    ],
  },
  {
    name: "offline_only",
    type: "other",
    items: [
      {
        type: "barcode",
        offlineOnly: true,
        icon: questionIconByType("barcode"),
      },
      {
        type: "photo_capture",
        offlineOnly: true,
        icon: questionIconByType("photo_capture"),
      },
      {
        type: "video_capture",
        offlineOnly: true,
        icon: questionIconByType("video_capture"),
      },
    ],
  },
  {
    name: "section_other",
    type: "other",
    items: [
      {
        type: "ranking",
        icon: questionIconByType("ranking"),
      },
      {
        type: "image_ranking",
        icon: questionIconByType("image_ranking"),
      },
      {
        type: "file_upload",
        icon: questionIconByType("file_upload"),
      },
      {
        type: "signature",
        icon: questionIconByType("signature"),
      },
    ],
  },
];

export const isDisplay = (type) => {
  return ["text_display", "image_display", "video_display"].indexOf(type) > -1;
};

export { createQuestion, questionDesignError } from "@qlarr/design-core/factory/questionFactory";
