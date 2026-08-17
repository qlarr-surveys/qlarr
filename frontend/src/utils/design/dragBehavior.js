
export const onDragEnd = (result, onDragListener) => {
  if (!result.destination) {
    return;
  }
 else if (
    result.type == "groups" &&
    result.source.droppableId == "new-groups"
  ) {
    const payload = {
      type: "new_group",
      groupType: result.draggableId,
      toIndex: result.destination.index,
    };
    onDragListener(payload);
    return;
  } else if (result.type.startsWith("option")) {
    const payload = {
      type: "reorder_answers",
      id: result.draggableId,
      fromIndex: result.source.index,
      toIndex: result.destination.index,
    };
    onDragListener(payload);
    return;
  } else if (result.type.startsWith("row") || result.type.startsWith("col")) {
    const payload = {
      type: "reorder_answers_by_type",
      id: result.draggableId,
      fromIndex: result.source.index,
      toIndex: result.destination.index,
    };
    onDragListener(payload);
    return;
  }
};