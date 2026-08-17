import {
  INSTRUCTION_SYNTAX_PATTERN
} from "~/constants/instruction";

const HTML_ENTITY_MAP = {
  "&gt;": ">",
  "&lt;": "<",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
};

const HTML_ENTITY_PATTERN = /&(?:gt|lt|amp|quot|#39);/g;

class QuestionDisplayTransformer {

  static decodeInstructionEntities(html) {
    if (typeof html !== "string") return html;
    if (!html) return html;
    if (!html.includes("{{")) return html;

    let result = html;

    result = result.replace(INSTRUCTION_SYNTAX_PATTERN, (match) => {
      return match.replace(
        HTML_ENTITY_PATTERN,
        (entity) => HTML_ENTITY_MAP[entity],
      );
    });

    result = result.replace(/<span class="mention"[^>]*>(.*?)<\/span>/g, "$1");

    return result;
  }
}

export default QuestionDisplayTransformer;
