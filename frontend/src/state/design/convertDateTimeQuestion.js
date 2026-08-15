export function convertDateTimeQuestion(currentQuestion, currentType, newType) {
  const hadFullDayFormat = currentType === "time" || currentType === "date_time";
  const hasDateFields = currentType === "date" || currentType === "date_time";

  const needsFullDayFormat = newType === "time" || newType === "date_time";
  const needsDateFields = newType === "date" || newType === "date_time";

  if (hadFullDayFormat && !needsFullDayFormat) delete currentQuestion.fullDayFormat;
  if (!hadFullDayFormat && needsFullDayFormat) currentQuestion.fullDayFormat = false;

  if (hasDateFields && !needsDateFields) {
    delete currentQuestion.dateFormat;
    delete currentQuestion.maxDate;
    delete currentQuestion.minDate;
  }
  if (!hasDateFields && needsDateFields) {
    currentQuestion.dateFormat = "YYYY/MM/DD";
    currentQuestion.maxDate = "";
    currentQuestion.minDate = "";
  }
}
