import clsx from "clsx";

interface Props {
  steps: string[];
  currentStep: number;
}

/**
 * Visual progress bar showing which step the user is on.
 * Each step is a thread-spool marker, joined by a stitched line.
 */
export default function StepIndicator({ steps, currentStep }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1 sm:gap-2">
          {/* Step marker */}
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                "relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif italic border transition-all duration-300",
                i < currentStep
                  ? "bg-primary text-white border-primary-dark shadow-[2px_4px_8px_rgba(38,27,16,.25)]"
                  : i === currentStep
                  ? "bg-gradient-to-b from-[#f6eddd] to-[#e2d3ba] text-primary-dark border-primary/60 ring-4 ring-primary/15"
                  : "bg-surface-paper text-surface-dark/40 border-surface-dark/15"
              )}
            >
              {i < currentStep ? "" : i + 1}
              {i === currentStep && (
                <span className="absolute -inset-1 rounded-full border border-dashed border-primary/40" />
              )}
            </div>
            <span
              className={clsx(
                "text-xs mt-2 hidden sm:block font-medium",
                i === currentStep ? "text-primary-dark" : "text-surface-dark/45"
              )}
            >
              {label}
            </span>
          </div>

          {/* Stitched connector */}
          {i < steps.length - 1 && (
            <div
              className={clsx(
                "h-px w-8 sm:w-14 mb-4 transition-all duration-300",
                i < currentStep
                  ? "bg-[repeating-linear-gradient(90deg,#a94e38_0_6px,transparent_6px_10px)]"
                  : "bg-[repeating-linear-gradient(90deg,rgba(41,35,29,.25)_0_6px,transparent_6px_10px)]"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
