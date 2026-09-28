// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts
export const createGroup = (groupType, gId) => {
  let code = `G${gId}`;
  let state = {
    groupType,
  };
  let newGroup = {
    code,
    qualifiedCode: code,
    type: groupType.toLowerCase(),
    groupType,
  };
  return { newGroup, state };
};
