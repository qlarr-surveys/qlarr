import React from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import { ChevronDown, Settings2, X } from "lucide-react";
import FieldSize from "~/components/design/setup/FieldSize";
import ShowHint, { SetupTextInput } from "~/components/design/setup/ShowHint";
import ValidationSetupItem from "~/components/design/setup/validation/ValidationSetupItem";
import { SetupVariant } from "~/components/design/setup/SetupFields";
import ValidationRulesPanel from "../validation/ValidationRulesPanel";
import OrderInstructions from "../advanced/OrderInstructions";
import ConditionalRelevance from "../advanced/ConditionalRelevance";
import ToggleValue from "../ToggleValue";
import SelectValue from "../SelectValue";
import SelectDate from "../SelectDate";
import Relevance from "../logic/Relevance";
import SkipLogic from "../SkipLogic";
import CarryForward from "../CarryForward";
import RepeatSettings from "../RepeatSettings";
import {
  accessibleDependencies,
  isInsideRepeatable,
  hasRepeatableAncestor,
  isGroup,
  isQuestion,
} from "@qlarr/design-core";
import { resetSetup } from "~/state/design/designState";
import { pageLabels, stripTags } from "~/utils/design/utils";
import { rtlLanguage } from "~/utils/common";
import OrderSetup from "../orderPriority/OrderSetup";
import PrioritySetup from "../orderPriority/PrioritySetup";
import ScqDefaultValue from "../ScqDefaultValue";
import DisabledToggle from "../Disabled";
import MoveGroup from "../MoveGroup";
import MoveQuestion from "../MoveQuestion";
import EntityCodeEditor from "../EntityCodeEditor";
import CustomCSS from "../CustomCss";
import ConvertQuestionType from "../ConvertQuestionType";
import LogoSetup from "../LogoSetup";
import { useSetupView } from "./useSetupView";
import styles from "./SetupPanel.module.css";

const cx = (...names) => names.filter(Boolean).join(" ");

// What a selection shows above "Show advanced settings", in the design's
// order. Each shows only for a selection whose rules include it.
const BASIC_RULES = [
  "validation_required",
  "showDescription",
  "hint",
  "disabled",
  "move_question",
  "move_group",
];

/**
 * The settings of whatever is selected on the canvas, drawn to
 * docs/design/editor-phase-3.3.html: a header naming the selection, the
 * general settings, and the advanced settings behind their button, in tabs.
 *
 * Which settings exist is still design-core's `setupOptions`; this decides
 * only where each one is drawn.
 */
function SetupPanel({ t }) {
  const setupInfo = useSelector((state) => state.designState.setup);
  const code = setupInfo?.code;
  const rules = setupInfo?.rules;

  const showCarryForwardRule = useSelector((state) => {
    if (!code) return false;
    if (state.designState[code]?.carryForward) return true;
    if (!state.designState.componentIndex) return false;
    const deps = accessibleDependencies(state.designState.componentIndex, code) || [];
    return deps.some((d) =>
      ["mcq", "icon_mcq", "image_mcq"].includes(state.designState[d]?.type),
    );
  });

  const showRepetitionRule = useSelector((state) => {
    if (!code) return false;
    const ds = state.designState;
    if (ds[code]?.repeatSource) return true;
    if (!isGroup(code) && !isQuestion(code)) return false;
    if (ds[code]?.type === "end") return false;
    // Can't nest a repeatable inside a repeatable (NESTED_REPEATABLE).
    if (hasRepeatableAncestor(ds, code)) return false;
    if (!ds.componentIndex) return false;
    const deps = accessibleDependencies(ds.componentIndex, code) || [];
    return deps.some((d) =>
      ["mcq", "icon_mcq", "image_mcq", "number"].includes(ds[d]?.type),
    );
  });

  // The repeatable itself: its show-logic is the repeat condition, and a disabled
  // repeatable is contradictory — hide relevance + disable.
  const selfRepeatable = useSelector((state) => !!state.designState[code]?.repeatSource);
  // Skip logic is illegal anywhere inside a repeatable (self + descendants).
  const insideRepeatable = useSelector((state) =>
    isInsideRepeatable(state.designState, code),
  );

  const effectiveRules = React.useMemo(() => {
    const hidden = [];
    if (!showCarryForwardRule) hidden.push("carry_forward");
    if (!showRepetitionRule) hidden.push("repetition");
    if (selfRepeatable) hidden.push("relevance", "conditional_relevance", "disabled");
    if (insideRepeatable) hidden.push("skip_logic");
    if (hidden.length === 0) return rules || [];
    return (rules || []).map((group) => ({
      ...group,
      rules: (group.rules || []).filter((r) => !hidden.includes(r)),
    }));
  }, [rules, showCarryForwardRule, showRepetitionRule, selfRepeatable, insideRepeatable]);

  return (
    <div className={styles.panel}>
      {code !== "Survey" && <SetupHeader code={code} t={t} />}
      <SetupBody
        setupInfo={setupInfo}
        rules={effectiveRules}
        code={code}
        t={t}
      />
    </div>
  );
}

