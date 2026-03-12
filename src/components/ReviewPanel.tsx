"use client";

import { QualityRating, IssueTag, TaskReview } from "@/types";

const ISSUE_TAGS: { value: IssueTag; label: string }[] = [
  { value: "prompt-too-generic", label: "Prompt too generic" },
  { value: "steps-unclear", label: "Steps unclear" },
  { value: "tips-not-specific", label: "Tips not specific" },
  { value: "time-unrealistic", label: "Time unrealistic" },
  { value: "tone-mismatch", label: "Tone mismatch" },
  { value: "technique-not-contextualised", label: "Technique not contextualised" },
  { value: "tiers-too-similar", label: "Tiers too similar" },
  { value: "watch-outs-weak", label: "Watch-outs weak" },
  { value: "other", label: "Other" },
];

export default function ReviewPanel({
  review,
  onChange,
}: {
  review: TaskReview;
  onChange: (r: TaskReview) => void;
}) {
  const ratingOptions: { value: QualityRating; label: string; color: string; activeColor: string }[] = [
    { value: "good", label: "Good", color: "bg-g-50 text-g-500 border-g-300/30", activeColor: "ring-g-500" },
    { value: "needs-work", label: "Needs Work", color: "bg-am-50 text-am-600 border-am-100", activeColor: "ring-am-600" },
    { value: "bad", label: "Bad", color: "bg-red-50 text-red-600 border-red-200", activeColor: "ring-red-500" },
  ];

  const toggleIssue = (tag: IssueTag) => {
    const next = review.issues.includes(tag)
      ? review.issues.filter((t) => t !== tag)
      : [...review.issues, tag];
    onChange({ ...review, issues: next });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-n-100">
      <h3 className="text-[12px] font-bold text-n-500 uppercase tracking-[.06em]">Review</h3>

      <div>
        <p className="text-xs text-n-500 mb-2">Quality</p>
        <div className="flex gap-2">
          {ratingOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...review, rating: review.rating === opt.value ? null : opt.value })}
              className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all ${
                review.rating === opt.value
                  ? opt.color + " ring-2 ring-offset-1 " + opt.activeColor
                  : "bg-n-50 text-n-500 border-n-100 hover:bg-n-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-n-500 mb-2">Issues</p>
        <div className="flex flex-wrap gap-2">
          {ISSUE_TAGS.map((tag) => (
            <button
              key={tag.value}
              onClick={() => toggleIssue(tag.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                review.issues.includes(tag.value)
                  ? "bg-am-50 text-am-600 border-am-100 font-bold"
                  : "bg-n-50 text-n-500 border-n-100 hover:bg-n-100"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-n-500 mb-2">Notes</p>
        <textarea
          value={review.notes}
          onChange={(e) => onChange({ ...review, notes: e.target.value })}
          placeholder="Specific feedback on this output..."
          className="w-full text-sm border border-n-100 rounded-lg p-2 h-20 resize-none text-n-700 focus:outline-none focus:ring-2 focus:ring-v-300"
        />
      </div>
    </div>
  );
}
