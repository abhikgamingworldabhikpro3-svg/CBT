import React, { useState, useEffect } from 'react';
import { Exam, Subject, Question, Attempt, Answer, QuestionAnswerKey } from '../../types';
import { questionService } from '../../services/questionService';
import { attemptService } from '../../services/attemptService';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { BookOpen, CheckCircle, XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

interface ExamReviewProps {
  examId: string;
  attemptId: string;
  onBack: () => void;
}

export const ExamReview: React.FC<ExamReviewProps> = ({ examId, attemptId, onBack }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setSavedAnswers] = useState<Answer[]>([]);
  const [answerKeys, setAnswerKeys] = useState<Record<string, QuestionAnswerKey>>({});
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubExam = onSnapshot(doc(db, 'exams', examId), async (snap) => {
      if (snap.exists()) {
        const eData = snap.data() as Exam;
        setExam(eData);

        // Fetch subject
        onSnapshot(doc(db, 'subjects', eData.subjectId), (sSnap) => {
          if (sSnap.exists()) {
            setSubject(sSnap.data() as Subject);
          }
        });

        // Fetch questions and answer keys
        const qList: Question[] = [];
        const keysMap: Record<string, QuestionAnswerKey> = {};
        for (const qId of eData.questionIds) {
          const q = await questionService.getQuestion(qId);
          if (q) {
            qList.push(q);
            const key = await questionService.getQuestionAnswerKey(qId);
            if (key) {
              keysMap[qId] = key;
            }
          }
        }
        setQuestions(qList);
        setAnswerKeys(keysMap);
      }
    });

    const unsubAttempt = onSnapshot(doc(db, 'attempts', attemptId), (snap) => {
      if (snap.exists()) {
        setAttempt(snap.data() as Attempt);
      }
    });

    const loadAnswers = async () => {
      const saved = await attemptService.getSavedAnswers(attemptId);
      setSavedAnswers(saved);
      setLoading(false);
    };
    loadAnswers();

    return () => {
      unsubExam();
      unsubAttempt();
    };
  }, [examId, attemptId]);

  if (loading || !exam || !attempt) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 justify-between flex-wrap">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{subject?.name}</span>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">Review: {exam.title}</h2>
          </div>
        </div>

        <div className="flex gap-4 text-xs font-mono text-slate-500">
          <div>Obtained Score: <span className="font-bold text-indigo-600 dark:text-indigo-400">{attempt.score} / {exam.totalMarks} Marks</span></div>
          <div>Accuracy: <span className="font-bold text-slate-700 dark:text-slate-300">{attempt.accuracy}%</span></div>
        </div>
      </div>

      {/* Questions Review list */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const studentAns = answers.find(a => a.questionId === q.id)?.answer || [];
          const key = answerKeys[q.id];
          
          let isCorrect = false;
          if (q.type === 'single-choice' || q.type === 'true-false') {
            isCorrect = studentAns[0] === key?.correctAnswers[0];
          } else if (q.type === 'multiple-choice') {
            const correctSet = new Set(key?.correctAnswers || []);
            const studentSet = new Set(studentAns);
            isCorrect = correctSet.size === studentSet.size && [...correctSet].every(item => studentSet.has(item));
          } else if (q.type === 'numerical') {
            const sNum = parseFloat(studentAns[0]);
            const cNum = parseFloat(key?.correctAnswers[0]);
            isCorrect = !isNaN(sNum) && !isNaN(cNum) && Math.abs(sNum - cNum) <= 0.05;
          }

          return (
            <div key={q.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">Question {idx + 1} ({q.type})</span>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{q.questionText}</h3>
                </div>

                {isCorrect ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                    <CheckCircle className="w-4 h-4" />
                    Correct
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full shrink-0">
                    <XCircle className="w-4 h-4" />
                    Incorrect
                  </span>
                )}
              </div>

              {/* Options details */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {q.options.map((opt, oIdx) => {
                    const sIdx = String(oIdx);
                    const isSelected = studentAns.includes(sIdx);
                    const isAnsKey = key?.correctAnswers.includes(sIdx);
                    
                    let bgStyle = 'border-slate-200';
                    if (isAnsKey) bgStyle = 'border-emerald-500 bg-emerald-50/10 text-emerald-800';
                    else if (isSelected) bgStyle = 'border-rose-400 bg-rose-50/10 text-rose-800';

                    return (
                      <div key={oIdx} className={`p-3 border rounded-xl flex items-center gap-2.5 text-xs font-medium ${bgStyle}`}>
                        <span className="font-bold font-mono">{String.fromCharCode(65 + oIdx)}.</span>
                        <span className="flex-1">{opt}</span>
                        {isAnsKey && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Answer Key</span>}
                        {isSelected && !isAnsKey && <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Your Answer</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Numerical detailed review */}
              {q.type === 'numerical' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-slate-400 font-mono">Your Entered Answer:</span>
                    <div className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-1">{studentAns[0] || 'Unanswered'}</div>
                  </div>
                  <div className="p-3 bg-emerald-50/20 dark:bg-emerald-950/15 border border-emerald-500/20 rounded-xl">
                    <span className="text-emerald-600 font-mono">Correct Reference Answer:</span>
                    <div className="font-mono text-sm text-emerald-600 mt-1">{key?.correctAnswers[0]}</div>
                  </div>
                </div>
              )}

              {/* Solution explanation */}
              {key?.explanation && (
                <div className="p-4 bg-slate-50 dark:bg-slate-850/30 rounded-xl text-xs space-y-1 leading-normal text-slate-500 border border-slate-200 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Solution Explanation:</span>
                  <p className="font-sans whitespace-pre-line">{key.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
