import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDragAndDrop } from "./dnd-provider";

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
}

const DroppableArea = ({ id, children }: DroppableAreaProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });
  const { isDragging } = useDragAndDrop();

  useEffect(() => {
    console.log("isOver", isOver);
  }, [isOver]);

  return (
    <div ref={setNodeRef} className={cn(isOver ? "opacity-35" : "opacity-100")}>
      {children}
    </div>
  );
};

export default DroppableArea;
