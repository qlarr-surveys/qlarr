import FieldSize from "~/components/design/setup/FieldSize";
import ShowHint, { SetupTextInput } from "~/components/design/setup/ShowHint";
import ValidationSetupItem from "~/components/design/setup/validation/ValidationSetupItem";
import CustomValidationRules from "../validation/CustomValidationRules";
import OrderInstructions from "../advanced/OrderInstructions";
import ConditionalRelevance from "../advanced/ConditionalRelevance";
import React from "react";
import ToggleValue from "../ToggleValue";
import SelectValue from "../SelectValue";
import SelectDate from "../SelectDate";
import Relevance from "../logic/Relevance";
import SkipLogic from "../SkipLogic";
import styles from "./SetupPanel.module.css";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { resetSetup, clearHighlighted, setShowAdvanced } from "~/state/design/designState";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import Theming from "../Theming";
import { ManageLanguages } from "~/pages/manage/ManageTranslations";
import { useTheme } from "@emotion/react";
import { questionIconByType } from "~/components/Questions/utils";
import OrderSetup from "../orderPriority/OrderSetup";
import PrioritySetup from "../orderPriority/PrioritySetup";
import ScqDefaultValue from "../ScqDefaultValue";
import DisabledToggle from "../Disabled";
import MoveGroup from "../MoveGroup";
import EntityCodeEditor from "../EntityCodeEditor";
import CustomCSS from "../CustomCss";
import ConvertQuestionType from "../ConvertQuestionType";
import LogoSetup from "../LogoSetup";

