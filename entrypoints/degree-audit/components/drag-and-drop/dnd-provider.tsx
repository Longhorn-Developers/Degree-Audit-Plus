import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { DndContext, pointerWithin } from "@dnd-kit/core";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

/** Called when an item is dropped on a list (or when requestMove is used). Update your lists here. */
export type OnMoveHandler = (
  draggableId: string,
  droppableId: string,
) => void;

interface DragAndDropContextType {
  /** True while the user is dragging (useful for list styling). */
  isDragging: boolean;
  /** Id of the item currently being dragged, or null. */
  activeId: string | null;
  /** Notify the provider that an item moved to a new list. Same as a drop. */
  requestMove: (draggableId: string, droppableId: string) => void;
  /** Optional: set the handler from a deep child that owns list state. */
  setMoveHandler: (handler: OnMoveHandler | null) => void;
}

const DragAndDropContext = createContext<DragAndDropContextType | null>(null);

export interface DragAndDropProviderProps {
  children: React.ReactNode;
  /** Called when an item is dropped on a list. Use this to move the item in your state. */
  onMove?: OnMoveHandler;
}

const DragAndDropProvider = ({
  children,
  onMove,
}: DragAndDropProviderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const moveHandlerRef = useRef<OnMoveHandler | null>(null);

  const currentHandler = useCallback((): OnMoveHandler | null => {
    return moveHandlerRef.current ?? onMove ?? null;
  }, [onMove]);

  const setMoveHandler = useCallback((handler: OnMoveHandler | null) => {
    moveHandlerRef.current = handler;
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true);
    setActiveId(typeof event.active.id === "string" ? event.active.id : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setIsDragging(false);
      setActiveId(null);
      if (over && typeof active.id === "string") {
        currentHandler()?.(active.id, String(over.id));
      }
    },
    [currentHandler],
  );

  const requestMove = useCallback(
    (draggableId: string, droppableId: string) => {
      currentHandler()?.(draggableId, droppableId);
    },
    [currentHandler],
  );

  return (
    <DragAndDropContext.Provider
      value={{
        isDragging,
        activeId,
        requestMove,
        setMoveHandler,
      }}
    >
      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DndContext>
    </DragAndDropContext.Provider>
  );
};

export const useDragAndDrop = () => {
  const context = useContext(DragAndDropContext);
  if (!context) {
    throw new Error("useDragAndDrop must be used within a DragAndDropProvider");
  }
  return context;
};

export default DragAndDropProvider;
