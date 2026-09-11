// Native HTML5 drag and drop for reordering items inside a group (a list of
// categories, or the links of one category). Items only drop within their
// own group; `move` receives the group and the from/to indexes.

export interface DragSlot<G> {
  group: G;
  index: number;
}

function same<G>(a: DragSlot<G> | null, group: G, index: number): boolean {
  return a !== null && a.group === group && a.index === index;
}

export function useDragReorder<G>(move: (group: G, from: number, to: number) => void) {
  const dragging = shallowRef<DragSlot<G> | null>(null);
  const target = shallowRef<DragSlot<G> | null>(null);

  function onStart(group: G, index: number, event: DragEvent): void {
    dragging.value = { group, index };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      // Firefox needs data to start a drag.
      event.dataTransfer.setData("text/plain", "");
    }
  }

  function onOver(group: G, index: number, event: DragEvent): void {
    if (!dragging.value || dragging.value.group !== group) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    if (!same(target.value, group, index)) target.value = { group, index };
  }

  function onDrop(group: G, index: number): void {
    const from = dragging.value;
    onEnd();
    if (!from || from.group !== group || from.index === index) return;
    move(group, from.index, index);
  }

  function onEnd(): void {
    dragging.value = null;
    target.value = null;
  }

  /** True for the item currently hovered by a compatible drag (not itself). */
  function isTarget(group: G, index: number): boolean {
    return same(target.value, group, index) && !same(dragging.value, group, index);
  }
  function isDragging(group: G, index: number): boolean {
    return same(dragging.value, group, index);
  }

  return { onStart, onOver, onDrop, onEnd, isTarget, isDragging };
}
