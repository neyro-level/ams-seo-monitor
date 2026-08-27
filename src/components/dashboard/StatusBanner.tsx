import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

type StatusBannerProps = {
  tone: "success" | "info" | "warning" | "error";
  title: string;
  description: string;
};

const toneMap = {
  success: {
    wrapper: "border-[#A7F3D0] bg-[#ECFDF5] text-[#022C22]",
    Icon: CheckCircle2,
  },
  info: {
    wrapper: "border-[#BAE6FD] bg-[#F0F9FF] text-[#082F49]",
    Icon: Info,
  },
  warning: {
    wrapper: "border-[#FDE68A] bg-[#FFFBEB] text-[#451A03]",
    Icon: TriangleAlert,
  },
  error: {
    wrapper: "border-[#FECDD3] bg-[#FFF1F2] text-[#4C0519]",
    Icon: AlertCircle,
  },
} as const;

export function StatusBanner({ tone, title, description }: StatusBannerProps) {
  const config = toneMap[tone];
  const Icon = config.Icon;

  return (
    <div className={`flex gap-3 rounded-[8px] border p-4 ${config.wrapper}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-5">{title}</p>
        <p className="text-sm leading-5">{description}</p>
      </div>
    </div>
  );
}
