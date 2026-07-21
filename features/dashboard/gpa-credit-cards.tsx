import { HStack, VStack } from "@/components/ui/stack";
import type { GpaSummary } from "@/features/audit/audit-calculations";
import type { Status } from "@/domain/course";
import { Check, X } from "@phosphor-icons/react";

type FramedStatusIconState = "completed" | "not-started" | "in-progress";

const STATUS_ICON_STATE: Record<Status, FramedStatusIconState> = {
  Completed: "completed",
  "In Progress": "in-progress",
  "Not Started": "not-started",
};

type GPATotalsProps = {
  degreeName: string;
  required: number;
  counted: number;
  summary: GpaSummary | null;
};

const InfoIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-5 w-5 shrink-0 text-dap-dark"
    fill="none"
  >
    <path
      d="M12 2.25C10.0716 2.25 8.18657 2.82183 6.58319 3.89317C4.97982 4.96451 3.73013 6.48726 2.99218 8.26884C2.25422 10.0504 2.06114 12.0108 2.43735 13.9021C2.81355 15.7934 3.74215 17.5307 5.10571 18.8943C6.46928 20.2579 8.20656 21.1865 10.0979 21.5627C11.9892 21.9389 13.9496 21.7458 15.7312 21.0078C17.5127 20.2699 19.0355 19.0202 20.1068 17.4168C21.1782 15.8134 21.75 13.9284 21.75 12C21.7473 9.41498 20.7192 6.93661 18.8913 5.10872C17.0634 3.28084 14.585 2.25273 12 2.25ZM12 20.25C10.3683 20.25 8.77326 19.7661 7.41655 18.8596C6.05984 17.9531 5.00242 16.6646 4.378 15.1571C3.75358 13.6496 3.5902 11.9908 3.90853 10.3905C4.22685 8.79016 5.01259 7.32015 6.16637 6.16637C7.32016 5.01259 8.79017 4.22685 10.3905 3.90852C11.9909 3.59019 13.6497 3.75357 15.1571 4.37799C16.6646 5.00242 17.9531 6.05984 18.8596 7.41655C19.7661 8.77325 20.25 10.3683 20.25 12C20.2475 14.1873 19.3775 16.2843 17.8309 17.8309C16.2843 19.3775 14.1873 20.2475 12 20.25ZM13.5 16.5C13.5 16.6989 13.421 16.8897 13.2803 17.0303C13.1397 17.171 12.9489 17.25 12.75 17.25C12.3522 17.25 11.9706 17.092 11.6893 16.8107C11.408 16.5294 11.25 16.1478 11.25 15.75V12C11.0511 12 10.8603 11.921 10.7197 11.7803C10.579 11.6397 10.5 11.4489 10.5 11.25C10.5 11.0511 10.579 10.8603 10.7197 10.7197C10.8603 10.579 11.0511 10.5 11.25 10.5C11.6478 10.5 12.0294 10.658 12.3107 10.9393C12.592 11.2206 12.75 11.6022 12.75 12V15.75C12.9489 15.75 13.1397 15.829 13.2803 15.9697C13.421 16.1103 13.5 16.3011 13.5 16.5ZM10.5 7.875C10.5 7.6525 10.566 7.43499 10.6896 7.24998C10.8132 7.06498 10.9889 6.92078 11.1945 6.83564C11.4001 6.75049 11.6263 6.72821 11.8445 6.77162C12.0627 6.81502 12.2632 6.92217 12.4205 7.0795C12.5778 7.23684 12.685 7.43729 12.7284 7.65552C12.7718 7.87375 12.7495 8.09995 12.6644 8.30552C12.5792 8.51109 12.435 8.68679 12.25 8.8104C12.065 8.93402 11.8475 9 11.625 9C11.3266 9 11.0405 8.88147 10.8295 8.6705C10.6185 8.45952 10.5 8.17337 10.5 7.875Z"
      fill="currentColor"
    />
  </svg>
);

const FramedStatusIcon = ({ state }: { state: FramedStatusIconState }) => {
  if (state === "completed") {
    return (
      <div className="bg-dap-plan-green-light mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded">
        <Check className="h-4 w-4 text-white" weight="bold" />
      </div>
    );
  }
  return (
    <div className="bg-dap-status-slate mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded">
      <X className="h-4 w-4 text-white" weight="bold" />
    </div>
  );
};

export const GPATotalsCard = ({
  degreeName,
  required,
  counted,
  summary,
}: GPATotalsProps) => {
  return (
    <div className="w-full p-6 rounded-lg border border-gray-200 bg-background">
      <HStack x="between" y="middle" fill>
        <h3 className="text-xl font-bold text-text">GPA Totals</h3>
        <InfoIcon />
      </HStack>

      <p className="mt-1 text-sm font-semibold text-[#10B981]">{degreeName}</p>

      <HStack gap={6} className="mt-4">
        <VStack gap={1.5}>
          <span className="text-sm font-medium text-muted">Required</span>
          <div className="px-3.5 py-1 bg-background border border-gray-200 rounded-full">
            <span className="text-sm font-semibold text-text">
              {required.toFixed(4)}
            </span>
          </div>
        </VStack>
        <VStack gap={1.5}>
          <span className="text-sm font-medium text-muted">Counted</span>
          <div className="px-3.5 py-1 bg-[#579D42] rounded-full">
            <span className="text-sm font-semibold text-white">
              {counted.toFixed(4)}
            </span>
          </div>
        </VStack>
      </HStack>

      {summary ? (
        <p className="mt-4 text-sm text-text leading-normal">
          {summary.hoursUsed} hours for a total of {summary.points} points were
          used to calculate the GPA.
        </p>
      ) : null}
    </div>
  );
};

export type CreditRequirement = {
  status: Status;
  text: string;
};

type CreditHourTotalsProps = {
  degreeName?: string;
  requirements: CreditRequirement[];
};

export const CreditHourTotalsCard = ({
  degreeName,
  requirements,
}: CreditHourTotalsProps) => {
  return (
    <div className="w-full p-6 rounded-lg border border-gray-200 bg-background">
      <h3 className="text-xl font-bold text-text">Credit Hour Totals</h3>
      {degreeName && (
        <p className="mt-1 text-sm font-semibold text-[#10B981]">
          {degreeName}
        </p>
      )}

      <VStack gap={3.5} className="mt-4">
        {requirements.map((req) => (
          <HStack key={req.text} gap={3} y="top">
            <FramedStatusIcon state={STATUS_ICON_STATE[req.status]} />
            <span className="mt-0.5 text-sm font-medium leading-tight text-text">
              {req.text}
            </span>
          </HStack>
        ))}
      </VStack>
    </div>
  );
};
