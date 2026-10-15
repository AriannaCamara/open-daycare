import { avatarToneStyles, type AvatarTone } from "@/app/_data/children";

interface AvatarProps {
  initial: string;
  tone: AvatarTone;
  variant: "child" | "parent";
  className?: string;
}

export function Avatar({ initial, tone, variant, className = "" }: AvatarProps) {
  const toneStyle = avatarToneStyles[tone];
  const color = variant === "parent" ? "#FFFFFF" : toneStyle.text;

  return (
    <div
      className={`flex flex-none items-center justify-center rounded-full font-display font-semibold ${className}`}
      style={{ background: toneStyle.background, color }}
    >
      {initial}
    </div>
  );
}
