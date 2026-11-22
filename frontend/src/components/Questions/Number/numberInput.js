export const SAFE_NUMBER_MAX_CHARS = 15;

export function parseNumberInput(oldValue, input, separator) {
  if (input === "") {
    return undefined;
  }
  const pattern =
    separator == "."
      ? /^[0-9]+\.?[0-9]*$/
      : separator == ","
        ? /^[0-9]+,?[0-9]*$/
        : /^[0-9]*$/;
  if (!pattern.test(input)) {
    return oldValue;
  }
  const parsed = +(separator == "," ? input.replace(",", ".") : input);
  return isNaN(parsed) ? oldValue : parsed;
}

export function formatNumber(value, separator) {
  if (value == null) return "";
  const str = value.toString();
  return separator == "," ? str.replace(".", ",") : str;
}
