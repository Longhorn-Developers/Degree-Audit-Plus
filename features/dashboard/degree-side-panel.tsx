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
      <div className="mt-10 w-full rounded-lg bg-dap-primary p-3 shadow-[0_12px_28px_rgba(51,63,72,0.24)]">
        <div className="rounded-md bg-background p-6 ring-1 ring-black/10">
          {searchPanel}
        </div>
      </div>
      {children}
    </VStack>
  );
}
