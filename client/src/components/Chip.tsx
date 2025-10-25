// client/src/components/Chip.tsx
import React from "react";
export default function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs border rounded-full px-2 py-0.5 inline-flex items-center gap-1">
      {children}
    </span>
  );
}
