import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
}

const DroppableArea = ({ id, children }: DroppableAreaProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={cn(isOver ? "opacity-35" : "opacity-100")}>
      {children}
    </div>
  );
};

export default DroppableArea;
