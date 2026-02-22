import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DraggableProps {
  id: string;
  children: React.ReactNode;
}

const Draggable = ({ id, children }: DraggableProps) => {
  const { isDragging, attributes, listeners, setNodeRef, transform } =
    useDraggable({ id });

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
      }}
      className={cn(isDragging ? "opacity-50" : "opacity-100")}
    >
      {children}
    </div>
  );
};

export default Draggable;
