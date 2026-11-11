import { useSelector } from "react-redux";
import { useResponsive } from "~/hooks/use-responsive";

export {
  isEquivalent,
  nextId,
  firstIndexInArray,
  lastIndexInArray,
  isQuestion,
  isGroup,
  buildCodeIndex,
  stripTags,
} from "@qlarr/design-core/utils/pureUtils";
import { isEquivalent } from "@qlarr/design-core/utils/pureUtils";

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

export const groupTypeOf = (group) =>
  (group?.type || group?.groupType || "").toLowerCase();

export const pageLabels = (groups, t) => {
  let pageNumber = 1;
  return groups.map((group) => {
    const groupType = groupTypeOf(group);
    if (groupType === "welcome") return t("welcome_page_label");
    if (groupType === "end") return t("thank_you_page_label");
    return t("page_label", { number: pageNumber++ });
  });
};

export function truncateWithEllipsis(text, maxLength) {
  if (text?.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  } else {
    return text;
  }
}


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
  const template = document.createElement("template");
  template.innerHTML = html;
  const paragraph = Array.from(template.content.children).find(
    (element) => element.tagName === "P" && element.textContent.trim()
  );
  if (!paragraph) return html + asterisk;
  paragraph.insertAdjacentHTML("beforeend", asterisk);
  return template.innerHTML;
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
