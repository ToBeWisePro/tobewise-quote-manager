"use client";

import Image from "next/image";

interface PasswordGateCardProps {
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  title?: string;
  buttonLabel?: string;
}

export default function PasswordGateCard({
  password,
  onPasswordChange,
  onSubmit,
  title = "Enter Password",
  buttonLabel = "Login",
}: PasswordGateCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-light px-4">
      <div className="w-full max-w-sm rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.1)]">
        <div className="mb-4 flex items-center justify-center">
          <Image
            src="/images/image.png"
            alt="Quote Manager Icon"
            width={64}
            height={64}
            className="rounded-full"
          />
        </div>
        <h2 className="mb-4 text-center text-xl font-bold text-primary">
          {title}
        </h2>
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Password"
          className="input input-bordered mb-4 w-full text-black"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="w-full rounded bg-primary px-4 py-2 text-white shadow"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
