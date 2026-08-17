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
