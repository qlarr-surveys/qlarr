import TextField from "@mui/material/TextField";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { valueChange } from "~/state/runState";
import { Box } from "@mui/material";
import { setDirty } from "~/state/templateState";
import Content from "~/components/run/Content";
import Validation from "~/components/run/Validation";
import styles from "./MultipleText.module.css";

function MultipleText(props) {
  return (
    <Box className={styles.container}>
      {props.component.answers.map((option) => {
        return <MultipleTextItem key={option.qualifiedCode} item={option} />;
      })}
    </Box>
  );
}

function MultipleTextItem({ item }) {
  const key = item.qualifiedCode;
  const theme = useTheme();
  const state = useSelector((state) => {
    let answerState = state.runState.values[key];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[key];
    let validity = answerState?.validity;
    let invalid = (show_errors || isDirty) && validity === false;
    return {
      value: answerState?.value || "",
      invalid: invalid,
      relevance: answerState?.relevance,
    };
  }, shallowEqual);
  const dispatch = useDispatch();
  const handleChange = (event) => {
    dispatch(
      valueChange({
        componentCode: event.target.name,
        value: event.target.value,
      }),
    );
  };
  const lostFocus = (event) => {
    const trimmed = event.target.value.trim();
    if (event.target.value !== trimmed) {
      dispatch(
        valueChange({
          componentCode: event.target.name,
          value: trimmed,
        }),
      );
    }
    dispatch(setDirty(event.target.name));
  };
  // a field can be hidden by relevance (e.g. prioritisation / conditional relevance)
  if (state.relevance === false) {
    return null;
  }
  return (
    <Box
      data-code={item.code}
      className={styles.itemRow}
    >
      <div
        className={styles.labelColumn}
        style={{ '--qlarr-text-size': `${theme.textStyles.text.size}px` }}
      >
        <Content
          elementCode={item.code}
          name="label"
          content={item.content?.label}
        />
        {state.invalid && <Validation component={item} />}
      </div>

      <TextField
        variant="outlined"
        size="small"
        name={key}
        value={state.value}
        error={state.invalid}
        onBlur={lostFocus}
        fullWidth
        onChange={handleChange}
        required={item.validation?.required}
        inputProps={{ maxLength: item.maxChars || undefined }}
        className={styles.textField}
      />
    </Box>
  );
}

export default MultipleText;
