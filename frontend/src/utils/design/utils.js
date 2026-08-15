import { useSelector } from "react-redux";
import { useResponsive } from "~/hooks/use-responsive";
import {
  QUESTION_CODE_PATTERN,
  GROUP_CODE_PATTERN,
  STRIP_TAGS_PATTERN,
} from "~/constants/instruction";

export {
  isEquivalent,
  nextId,
  firstIndexInArray,
  lastIndexInArray,
} from "./pureUtils";
import { isEquivalent } from "./pureUtils";

export const diff = (obj1, obj2) => {
  if (!obj2 || Object.prototype.toString.call(obj2) !== "[object Object]") {
    return obj1;
  }

  let diffs = {};
  let key;

  let arraysMatch = function (arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    for (var i = 0; i < arr1.length; i++) {
      if (!isEquivalent(arr1[i], arr2[i])) {
        return false;
      }
    }

    return true;
  };

  const compare = function (item1, item2, key) {
    let type1 = Object.prototype.toString.call(item1);
    let type2 = Object.prototype.toString.call(item2);

    if (type2 === "[object Undefined]") {
      diffs[key] = null;
      return;
    }

    if (type1 !== type2) {
      diffs[key] = item2;
      return;
    }

    if (type1 === "[object Object]") {
      let objDiff = diff(item1, item2);
      if (Object.keys(objDiff).length > 0) {
        diffs[key] = objDiff;
      }
      return;
    }

    if (type1 === "[object Array]") {
      if (!arraysMatch(item1, item2)) {
        diffs[key] = item2;
      }
      return;
    }

    if (type1 === "[object Function]") {
      if (item1.toString() !== item2.toString()) {
        diffs[key] = item2;
      }
    } else {
      if (item1 !== item2) {
        diffs[key] = item2;
      }
    }
  };

  for (key in obj1) {
    if (obj1.hasOwnProperty(key)) {
      compare(obj1[key], obj2[key], key);
    }
  }

  for (key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (!(key in obj1)) {
        diffs[key] = obj2[key];
      } else if (obj1[key] !== obj2[key]) {
        diffs[key] = obj2[key];
      }
    }
  }

  return diffs;
};

export const stripTags = (string) => {
  if (typeof string !== "string") return string;
  return string
    .replace(STRIP_TAGS_PATTERN, "")
    .replace(/\{\{.*?\}\}/g, "{{ ... }}");
};

export function truncateWithEllipsis(text, maxLength) {
  if (text?.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  } else {
    return text;
  }
}

export const isQuestion = (code) => QUESTION_CODE_PATTERN.test(code);
export const isGroup = (code) => GROUP_CODE_PATTERN.test(code);

export const isNotEmptyHtml = (value) => {
  if (!value) return false;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = value;

  const textContent = tempDiv.textContent || tempDiv.innerText || "";

  const hasImages = tempDiv.querySelectorAll("img").length > 0;

  return textContent.trim().length > 0 || hasImages;
};

export function appendRequiredAsterisk(html, color) {
  if (!html) return html;
  const asterisk = `<span style="color: ${color}; font-weight: 600; margin-inline-start: 5px;">*</span>`;
  const lastCloseTagIndex = html.lastIndexOf("</");
  if (lastCloseTagIndex !== -1) {
    return html.slice(0, lastCloseTagIndex) + asterisk + html.slice(lastCloseTagIndex);
  }
  return html + asterisk;
}

export const useColumnMinWidth = (code, runComponent) => {
  const isDesktop = useResponsive("up", "lg");
  const isTablet = useResponsive("between", "md", "lg");

  const designStateWidths = useSelector((state) => state?.designState?.[code]);
  const widthSetups = {
    minHeaderDesktop: 90,
    minHeaderMobile: 60,
    minRowLabelDesktop: 90,
    minRowLabelMobile: 60,
    ...(runComponent || {}),
    ...(designStateWidths || {}),
  };
  const {
    minHeaderDesktop,
    minHeaderMobile,
    minRowLabelDesktop,
    minRowLabelMobile,
  } = widthSetups;

  if (isDesktop || isTablet) {
    return {
      header: `${minHeaderDesktop}`,
      rowLabel: `${minRowLabelDesktop}`,
    };
  }

  return {
    header: `${minHeaderMobile}`,
    rowLabel: `${minRowLabelMobile}`,
  };
};
