"use client";

import { useState } from "react";
import { OutputEnvelope } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function WalkthroughCard({
  envelope,
  index,
}: {
  envelope: OutputEnvelope;
  index: number;
}) {
  const { input, output, meta } = envelope;
  const phases = output.phases;

  const categoryColor = "text-purple-600";

  return (
    <div
      className="bg-white rounded-xl border border-black/8 shadow-sm mb-8 max-w-[800px] mx-auto"
      style={{ padding: "32px" }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-xs font-semibold uppercase tracking-[1.5px] ${categoryColor}`}
          >
            #{index + 1} {input.category}
          </span>
          <span className="text-xs text-gray-500 border border-gray-300 rounded-full px-2 py-0.5">
            {input.time}
          </span>
        </div>
        <h2 className="text-lg font-semibold leading-snug text-gray-900">
          {input.task}
        </h2>
        <div className="flex gap-2 mt-2">
          <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            {meta.model}
          </span>
          <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            {meta.promptVersion}
          </span>
        </div>
      </div>

      {/* Scenario */}
      <p className="text-sm text-gray-500 mb-6">
        As a {input.role}, {output.scenario}
      </p>

      {/* Phases */}
      <div className="relative">
        {phases.map((phase, i) => {
          const isLast = i === phases.length - 1;
          const hasPrompt = !!phase.promptExample;
          const isPromptPhase = hasPrompt;

          return (
            <div key={i} className="flex gap-4 mb-0">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    isPromptPhase
                      ? "bg-purple-600 border-purple-600 text-white"
                      : isLast
                      ? "border-green-600 text-green-600"
                      : "border-purple-600 text-purple-600"
                  }`}
                >
                  {i + 1}
                </div>
                {!isLast && (
                  <div className="w-0.5 bg-gray-200 flex-1 min-h-[20px]" />
                )}
              </div>

              {/* Content */}
              <div className="pb-6 flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900 mb-2">
                  {phase.title}
                </h3>

                <p className="text-sm mb-2">
                  <span className="italic text-gray-400 font-medium">
                    Today:{" "}
                  </span>
                  <span className="text-gray-600">{phase.manualApproach}</span>
                </p>

                <p className="text-sm mb-2">
                  <span className="font-medium text-gray-800">With AI: </span>
                  <span className="text-gray-600">{phase.withAI}</span>
                </p>

                <p className="text-sm mb-2">
                  <span className="italic text-amber-600 font-medium">
                    Check for:{" "}
                  </span>
                  <span className="text-gray-600">
                    {phase.evaluationCheck}
                  </span>
                </p>

                {/* Prompt Example */}
                {phase.promptExample && (
                  <div className="mt-3">
                    <div className="bg-[#1a1a2e] rounded-lg p-5 mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-slate-400 font-mono">
                          PROMPT
                        </span>
                        <CopyButton
                          text={phase.promptExample.initialPrompt}
                        />
                      </div>
                      <pre className="font-mono text-[13px] text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {phase.promptExample.initialPrompt}
                      </pre>
                    </div>

                    <div className="bg-[#1a1a2e] rounded-lg p-5 mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-600">
                          Follow-up
                        </span>
                        <CopyButton text={phase.promptExample.followUp} />
                      </div>
                      <pre className="font-mono text-[13px] text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {phase.promptExample.followUp}
                      </pre>
                    </div>

                    <p className="text-sm text-purple-600 italic">
                      {phase.promptExample.refinementPattern}
                    </p>
                  </div>
                )}

                {/* Human Edge */}
                {phase.humanEdge && (
                  <p className="text-sm mt-2 text-green-600">
                    <span className="font-bold">Your edge: </span>
                    {phase.humanEdge}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
