import React, { useState, useEffect } from 'react';
import { examService } from '../../services/examService';
import { attemptService } from '../../services/attemptService';
import { questionService } from '../../services/questionService';
import { Exam, ExamAttempt, Question } from '../../types';
import { ChevronLeft, Award, HelpCircle, Check, X, BookOpen, AlertCircle, Compass } from 'lucide-react';

interface ExamReviewProps {
  examId: string;
  attemptId: string;
  onBack: () => void;
}

export const ExamReview: React.FC<ExamReviewProps> = ({ examId, attemptId, onBack }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviewDetails();
  }, [examId, attemptId]);

  const loadReviewDetails = async () => {
    setLoading(true);
    try {
      const examData = await examService.getExam(examId);
      const attemptData = await attemptService.getAttempt(attemptId);
      if (!examData || !attemptData) return;

      setExam(examData);
      setAttempt(attemptData);

      // Load all questions (include correct answers here because the exam is officially submitted!)
      const list: Question[] = [];
      for (const qId of examData.questionIds) {
        const qSnap = await questionService.getQuestion(qId);
        if (qSnap) list.push(qSnap);
      }
      setQuestions(list);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-slate-400 font-mono text-xs">
        Loading test scores ledger...
      </div>
    );
  }

  if (!exam || !attempt) {
    return (
      <div className="p-6 text-center text-xs text-red-500 font-semibold max-w-md mx-auto mt-12">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <span>Review details not found or unreleased.</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 font-sans text-slate-900 dark:text-slate-100 space-y-6">
      
      {/* Return link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition text-xs font-semibold cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </button>

      {/* Summary Score Header */}
      <div className="rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Candidate Score Summary</span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">{exam.title}</h2>
          <p className="text-xs text-slate-400 font-mono">Duration limit: {exam.duration} minutes · Date Submitted: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'N/A'}</p>
        </div>

        <div className="flex items-center gap-2 font-mono bg-indigo-50 dark:bg-indigo-950/20 px-5 py-3 rounded-xl border border-indigo-100 dark:border-indigo-950">
          <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="text-xs">
            <span className="block font-bold text-slate-400 uppercase text-[9px]">Score Earned</span>
            <span className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-400">{attempt.score} / {exam.totalMarks} pts ({attempt.percentage}%)</span>
          </div>
        </div>
      </div>

      {/* Questions Review Ledger */}
      <div className="space-y-5">
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          <Compass className="h-4 w-4 text-indigo-500" />
          <span>Detailed Question Review Ledger</span>
        </h3>

        {questions.map((q, qIdx) => {
          const studentAnswers = attempt.answersSaved?.[q.id] || [];
          
          // Evaluation check
          let isCorrect = false;
          if (q.type === 'mcq_single' || q.type === 'true_false') {
            isCorrect = studentAnswers[0] === q.correctAnswers[0];
          } else if (q.type === 'mcq_multi') {
            isCorrect = 
              studentAnswers.length === q.correctAnswers.length &&
              studentAnswers.every(val => q.correctAnswers.includes(val));
          } else if (q.type === 'numerical') {
            const studentNum = parseFloat(studentAnswers[0]);
            const correctNum = parseFloat(q.correctAnswers[0]);
            const tol = q.tolerance || 0;
            isCorrect = !isNaN(studentNum) && Math.abs(studentNum - correctNum) <= tol;
          }

          return (
            <div key={q.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4 text-xs">
              <div className="flex justify-between items-start text-slate-400 font-mono text-[10px] uppercase font-semibold">
                <span>Question {qIdx + 1} · {q.topic}</span>
                {isCorrect ? (
                  <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Correct (+{q.marks})
                  </span>
                ) : (
                  <span className="font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Incorrect (-{q.negativeMarks})
                  </span>
                )}
              </div>

              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{q.questionText}</h4>

              {/* Options lists with results highlight */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {q.options.map((opt, oIdx) => {
                    const choiceLetter = String.fromCharCode(65 + oIdx);
                    
                    const wasSelected = studentAnswers.includes(choiceLetter) || studentAnswers.includes(opt);
                    const wasCorrect = q.correctAnswers.includes(choiceLetter) || q.correctAnswers.includes(opt);

                    let cardClass = 'border-slate-100 bg-slate-50/20';
                    if (wasSelected && wasCorrect) {
                      cardClass = 'border-emerald-500 bg-emerald-50/30 text-emerald-900 dark:text-emerald-400 font-bold';
                    } else if (wasSelected) {
                      cardClass = 'border-red-400 bg-red-50/20 text-red-900 dark:text-red-400';
                    } else if (wasCorrect) {
                      cardClass = 'border-indigo-400 bg-indigo-50/20 text-indigo-900 dark:text-indigo-400 font-bold';
                    }

                    return (
                      <div key={oIdx} className={`p-3 rounded-lg border text-[11px] leading-relaxed flex items-center justify-between ${cardClass}`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-5 w-5 rounded font-mono font-bold text-[10px] flex items-center justify-center ${wasSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                            {choiceLetter}
                          </span>
                          <span>{opt}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {wasSelected && <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">(your pick)</span>}
                          {wasCorrect && <span className="font-mono text-[9px] text-indigo-600 font-bold uppercase mr-1">(correct)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Numerical Response Highlight */}
              {q.type === 'numerical' && (
                <div className="grid grid-cols-2 gap-3 mt-1 font-mono leading-tight">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Your response:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{studentAnswers[0] || 'Unattempted'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Correct key range:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{q.correctAnswers[0]} (tol: ±{q.tolerance})</span>
                  </div>
                </div>
              )}

              {/* Sol Explanations details */}
              {q.explanation && (
                <div className="p-4 rounded-xl border border-indigo-100/30 bg-gradient-to-tr from-indigo-50/20 to-transparent flex gap-3 items-start leading-relaxed text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                  <BookOpen className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-indigo-900 dark:text-indigo-400">Instructor Explanatory Solution:</p>
                    <p>{q.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
