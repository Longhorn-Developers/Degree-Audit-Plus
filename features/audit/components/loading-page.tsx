import { VStack } from "@/components/ui/stack";
import { SpinnerIcon } from "@phosphor-icons/react";

const LoadingPage = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-background">
      <VStack centered>
        <SpinnerIcon className="w-30 h-30 animate-spin" />
        <p className="text-2xl font-bold">One second please...</p>
      </VStack>
    </div>
  );
};

export default LoadingPage;