function SetupPanel({ t }) {
  const dispatch = useDispatch();

  const theme = useTheme();

  const selectSetupInfo = (state) => state.designState.setup || {};
  const selectSetupData = createSelector([selectSetupInfo], (setupInfo) => ({
    code: setupInfo.code,
    highlighted: setupInfo.highlighted,
    rules: setupInfo.rules || [],
    ...setupInfo,
  }));

  const { code, highlighted, rules } = useSelector(selectSetupData);

  const type = useSelector((state) => {
    return state.designState[code].type;
  });

  const order = useSelector((state) => {
    return state.designState.index[code];
  });

  return (
    <div
      className={styles.rightContent}
      style={{
        left: theme.direction == "rtl" ? "0px" : "",
      }}
    >
      {code !== "Survey" && (
        <div className={styles.titleContainer}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="h2">
              {t("setup_for")}
            </Typography>
            {questionIconByType(`${type}`, undefined)}
            <Typography variant="h6" component="h2">
              {order}
            </Typography>
          </Box>

          <IconButton
            onClick={() => {
              dispatch(resetSetup());
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>
      )}

      <Divider />
      <SetupSection
        rules={rules || []}
        code={code}
        t={t}
        highlighted={highlighted}
        theme={theme}
      />
    </div>
  );
}

export default React.memo(SetupPanel);

const SetupComponent = React.memo(({ code, rule, t, isQuickOptions }) => {
  if (rule.startsWith("validation_")) {
    return (
      <ValidationSetupItem t={t} rule={rule} key={code + rule} code={code} isQuickOptions={isQuickOptions} />
    );
  }

  switch (rule) {
    case "custom_validation_rules":
      return <CustomValidationRules code={code} t={t} key={code + rule} />;
    case "order_instructions":
      return <OrderInstructions code={code} t={t} key={code + rule} />;
    case "conditional_relevance":
      return <ConditionalRelevance code={code} t={t} key={code + rule} />;
    case "changeCode":
      return <EntityCodeEditor code={code} />;
    case "theme":
      return <Theming t={t} key={code + rule} />;
    case "logo_setup":
      return <LogoSetup t={t} key={code + rule} />;
    case "language":
      return <ManageLanguages t={t} key={code + rule} />;
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
          defaultValue="1:1"
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
          defaultValue="1:1"
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
          label={t("image_height")}
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
    case "disabled":
      return <DisabledToggle t={t} key={code + rule} code={code} />;
    case "skip_logic":
      return <SkipLogic t={t} key={code + rule} code={code} />;
    case "relevance":
      return <Relevance t={t} key={code + rule} code={code} />;
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

const SetupSection = React.memo(({ highlighted, rules, code, t, theme }) => {
  const dispatch = useDispatch();
  const [highlightedEl, setHighlightedEl] = React.useState(highlighted);
  const advancedByCode = useSelector((state) => state.designState.advancedByCode ?? {});
  const showAdvanced = advancedByCode[code] ?? false;

  const handleShowAdvanced = React.useCallback(
    (value) => {
      dispatch(setShowAdvanced({ code, value }));
    },
    [code, dispatch]
  );

  const targetTabIndex = React.useMemo(() => {
    if (!rules?.length) return 0;

    const byKey = rules.findIndex((r) => r.key === highlighted);
    if (byKey !== -1) return byKey;

    const byChild = rules.findIndex((r) => r.rules?.includes(highlighted));
    if (byChild !== -1) return byChild;

    return 0;
  }, [rules, highlighted]);

  const [selectedTab, setSelectedTab] = React.useState(() => targetTabIndex);

  React.useEffect(() => {
    if (highlighted) {
      const isBasicMode = !showAdvanced;
      const visibleInBasic =
        normalRules.includes(highlighted) ||
        rules?.some(
          (tab) => tab.key === highlighted && tab.rules?.some((r) => normalRules.includes(r))
        );
      if (!(isBasicMode && visibleInBasic)) {
        handleShowAdvanced(true);
      }
      setSelectedTab(targetTabIndex);
    }
  }, [targetTabIndex]);

  const handleTabChange = (_, newValue) => setSelectedTab(newValue);

  const hasTitles = rules?.some((rule) => !!rule.title);

  const normalRules = React.useMemo(() => {
    const flat = rules?.flatMap((r) => r.rules || []) || [];
    return [
      "move_group",
      "disabled",
      "showDescription",
      "validation_required",
      "hint",
    ].filter((r) => flat.includes(r));
  }, [rules]);

  React.useEffect(() => {
    if (!highlighted) {
      setHighlightedEl(null);
      return;
    }

    const isBasicMode = !showAdvanced;
    if (isBasicMode) {
      const tab = rules?.find((t) => t.key === highlighted);
      const basicRule = tab
        ? tab.rules?.find((r) => normalRules.includes(r))
        : highlighted;
      setHighlightedEl(basicRule ?? highlighted);
    } else {
      setHighlightedEl(highlighted);
    }

    const timer = setTimeout(() => {
      setHighlightedEl(null);
      dispatch(clearHighlighted());
    }, 2000);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const rowSx = (el) => ({
    borderRadius: "5px",
    backgroundColor:
      el === highlightedEl ? theme?.palette?.grey[300] : "inherit",
    transition: "background-color 400ms ease",
  });

  if (!hasTitles) {
    return (
      <Box>
        {rules?.flatMap((rule) =>
          rule.rules?.map((el) => (
            <div className={styles.setupContainer} key={el}>
              <SetupComponent key={el} code={code} rule={el} t={t} />
            </div>
          )),
        )}
      </Box>
    );
  }

  return (
    <>
      {!showAdvanced && (
        <Box>
          {normalRules.map((rule) => (
            <div className={styles.setupContainer} key={rule}>
              <Box sx={rowSx(rule)}>
                <SetupComponent code={code} rule={rule} t={t} isQuickOptions />
              </Box>
            </div>
          ))}
        </Box>
      )}

      {!showAdvanced && (
        <Box sx={{ display: "flex", justifyContent: "center", marginTop: "2em" }}>
          <Button
            variant="contained"
            size="medium"
            endIcon={<ArrowForwardIcon />}
            onClick={() => handleShowAdvanced(true)}
          >
            {t("show_advanced_settings")}
          </Button>
        </Box>
      )}

      {showAdvanced && (
        <>
          <Divider />
          <Tabs
            className={styles.tabContainer}
            value={selectedTab}
            onChange={handleTabChange}
            variant="standard"
            TabIndicatorProps={{ sx: { display: "none" } }}
            sx={{
              "& .MuiTabs-flexContainer": {
                flexWrap: "wrap",
              },
            }}
          >
            {rules.map((rule) => (
              <Tab
                className={styles.tabStyle}
                sx={{
                  px: 1.5,
                  borderBottom: "2px solid transparent",
                  "&.Mui-selected": {
                    borderBottom: "2px solid #000",
                  },
                }}
                key={rule.key}
                label={t(rule.title)}
              />
            ))}
          </Tabs>
          <Divider />
          <Box
            sx={{
              backgroundColor:
                rules[selectedTab]?.key === highlighted
                  ? "#fff"
                  : "background.paper",
            }}
          >
            {rules[selectedTab]?.rules?.map((el) => (
              <div className={styles.setupContainer} key={el}>
                <Box sx={rowSx(el)}>
                  <SetupComponent key={el} code={code} rule={el} t={t} />
                </Box>
              </div>
            ))}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", marginTop: "2em" }}>
            <Button
              variant="contained"
              size="medium"
              startIcon={<ArrowBackIcon />}
              onClick={() => handleShowAdvanced(false)}
            >
              {t("hide_advanced_settings")}
            </Button>
          </Box>
        </>
      )}
    </>
  );
});
