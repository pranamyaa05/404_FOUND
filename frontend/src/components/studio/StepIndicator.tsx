import clsx from "clsx";

interface Props {
  steps: string[];
  currentStep: number;
}

/**
 * Visual progress bar showing which step the user is on.
 */
export default function StepIndicator({ steps, currentStep }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                i < currentStep
                  ? "bg-primary text-white"
                  : i === currentStep
                  ? "bg-primary-light text-white ring-4 ring-primary/30"
                  : "bg-gray-700 text-gray-400"
              )}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span
              className={clsx(
                "text-xs mt-1 hidden sm:block",
                i === currentStep ? "text-primary-light font-semibold" : "text-gray-500"
              )}
            >
              {label}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={clsx(
                "h-0.5 w-8 sm:w-14 rounded transition-all duration-300 mb-4",
                i < currentStep ? "bg-primary" : "bg-gray-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
