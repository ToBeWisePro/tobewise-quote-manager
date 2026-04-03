"use client";

interface CenteredStatusProps {
  message: string;
  withSpinner?: boolean;
  className?: string;
}

export default function CenteredStatus({
  message,
  withSpinner = true,
  className = "flex h-full min-h-[40vh] items-center justify-center",
}: CenteredStatusProps) {
  return (
    <div className={className}>
      <div className="text-center">
        {withSpinner ? (
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        ) : null}
        <p className="mt-4 text-primary">{message}</p>
      </div>
    </div>
  );
}