export default React.memo(SetupPanel);

// A label is TipTap markup; the header wants its text, entities decoded.
// DOMParser never runs what it parses, so this is safe for any label.
const plainText = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

const selectHeader = (code) => (state) => {
  const design = state.designState;
  const component = design[code] || {};
  const { lang, mainLang } = design.langInfo || {};
  const labelIn = (language) =>
    stripTags(component.content?.[language]?.label || "").trim()
      ? component.content[language].label
      : "";
  const groups = design.Survey?.children || [];
  const groupCode = isGroup(code)
    ? code
    : groups.find((group) =>
        design[group.code]?.children?.some((child) => child.code === code)
      )?.code;
  return {
    type: component.type,
    displayCode: design.index?.[code] || code,
    label: labelIn(lang) || labelIn(mainLang),
    groupCode,
  };
};

/** The selection: its code, its type and page, and its text; and ✕. */
const SetupHeader = React.memo(function SetupHeader({ code, t }) {
  const dispatch = useDispatch();
  const { type, displayCode, label: labelHtml, groupCode } = useSelector(
    selectHeader(code),
    shallowEqual
  );
  const label = React.useMemo(() => plainText(labelHtml), [labelHtml]);
  const groups = useSelector((state) => state.designState.Survey?.children);

  const question = isQuestion(code);
  const group = isGroup(code);
  const pageName = React.useMemo(() => {
    const list = groups || [];
    const index = list.findIndex((page) => page.code === groupCode);
    return index === -1 ? "" : pageLabels(list, t)[index];
  }, [groups, groupCode, t]);

  const subtitle = question
    ? [t(`component_${type}_title`), pageName].filter(Boolean).join(" · ")
    : group
      ? pageName
      : "";
  const untitled = !label && question;
  const title = label || (question ? t("untitled_question") : "");
  const closeLabel = question
    ? t("close_question_settings")
    : group
      ? t("close_page_settings")
      : t("close_settings");

  return (
    <div className={styles.header}>
      <div className={styles.headerLine}>
        <span className={styles.code}>{displayCode}</span>
        <span className={styles.subtitle} title={subtitle}>
          {subtitle}
        </span>
        <button
          type="button"
          className={styles.close}
          aria-label={closeLabel}
          title={closeLabel}
          onClick={() => dispatch(resetSetup())}
          data-preview-allow
        >
          <X size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {title && (
        <div className={cx(styles.title, untitled && styles.titleEmpty)}>
          {title}
        </div>
      )}
    </div>
  );
});

