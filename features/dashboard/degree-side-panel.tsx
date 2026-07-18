import { VStack } from "@/components/ui/stack";
import type { ReactNode } from "react";
import DegreeCompletionDonut from "./degree-completion-donut";

interface DegreeSidePanelProps {
  searchPanel: ReactNode;
  children?: ReactNode;
}

export default function DegreeSidePanel({
  searchPanel,
  children,
}: DegreeSidePanelProps) {
  return (
    <VStack
      className="w-sm shrink-0 self-start bg-background"
      y="stretch"
      x="center"
    >
      <DegreeCompletionDonut size={300} />
      <div className="w-sm mt-10 p-3 rounded-lg border border-gray-200 bg-background">
        {searchPanel}
      </div>
      {children}
    </VStack>
  );
}
