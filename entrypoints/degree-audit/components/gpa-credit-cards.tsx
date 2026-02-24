import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";

type GPATotalsProps = {
  required: number;
  counted: number;
  hoursUsed: number;
  points: number;
};

export const GPATotalsCard = ({
  required = 2.0,
  counted = 4.0,
  hoursUsed = 80,
  points = 320,
}: GPATotalsProps) => {
  return (
    <div className="p-5 rounded-lg border border-gray-200 bg-white shadow-md">
      <HStack x="between" y="top" fill>
        <h3 className="text-xl font-bold text-gray-900">GPA Totals</h3>
        <img src="/Info.svg" alt="Info" className="w-6 h-6 cursor-pointer" />
      </HStack>

      <HStack gap={6} className="mt-4">
        <VStack gap={1}>
          <span className="text-sm text-gray-500">Required</span>
          <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
            <span className="text-lg font-semibold">{required.toFixed(4)}</span>
          </div>
        </VStack>
        <VStack gap={1}>
          <span className="text-sm text-gray-500">Counted</span>
          <div className="px-4 py-2 bg-dap-green rounded-lg">
            <span className="text-lg font-semibold text-white">
              {counted.toFixed(4)}
            </span>
          </div>
        </VStack>
      </HStack>

      <p className="mt-4 text-sm text-gray-600">
        {hoursUsed} hours for a total of {points} points were used to calculate
        the GPA.
      </p>
    </div>
  );
};

type CreditRequirement = {
  met: boolean;
  hours: number;
  description: string;
};

type CreditHourTotalsProps = {
  requirements: CreditRequirement[];
};

export const CreditHourTotalsCard = ({
  requirements = [
    {
      met: true,
      hours: 21,
      description: "hours of upper-division coursework in residence.",
    },
    {
      met: false,
      hours: 36,
      description: "hours of upper-division coursework required.",
    },
  ],
}: CreditHourTotalsProps) => {
  return (
    <div className="p-5 rounded-lg border border-gray-200 bg-white shadow-md">
      <h3 className="text-xl font-bold text-gray-900">Credit Hour Totals</h3>

      <VStack gap={3} className="mt-4">
        {requirements.map((req, idx) => (
          <HStack key={idx} gap={3} y="middle">
            <img
              src={req.met ? "/Frame.svg" : "/Frame (1).svg"}
              alt={req.met ? "Met" : "Not met"}
              className="w-7 h-7"
            />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{req.hours} hours</span> of{" "}
              {req.description}
            </span>
          </HStack>
        ))}
      </VStack>
    </div>
  );
};
