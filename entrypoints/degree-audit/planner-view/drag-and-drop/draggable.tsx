import { cn } from "@/lib/utils";
import { UniqueIdentifier, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DraggableProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
}

const Draggable = ({ id, children }: DraggableProps) => {
  const { isDragging, attributes, listeners, setNodeRef, transform } =
    useDraggable({
      id,
      data: {
        random: "foo",
      },
    });

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      className={cn(isDragging ? "opacity-50" : "opacity-100")}
    >
      {children}
    </div>
  );
};

export default Draggable;
