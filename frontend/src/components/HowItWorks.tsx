"use client";

import { ArrowDownToLine, FileKey, ArrowUpFromLine, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: ArrowDownToLine,
    title: "Deposit",
    description: "Connect your wallet and deposit a fixed amount of SOL into the privacy pool.",
  },
  {
    icon: FileKey,
    title: "Save Note",
    description: "Receive a cryptographic note string. This is your key to withdraw — save it securely.",
  },
  {
    icon: ArrowUpFromLine,
    title: "Withdraw",
    description: "From any wallet, paste your note string. A ZK proof breaks the deposit-withdrawal link.",
  },
  {
    icon: ShieldCheck,
    title: "Private",
    description: "The on-chain verifier confirms the proof. Nobody can trace which deposit you withdrew.",
  },
];

export default function HowItWorks() {
  return (
    <div className="border border-[hsl(220,15%,14%)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[hsl(220,15%,14%)]">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
          How It Works
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 p-3 rounded-lg border border-[hsl(220,15%,12%)] bg-[hsl(220,18%,4%)] hover:border-[rgba(0,237,137,0.2)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#00ed89]/10 flex items-center justify-center">
                <step.icon className="w-3.5 h-3.5 text-[#00ed89]" />
              </div>
              <span className="text-[10px] font-mono text-white/30">
                0{i + 1}
              </span>
            </div>
            <h3 className="text-xs font-medium text-white/80">{step.title}</h3>
            <p className="text-[11px] text-white/30 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
