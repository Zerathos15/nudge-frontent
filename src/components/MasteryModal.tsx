import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, AlertCircle, Sparkles, X, Brain } from 'lucide-react';
import { ScheduledTask } from '../types.ts';

interface MasteryModalProps {
  task: ScheduledTask;
  onClose: () => void;
  onSuccess: () => void;
}

export const MasteryModal: React.FC<MasteryModalProps> = ({ task, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [qId: string]: string }>({});
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const startTest = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('mastery_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/mastery/start', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            topicId: task.topic_id,
            taskId: task.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setTestId(data.testId);
          setQuestions(data.questions || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    startTest();
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('mastery_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const formattedAnswers = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      const res = await fetch('/api/mastery/submit', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          testId,
          answers: formattedAnswers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.passed) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-indigo-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Mastery Verification Assessment
              </h3>
              <p className="text-xs text-slate-400">
                {task.topic_code}: {task.topic_title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Brain className="w-8 h-8 text-indigo-400 animate-pulse mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-300">
              Synthesizing Adaptive Examination Questions...
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Grounded in the authoritative curriculum and your submitted notes.
            </p>
          </div>
        ) : result ? (
          <div className="py-6 space-y-5">
            <div
              className={`p-6 rounded-2xl border text-center ${
                result.passed
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-100'
                  : 'bg-rose-950/60 border-rose-700 text-rose-100'
              }`}
            >
              {result.passed ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              ) : (
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-2" />
              )}
              <h4 className="text-xl font-extrabold">
                {result.passed ? 'Topic Mastered!' : 'Mastery Verification Failed'}
              </h4>
              <div className="text-2xl font-mono font-bold mt-1">
                Score: {result.score}% (Passing Threshold: 75%)
              </div>
              <p className="text-xs sm:text-sm mt-3 max-w-lg mx-auto leading-relaxed opacity-90">
                {result.feedback}
              </p>
            </div>

            <div className="text-xs text-slate-400 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
              {result.passed ? (
                <span>
                  ✓ Your checkpoint pointer has automatically updated to the next eligible topic. Downstream prerequisite-dependent modules are now unlocked!
                </span>
              ) : (
                <span>
                  ⚠ This topic has been placed in Reinforcement. Review your notes, rectify gaps, and retry the assessment before advancing.
                </span>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Return to Schedule
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            <div className="text-xs text-slate-400 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              Answer the questions thoroughly to demonstrate conceptual, edge-case, and architectural understanding. Passing threshold is <strong>75%</strong>.
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-indigo-400 font-mono">
                      Question {idx + 1} ({q.type})
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-100 mb-2.5">
                    {q.question}
                  </p>
                  <textarea
                    rows={3}
                    required
                    value={answers[q.id] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Provide your technical answer and reasoning..."
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Evaluating Answers...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit For Mastery Evaluation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
