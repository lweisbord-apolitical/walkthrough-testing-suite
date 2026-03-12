"use client";

import { V3Module, BeginnerCard, ProficientCard, TechniqueSection, TimeComparison, Tier, WalkthroughStep, CheckFor, isAnnotatedPrompt } from "@/types";
import AnnotatedPromptCard from "./AnnotatedPromptCard";
import { useState } from "react";

/* ── Shared: Hook ────────────────────────────────────────── */
function HookSection({ hook }: { hook: { number: string; context: string } }) {
  if (!hook.number && !hook.context) return null;
  return (
    <p className="text-[18px] font-medium text-n-700 leading-[1.65] mb-6">
      You spend about <strong className="text-n-900 font-black">{hook.number}</strong> on this task.{" "}
      {hook.context}
    </p>
  );
}

/* ── Shared: Plain Prompt Card (fallback) ────────────────── */
function PromptCard({
  text,
  bracketSlots,
  label,
}: {
  text: string;
  bracketSlots: { placeholder: string; hint: string }[];
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderText = (raw: string) => {
    const parts = raw.split(/(\[[^\]]+\])/);
    return parts.map((part, j) =>
      part.startsWith("[") ? (
        <span
          key={j}
          className="inline bg-v-100 text-v-700 px-1.5 rounded font-bold border-b-2 border-dashed border-v-300"
        >
          {part}
        </span>
      ) : (
        <span key={j}>{part}</span>
      )
    );
  };

  return (
    <div className="relative bg-v-50 border border-v-100 rounded-[10px] py-5 px-5.5 mb-4">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-v-700 mb-2.5">
        <span className="text-g-500">&#x2726;</span> {label}
      </div>
      <button
        onClick={copyPrompt}
        className={`absolute top-4 right-4 text-[13px] font-bold px-4 py-1.5 rounded-2xl border-none cursor-pointer transition-all duration-150 ${
          copied
            ? "bg-[#059669] text-white"
            : "bg-v-700 text-white hover:bg-v-800 hover:-translate-y-px"
        }`}
      >
        {copied ? "Copied \u2713" : "Copy"}
      </button>
      <div className="text-[15px] text-n-800 leading-[1.75] whitespace-pre-wrap pr-16">
        {renderText(text)}
      </div>

      {bracketSlots.length > 0 && (
        <div className="mt-3 pt-3 border-t border-v-100 flex flex-wrap gap-2">
          {bracketSlots.map((slot, i) => (
            <span key={i} className="text-xs text-v-700 bg-v-100 px-2 py-1 rounded-lg">
              <strong>{slot.placeholder}</strong> &mdash; {slot.hint}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Check For Annotation ────────────────────────────────── */
function CheckForAnnotation({ checkFor }: { checkFor: CheckFor }) {
  return (
    <div className="flex gap-3 py-3 px-4 rounded-lg bg-am-50 border border-am-100 mt-3">
      <div className="flex-1 text-sm leading-relaxed">
        <div className="text-[11px] font-bold uppercase tracking-[.06em] text-am-600 mb-1">
          Check for
        </div>
        <p className="text-n-700">
          <strong className="text-n-800 font-bold">Watch out:</strong> {checkFor.issue}
        </p>
        <p className="text-n-600 mt-1">
          <strong className="text-g-500 font-bold">Before moving on:</strong> {checkFor.verify}
        </p>
      </div>
    </div>
  );
}

/* ── Technique Inline ────────────────────────────────────── */
function TechniqueInline({ technique }: { technique: TechniqueSection }) {
  return (
    <div className="py-3 px-4 rounded-lg bg-g-50 border border-g-300/30 mt-3">
      <div className="text-[11px] font-bold uppercase tracking-[.06em] text-g-500 mb-1">
        Technique: {technique.name}
      </div>
      <p className="text-sm text-n-700 leading-relaxed">{technique.contextualisation}</p>
      {technique.example && (
        <p className="text-sm text-v-700 font-medium italic mt-2 py-2 px-3 bg-v-50 border border-v-100 rounded-lg">
          &ldquo;{technique.example}&rdquo;
        </p>
      )}
    </div>
  );
}

/* ── Watch Out Inline ────────────────────────────────────── */
function WatchOutInline({ watchOut }: { watchOut: { warning: string; remedy: string } }) {
  return (
    <div className="flex gap-3 py-3 px-4 rounded-lg bg-am-50 border border-am-100 mt-3">
      <span className="text-base shrink-0 mt-0.5">&#x26A0;&#xFE0F;</span>
      <div className="text-sm text-n-700 leading-relaxed">
        <strong className="text-n-800 font-bold">{watchOut.warning}</strong>
        <p className="mt-1">{watchOut.remedy}</p>
      </div>
    </div>
  );
}

/* ── Follow Ups Inline ───────────────────────────────────── */
function FollowUpsInline({ followUps }: { followUps: string[] }) {
  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold uppercase tracking-[.06em] text-n-500 mb-1.5">
        Then try asking...
      </div>
      <div className="flex flex-col gap-1.5">
        {followUps.map((q, i) => (
          <p
            key={i}
            className="text-sm text-v-700 font-medium italic py-2.5 px-3.5 bg-[#F8F7FF] border border-[#DEDCFA] rounded-lg"
          >
            &ldquo;{q.trim()}&rdquo;
          </p>
        ))}
      </div>
    </div>
  );
}

/* ── Step Card ───────────────────────────────────────────── */
function StepCard({ step, isLast }: { step: WalkthroughStep; isLast: boolean }) {
  return (
    <div className="relative pl-12 pb-8">
      {/* Vertical spine connector */}
      {!isLast && (
        <div
          className="absolute left-[15px] top-[40px] bottom-0 w-[2px] bg-n-200"
        />
      )}

      {/* Step circle */}
      <div className="absolute left-0 top-0 w-[32px] h-[32px] rounded-full bg-v-500 text-white flex items-center justify-center text-[14px] font-black z-10">
        {step.stepNumber}
      </div>

      {/* Step content */}
      <div>
        <h3 className="text-[17px] font-bold text-n-900 mb-1.5 leading-tight">
          {step.title}
        </h3>

        {/* With AI description */}
        <p className="text-[15px] text-n-600 leading-[1.7] mb-1">
          {step.withAi}
        </p>

        {/* Embedded prompt (only one step has this) */}
        {step.prompt && (
          <div className="mt-3">
            {isAnnotatedPrompt(step.prompt) ? (
              <AnnotatedPromptCard prompt={step.prompt} label="Your prompt" />
            ) : (
              <PromptCard
                text={step.prompt.text}
                bracketSlots={step.prompt.bracketSlots}
                label="Your prompt"
              />
            )}
          </div>
        )}

        {/* Follow ups (beginner only) */}
        {step.followUps && step.followUps.length > 0 && (
          <FollowUpsInline followUps={step.followUps} />
        )}

        {/* Technique (inline within the step) */}
        {step.technique && <TechniqueInline technique={step.technique} />}

        {/* Watch out (inline within the step) */}
        {step.watchOut && <WatchOutInline watchOut={step.watchOut} />}

        {/* Check for annotation */}
        {step.checkFor && <CheckForAnnotation checkFor={step.checkFor} />}
      </div>
    </div>
  );
}

/* ── Walkthrough Timeline ────────────────────────────────── */
function WalkthroughTimeline({ steps }: { steps: WalkthroughStep[] }) {
  return (
    <div className="relative">
      {steps.map((step, i) => (
        <StepCard key={step.stepNumber} step={step} isLast={i === steps.length - 1} />
      ))}
    </div>
  );
}

/* ── Shared: Time Comparison Row ─────────────────────────── */
function TimeComparisonRow({ timeComparison }: { timeComparison: TimeComparison }) {
  return (
    <>
      <div className="h-px bg-n-100 my-5" />
      <div className="flex items-center gap-3 py-3.5 px-4 rounded-lg bg-n-50 border border-n-100 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-n-600">
          Without AI: <span className="font-black text-n-800">{timeComparison.without.total}</span>
        </div>
        <span className="text-n-200 text-lg">&rarr;</span>
        <div className="flex items-center gap-1.5 text-sm text-n-600">
          With AI: <span className="font-black text-n-800">{timeComparison.withAi.total}</span>
        </div>
        <div className="ml-auto text-[13px] font-bold px-3 py-1 rounded-xl bg-g-50 text-g-500 border border-g-300/30">
          Save {timeComparison.savingsPerInstance}
        </div>
      </div>
    </>
  );
}

/* ── Walkthrough Card View (unified for both tiers) ──────── */
function WalkthroughCardView({
  card,
  whyThisWorks,
}: {
  card: BeginnerCard | ProficientCard;
  whyThisWorks?: string;
}) {
  return (
    <div>
      <HookSection hook={card.hook} />
      <WalkthroughTimeline steps={card.steps} />

      {whyThisWorks && (
        <div className="py-4 px-4.5 rounded-lg bg-n-50 border border-n-100 mb-4">
          <div className="text-[12px] font-bold uppercase tracking-[.06em] text-v-700 mb-1.5">
            Why this works
          </div>
          <p className="text-sm text-n-700 leading-relaxed">{whyThisWorks}</p>
        </div>
      )}

      <TimeComparisonRow timeComparison={card.timeComparison} />
    </div>
  );
}

/* ── Main Card ───────────────────────────────────────────── */
export default function OpportunityCard({
  module,
  tier,
  index,
}: {
  module: V3Module;
  tier: Tier;
  index: number;
}) {
  const categoryLabels: Record<string, string> = {
    workOutput: "Work Output",
    mentalProcesses: "Mental Processes",
    informationInput: "Information Input",
    interactingWithOthers: "Interacting With Others",
  };

  const card = tier === "beginner" ? module.beginner : module.proficient;
  const whyThisWorks = tier === "proficient" ? (card as ProficientCard).whyThisWorks : undefined;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[.08em] text-v-700 mb-3">
          <span className="w-2 h-2 rounded-full bg-v-500" />
          #{index + 1} Opportunity
          <span
            className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              tier === "beginner"
                ? "bg-g-50 text-g-500 border border-g-300/30"
                : "bg-v-50 text-v-700 border border-v-100"
            }`}
          >
            {tier}
          </span>
        </div>
        <h2 className="text-[22px] font-black leading-tight text-n-900 mb-1">
          {module.task}
        </h2>
        {module.userDescription !== module.task && (
          <p className="text-sm text-n-500 italic">&quot;{module.userDescription}&quot;</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-n-50 border border-n-100 text-n-600 font-medium">
            {categoryLabels[module.category] || module.category}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-n-50 border border-n-100 text-n-600 font-medium">
            {module.timePercentage}% of work time
          </span>
          {module.aiExposure && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-v-50 border border-v-100 text-v-700 font-bold">
              {module.aiExposure}
            </span>
          )}
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-n-50 border border-n-100 text-n-600 font-medium">
            AI: {module.aiFrequency}
          </span>
        </div>
      </div>

      <WalkthroughCardView card={card} whyThisWorks={whyThisWorks} />
    </div>
  );
}
