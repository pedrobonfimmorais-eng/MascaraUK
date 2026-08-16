import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function CheckoutStepper({ currentStep }: { currentStep: number }) {
  const stepLabels = [
    t("checkout.stepContact"),
    t("checkout.stepDeliveryAddress"),
    t("checkout.stepDeliveryMethod"),
    t("checkout.stepReview"),
    t("checkout.stepPayment"),
  ];

  return (
    <ol className="mb-8 flex items-center gap-2 overflow-x-auto sm:gap-4">
      {stepLabels.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;

        return (
          <li key={label} className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                isDone
                  ? "bg-brand-primary text-white"
                  : isActive
                    ? "border-2 border-brand-primary text-brand-primary"
                    : "border border-gray-300 text-gray-400"
              )}
            >
              {isDone ? "✓" : stepNumber}
            </span>
            <span className={cn("text-xs font-medium sm:text-sm", isActive ? "text-brand-secondary" : "text-gray-400")}>
              {label}
            </span>
            {stepNumber < stepLabels.length && <span className="mx-1 h-px w-4 bg-gray-300 sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
