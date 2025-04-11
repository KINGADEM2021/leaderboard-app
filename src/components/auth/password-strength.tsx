import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

type PasswordStrengthProps = {
  password: string;
};

type Requirement = {
  regex: RegExp;
  text: string;
};

const requirements: Requirement[] = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[A-Z]/, text: "One uppercase letter" },
  { regex: /[a-z]/, text: "One lowercase letter" },
  { regex: /[0-9]/, text: "One number" },
  { regex: /[@$!%*?&#]/, text: "One special character (@$!%*?&#)" },
];

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const meetsRequirement = (requirement: Requirement) => {
    return requirement.regex.test(password);
  };

  const getStrengthPercentage = () => {
    if (!password) return 0;
    const metRequirements = requirements.filter(meetsRequirement).length;
    return (metRequirements / requirements.length) * 100;
  };

  const strengthPercentage = getStrengthPercentage();

  const getStrengthColor = () => {
    if (strengthPercentage === 0) return "bg-gray-200";
    if (strengthPercentage <= 40) return "bg-red-500";
    if (strengthPercentage <= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", getStrengthColor())}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
        <span className="text-xs font-medium text-white/60 min-w-[4rem]">
          {strengthPercentage === 100 ? "Strong" :
           strengthPercentage >= 80 ? "Good" :
           strengthPercentage >= 40 ? "Fair" :
           strengthPercentage > 0 ? "Weak" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {requirements.map((requirement, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm"
          >
            {meetsRequirement(requirement) ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
            <span className={cn(
              "text-xs",
              meetsRequirement(requirement) ? "text-white/60" : "text-white/40"
            )}>
              {requirement.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