/** A rule's row, tinted for a moment when something pointed at it. */
function Row({ rule, flash, children }) {
  const ref = React.useRef(null);
  const flashing = flash === rule;

  React.useEffect(() => {
    if (flashing) {
      ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
  }, [flashing]);

  return (
    <div ref={ref} className={cx(styles.row, flashing && styles.rowFlash)}>
      {children}
    </div>
  );
}

/**
 * The general settings, the advanced button, and the advanced tabs. A selection with no general settings (the survey's page
 * order) opens straight onto its tabs; one whose rules have no tabs at all
 * (an answer, the logo) is a plain list.
 */
const SetupBody = React.memo(function SetupBody({ setupInfo, rules, code, t }) {
  const { i18n } = useTranslation();
  const isRtl = rtlLanguage.includes(i18n.language);
  const ids = React.useId();
  const barRef = React.useRef(null);
  const basicsRef = React.useRef(null);
  const advancedRef = React.useRef(null);
  // Where the button sat before it toggled, so the switch can slide it from
  // there; only the button sets it, so a selection never animates.
  const slideFrom = React.useRef(null);

  const tabs = React.useMemo(
    () => (rules || []).filter((tab) => (tab.rules || []).length > 0),
    [rules]
  );
  const hasTitles = tabs.some((tab) => !!tab.title);
  const flatRules = React.useMemo(
    () => tabs.flatMap((tab) => tab.rules || []),
    [tabs]
  );
  const basicRules = React.useMemo(
    () => BASIC_RULES.filter((rule) => flatRules.includes(rule)),
    [flatRules]
  );

  const view = useSetupView({ setupInfo, tabs, basicRules });

  // The switch itself is instant; this then slides the button from where it
  // was to where it now is, the advanced settings riding up beneath it or the
  // general settings fading in behind it as it comes back down. Transform and
  // opacity only, so nothing is laid out again frame by frame.
  React.useLayoutEffect(() => {
    const from = slideFrom.current;
    slideFrom.current = null;
    const bar = barRef.current;
    if (
      !from ||
      !bar ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const offset = from.top - bar.getBoundingClientRect().top;
    if (!offset) {
      return;
    }
    const timing = { duration: 320, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };
    const shifted = `translateY(${offset}px)`;
    bar.animate([{ transform: shifted }, { transform: "none" }], timing);
    if (from.opening) {
      advancedRef.current?.animate(
        [{ transform: shifted, opacity: 0 }, { transform: "none", opacity: 1 }],
        timing
      );
    } else {
      basicsRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    }
  }, [view.open]);

  if (!hasTitles) {
    return (
      <SetupVariant.Provider value="advanced">
        <div className={styles.flatRows}>
          {flatRules.map((rule) => (
            <Row key={rule} rule={rule} flash={view.flash}>
              <SetupComponent code={code} rule={rule} t={t} />
            </Row>
          ))}
        </div>
      </SetupVariant.Provider>
    );
  }

  const advancedOnly = basicRules.length === 0;
  const open = advancedOnly || view.open;
  const selectedTab = tabs.find((tab) => tab.key === view.tab) || tabs[0];
  const tabId = (key) => `${ids}tab-${key}`;
  const panelId = `${ids}panel`;
  const advancedId = `${ids}advanced`;

  const toggleAdvanced = () => {
    // Back to the top first, so the switch happens where the button is
    // rather than somewhere down a tab that is about to collapse.
    let scroller = barRef.current?.parentElement;
    while (scroller && getComputedStyle(scroller).overflowY !== "auto") {
      scroller = scroller.parentElement;
    }
    if (scroller) {
      scroller.scrollTop = 0;
    }
    slideFrom.current = {
      top: barRef.current.getBoundingClientRect().top,
      opening: !view.open,
    };
    view.setOpen(!view.open);
  };

  // Arrow keys move between tabs (mirrored right to left), Home and End jump.
  const onTabKeyDown = (event) => {
    const keys = tabs.map((tab) => tab.key);
    const index = keys.indexOf(selectedTab.key);
    const step = isRtl ? -1 : 1;
    let next = -1;
    if (event.key === "ArrowRight") next = index + step;
    else if (event.key === "ArrowLeft") next = index - step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = keys.length - 1;
    else return;
    event.preventDefault();
    const key = keys[(next + keys.length) % keys.length];
    view.setTab(key);
    document.getElementById(tabId(key))?.focus();
  };

  return (
    <>
      {!open && (
        <section
          ref={basicsRef}
          aria-label={t("general_settings")}
          className={styles.basics}
        >
          <SetupVariant.Provider value="basic">
            <div className={styles.basicRows}>
              {basicRules.map((rule) => (
                <Row key={rule} rule={rule} flash={view.flash}>
                  <SetupComponent code={code} rule={rule} t={t} isQuickOptions />
                </Row>
              ))}
            </div>
          </SetupVariant.Provider>
        </section>
      )}

      {!advancedOnly && (
        <div ref={barRef} className={styles.advancedBar}>
          <button
            type="button"
            className={cx(styles.advancedButton, open && styles.advancedButtonOpen)}
            aria-expanded={open}
            aria-controls={advancedId}
            onClick={toggleAdvanced}
            data-preview-allow
          >
            <Settings2 size={15} strokeWidth={2} aria-hidden="true" />
            <span className={styles.advancedLabel}>
              {open ? t("hide_advanced_settings") : t("show_advanced_settings")}
            </span>
            <ChevronDown
              size={11}
              strokeWidth={2}
              aria-hidden="true"
              className={styles.advancedChevron}
            />
          </button>
        </div>
      )}

      {open && (
        <div
          ref={advancedRef}
          id={advancedId}
          role="region"
          aria-label={t("advanced_settings")}
          className={cx(styles.advanced, advancedOnly && styles.advancedOnly)}
        >
          <div
            role="tablist"
            aria-label={t("advanced_settings")}
            className={styles.tabs}
            onKeyDown={onTabKeyDown}
          >
            {tabs.map((tab) => {
              const selected = tab.key === selectedTab.key;
              const name = t(tab.title);
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={tabId(tab.key)}
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  title={t("tab_settings", { name })}
                  className={cx(styles.tab, selected && styles.tabSelected)}
                  onClick={() => view.setTab(tab.key)}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId(selectedTab.key)}
            tabIndex={0}
            className={cx(
              styles.tabPanel,
              // The validation rules aren't rows of their own, so a rule the
              // canvas points at flashes the whole panel instead.
              (view.flash === selectedTab.key ||
                (selectedTab.key === "validation" &&
                  selectedTab.rules.includes(view.flash))) &&
                styles.panelFlash
            )}
          >
            {selectedTab.key === "validation" ? (
              <ValidationRulesPanel
                code={code}
                t={t}
                validationRules={selectedTab.rules}
              />
            ) : (
              <SetupVariant.Provider
                value={selectedTab.key === "logic" ? "logic" : "advanced"}
              >
                <div
                  className={cx(
                    styles.tabRows,
                    selectedTab.key === "logic" && styles.logicRows
                  )}
                >
                  {selectedTab.rules.map((rule) => (
                    <Row key={rule} rule={rule} flash={view.flash}>
                      <SetupComponent code={code} rule={rule} t={t} />
                    </Row>
                  ))}
                </div>
              </SetupVariant.Provider>
            )}
          </div>
        </div>
      )}
    </>
  );
});

const SetupComponent = React.memo(({ code, rule, t, isQuickOptions }) => {
  if (rule.startsWith("validation_")) {
    return (
      <ValidationSetupItem t={t} rule={rule} key={code + rule} code={code} isQuickOptions={isQuickOptions} />
    );
  }

  switch (rule) {
    case "order_instructions":
      return <OrderInstructions code={code} t={t} key={code + rule} />;
    case "conditional_relevance":
      return <ConditionalRelevance code={code} t={t} key={code + rule} />;
    case "changeCode":
      return <EntityCodeEditor code={code} />;
    case "logo_setup":
      return <LogoSetup t={t} key={code + rule} />;
    case "maxChars":
      return (
        <FieldSize
          label={"text_field_size"}
          rule={rule}
          lowerBound={1}
          t={t}
          upperBound={500}
          defaultValue={20}
          code={code}
          key={code + rule}
        />
      );
    case "minRows":
      return (
        <FieldSize
          label={"textarea_lines"}
          lowerBound={1}
          rule={rule}
          t={t}
          key={code + rule}
          upperBound={15}
          code={code}
          defaultValue={4}
        />
      );
    case "hideText":
      return (
        <ToggleValue
          key={code + rule}
          t={t}
          label={"hide_text"}
          rule={rule}
          code={code}
        />
      );
    case "showDescription":
      return (
        <ToggleValue
          key={code + rule}
          t={t}
          label={
            code.startsWith("G") ? "show_description_page" : "show_description"
          }
          rule={rule}
          code={code}
        />
      );
    case "hierarchicalDropdown":
      return (
        <ToggleValue
          key={code + rule}
          t={t}
          label={"hierarchical_dropdown"}
          rule={rule}
          code={code}
        />
      );
    case "convert_question_type":
      return <ConvertQuestionType key={code + rule} code={code} t={t} />;
    case "scq_default_value":
      return <ScqDefaultValue key={code + rule} code={code} />;
    case "showWordCount":
      return (
        <ToggleValue
          t={t}
          key={code + rule}
          label={"show_word_count"}
          rule={rule}
          code={code}
        />
      );
    case "hint":
      return <ShowHint t={t} key={code + rule} code={code} />;
    case "lower_bound_hint":
      return (
        <SetupTextInput
          title={"lower_bound_hint"}
          objectName="lower_bound_hint"
          key={code + rule}
          code={code}
          t={t}
        />
      );
    case "higher_bound_hint":
      return (
        <SetupTextInput
          title={"upper_bound_hint"}
          objectName="higher_bound_hint"
          key={code + rule}
          code={code}
          t={t}
        />
      );
    case "loop":
      return (
        <ToggleValue
          t={t}
          key={code + rule}
          rule={rule}
          code={code}
          label={"loop_video"}
        />
      );
    case "audio_only":
      return (
        <ToggleValue
          t={t}
          key={code + rule}
          rule={rule}
          code={code}
          label={"audio_only"}
        />
      );
    case "fullDayFormat":
      return (
        <ToggleValue
          t={t}
          key={code + rule}
          rule={rule}
          code={code}
          label={"fullday_format"}
        />
      );
    case "showNowButton":
      return (
        <ToggleValue
          t={t}
          key={code + rule}
          rule={rule}
          code={code}
          label={"show_now_button"}
        />
      );
    case "randomize_questions":
    case "randomize_options":
    case "randomize_groups":
    case "randomize_rows":
    case "randomize_columns":
      return <OrderSetup t={t} key={code + rule} rule={rule} code={code} />;
    case "prioritise_questions":
    case "prioritise_groups":
    case "prioritise_options":
    case "prioritise_rows":
    case "prioritise_columns":
      return <PrioritySetup t={t} key={code + rule} rule={rule} code={code} />;
    case "maxDate":
      return (
        <SelectDate
          lowerBound={1}
          code={code}
          key={code + rule}
          label={"max_date"}
          rule={rule}
          t={t}
        />
      );
    case "customCss":
      return (
        <CustomCSS
          key={code + rule}
          label={"min_date"}
          rule={rule}
          code={code}
          t={t}
        />
      );
    case "minDate":
      return (
        <SelectDate
          key={code + rule}
          label={"min_date"}
          rule={rule}
          code={code}
          t={t}
        />
      );
    case "minHeaderMobile":
    case "minHeaderDesktop":
    case "minRowLabelMobile":
    case "minRowLabelDesktop":
      let label = "min_header_mobile";
      switch (rule) {
        case "minHeaderMobile":
          label = "min_header_mobile";
          break;
        case "minHeaderDesktop":
          label = "min_header_desktop";
          break;
        case "minRowLabelMobile":
          label = "min_row_label_mobile";
          break;
        case "minRowLabelDesktop":
          label = "min_row_label_desktop";
          break;
      }
      const widthOptions = [60, 90, 120, 150, 180];
      const widthOptionLabels = ["60px", "90px", "120px", "150px", "180px"];
      return (
        <SelectValue
          values={widthOptions}
          labels={widthOptionLabels}
          key={code + rule}
          defaultValue={
            rule == "minHeaderMobile" || rule == "minRowLabelMobile" ? 60 : 90
          }
          label={label}
          rule={rule}
          code={code}
        />
      );
    case "dateFormat":
      const listDateFormat = [
        "DD.MM.YYYY",
        "MM.DD.YYYY",
        "YYYY.MM.DD",
        "DD/MM/YYYY",
        "MM/DD/YYYY",
        "YYYY/MM/DD",
      ];
      return (
        <SelectValue
          values={listDateFormat}
          key={code + rule}
          defaultValue="DD.MM.YYYY"
          label="date_format"
          rule={rule}
          code={code}
        />
      );
    case "imageWidth":
      const imageWidthValues = [
        "unspecified",
        "30%",
        "40%",
        "50%",
        "60%",
        "70%",
        "80%",
        "90%",
        "100%",
      ];
      const imageWidthLabels = [
        t("unspecified"),
        "30%",
        "40%",
        "50%",
        "60%",
        "70%",
        "80%",
        "90%",
        "100%",
      ];
      return (
        <SelectValue
          values={imageWidthValues}
          labels={imageWidthLabels}
          key={code + rule}
          defaultValue="unspecified"
          label="image_width"
          rule={rule}
          code={code}
        />
      );
    case "decimal_separator":
      const decimalValues = ["", ",", "."];
      const labels = [t("no_decimals_allowed"), ",", "."];
      return (
        <SelectValue
          values={decimalValues}
          labels={labels}
          key={code + rule}
          defaultValue=""
          label="decimal_separator"
          rule={rule}
          code={code}
        />
      );
    case "imageAspectRatio":
      const aspectLabels = ["1:1", "16:9", "4:3", "3:2", "9:16", "3:4", "2:3"];
      const aspectValues = [1, 1.7778, 1.3333, 1.5, 0.562, 0.75, 0.6667];
      return (
        <SelectValue
          values={aspectValues}
          labels={aspectLabels}
          key={code + rule}
          defaultValue={1}
          label="image_aspect_ratio"
          rule={rule}
          code={code}
        />
      );
    case "iconSize":
      const iconSizes = ["50", "100", "150", "200"];
      return (
        <SelectValue
          values={iconSizes}
          key={code + rule}
          defaultValue="150"
          label="image_icon_size"
          rule={rule}
          code={code}
        />
      );
    case "columns":
      const columnsOptions = ["1", "2", "3", "4", "6"];
      return (
        <SelectValue
          values={columnsOptions}
          key={code + rule}
          defaultValue="2"
          label="columns_number"
          rule={rule}
          code={code}
        />
      );
    case "imageHeight":
      return (
        <FieldSize
          label="image_height"
          lowerBound={50}
          upperBound={500}
          t={t}
          code={code}
          defaultValue={250}
          rule={rule}
          key={code + rule}
        />
      );
    case "spacing":
      return (
        <FieldSize
          label="spacing"
          lowerBound={2}
          upperBound={32}
          code={code}
          t={t}
          defaultValue={8}
          rule={rule}
          key={code + rule}
        />
      );
    case "move_group":
      return <MoveGroup key={code + rule} code={code} t={t} />;
    case "move_question":
      return <MoveQuestion key={code + rule} code={code} t={t} />;
    case "disabled":
      return <DisabledToggle t={t} key={code + rule} code={code} />;
    case "skip_logic":
      return <SkipLogic t={t} key={code + rule} code={code} />;
    case "relevance":
      return <Relevance t={t} key={code + rule} code={code} />;
    case "carry_forward":
      return <CarryForward t={t} key={code + rule} code={code} />;
    case "repetition":
      return <RepeatSettings t={t} key={code + rule} code={code} />;
    case "prefill":
      return (
        <ToggleValue
          key={code + rule}
          t={t}
          label={"prefill"}
          rule={rule}
          code={code}
        />
      );
    default:
      return "";
  }
});

