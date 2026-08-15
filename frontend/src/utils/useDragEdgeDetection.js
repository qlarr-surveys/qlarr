import { useEffect, useState } from "react";
import { useDragLayer } from "react-dnd";

function useDragNearViewportEdge(virtuosoWrapperRef) {
  const [isNearTop, setIsNearTop] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const threshold = 50;

  const updateViewportEdgeProximity = (currentOffset, panelWidth) => {
    if (!currentOffset || !virtuosoWrapperRef.current) return;

    const wrapperBounds = virtuosoWrapperRef.current.getBoundingClientRect();
    const adjustedLeft = wrapperBounds.left + panelWidth;
    const adjustedRight = wrapperBounds.right + panelWidth;

    const isInVirtuoso =
      currentOffset.x >= adjustedLeft &&
      currentOffset.x <= adjustedRight &&
      currentOffset.y >= wrapperBounds.top &&
      currentOffset.y <= wrapperBounds.bottom;

    if (!isInVirtuoso) {
      setIsNearTop(false);
      setIsNearBottom(false);
      return;
    }

    const distanceFromTop = currentOffset.y - wrapperBounds.top;
    const distanceFromBottom = wrapperBounds.bottom - currentOffset.y;

    setIsNearTop(distanceFromTop <= threshold);
    setIsNearBottom(distanceFromBottom <= threshold);
  };

  const { isDragging, currentOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getClientOffset(),
  }));

  useEffect(() => {
    const screenWidth = window.innerWidth;

    let panelWidth;
    if (screenWidth >= 1200) {
      panelWidth = 450;
    } else if (screenWidth >= 768) {
      panelWidth = 400;
    } else {
      panelWidth = 400;
    }

    if (isDragging) {
      updateViewportEdgeProximity(currentOffset, panelWidth);
    } else {
      setIsNearTop(false);
      setIsNearBottom(false);
    }
  }, [isDragging, currentOffset]);

  return { isNearTop, isNearBottom };
}

export default useDragNearViewportEdge;
