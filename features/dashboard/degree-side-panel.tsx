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
      className="w-sm shrink-0 self-start bg-background sticky top-0"
      y="stretch"
      x="center"
    >
      <DegreeCompletionDonut size={300} />
      <div className="w-sm mt-10 p-6 rounded-lg border border-gray-200 bg-background transition-[border-color,background-color,box-shadow] duration-700 has-[[data-highlighted]]:border-dap-orange has-[[data-highlighted]]:ring-1 has-[[data-highlighted]]:ring-dap-orange has-[[data-highlighted]]:bg-dap-orange/5">
        {searchPanel}
      </div>
      {children}
    </VStack>
  );
}
