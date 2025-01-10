import { ReactNode } from "react";

type ScrollableTableContainerProps = {
  children: ReactNode;
};

export default function ScrollableTableContainer({ children }: ScrollableTableContainerProps) {
  return (
    <div className="overflow-x-auto overflow-y-auto max-w-full max-h-[500px] border border-neutral-dark rounded">
      {children}
    </div>
  );
}
