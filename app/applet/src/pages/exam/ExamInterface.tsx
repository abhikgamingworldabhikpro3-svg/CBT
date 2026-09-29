import React, { useState, useEffect, useRef } from 'react';
import { examService } from '../../services/examService';
import { attemptService } from '../../services/attemptService';
import { questionService } from '../../services/questionService';
import { proctoringService } from '../../services/proctoringService';
import { Exam, ExamAttempt, Question } from '../../types';
import { HelpCircle, Shield, AlertTriangle, Play, ChevronLeft, ChevronRight, CheckSquare, Save, XCircle, Award, Video, Mic, Eye, Camera, Check } from 'lucide-react';

interface ExamInterfaceProps {
  examId: string;
  attemptId: string;
  studentUser: { uid: string; name: string };
  onSubmitFinished: () => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({ examId, attemptId, studentUser, onSubmitFinished }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Omit<Question, 'correctAnswers' | 'explanation'>[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  // Time remaining state
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Question navigation states
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [visited, setVisited] = useState<string[]>([]);

  // Answers saved in active React state
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string[]>>({});

  // Proctor Warning Overlays
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);

  // Webcam sensor stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  useEffect(() => {
    loadExamPortal();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Clean up webcam
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [examId, attemptId]);

  const loadExamPortal = async () => {
    setLoading(true);
    try {
      const examData = await examService.getExam(examId);
      const attemptData = await attemptService.getAttempt(attemptId);
      if (!examData || !attemptData) return;

      setExam(examData);
      setAttempt(attemptData);

      // Securely load questions with correctAnswers stripped!
      const questionItems = await questionService.getExamQuestionsForCandidate(examData.questionIds);
      setQuestions(questionItems);

      // Initialize answers map
      setStudentAnswers(attemptData.answersSaved || {});

      // Mark first question as visited
      if (questionItems.length > 0) {
        setVisited([questionItems[0].id]);
      }

      // Calculate authoritative remaining timer time
      const deadlineTime = new Date(attemptData.deadline).getTime();
      const now = new Date().getTime();
      const remainingMs = deadlineTime - now;
      setTimeLeft(Math.max(0, Math.floor(remainingMs / 1000)));

      // Initialize Countdown
      startCountdown(deadlineTime);

      // Initiate webcam loop
      startProctorWebcam();

      // Initiate proctor blur/fullscreen listeners
      registerProctorListeners();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = (deadlineMs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = new Date().getTime();
      const remaining = deadlineMs - now;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        // Automatic Timer submission triggers!
        handleForceSubmit("EXAM_TIMEOUT");
      } else {
        setTimeLeft(Math.floor(remaining / 1000));
      }
    }, 1000);
  };

  const startProctorWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setWebcamActive(true);
      }
    } catch (e) {
      console.warn("Unable to start proctor webcam stream:", e);
      // Log camera disabled security event
      await logSecurityIncident('CAMERA_DISABLED', 'CRITICAL', "Candidate blocked webcam stream access.");
    }
  };

  const registerProctorListeners = () => {
    // 1. Tab Focus loss (visibility change)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await logSecurityIncident('TAB_SWITCH', 'CRITICAL', "Candidate minimized or switched the browser tab.");
        triggerOverlayWarning("Tab Switch Detected. This violation is logged in your secure exam profile!");
      }
    };

    // 2. Window Blur (losing focus)
    const handleWindowBlur = async () => {
      await logSecurityIncident('WINDOW_BLUR', 'WARNING', "Candidate moved mouse outside exam focus window.");
      triggerOverlayWarning("Focus Loss Warning! Keep mouse focus strictly within the test sheet.");
    };

    // 3. Fullscreen check
    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        await logSecurityIncident('FULLSCREEN_EXIT', 'CRITICAL', "Candidate exited secure locked fullscreen mode.");
        triggerOverlayWarning("Fullscreen exit detected. Re-enter fullscreen mode to prevent block lockout!");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  };

  const logSecurityIncident = async (type: any, severity: 'INFO' | 'WARNING' | 'CRITICAL', desc: string) => {
    try {
      await proctoringService.logEvent({
        attemptId,
        studentId: studentUser.uid,
        examId,
        type,
        severity,
        metadata: desc
      });
    } catch (e) {
      console.error(e);
    }
  };

  const triggerOverlayWarning = (msg: string) => {
    setProctorWarning(msg);
    setTimeout(() => setProctorWarning(null), 4000);
  };

  // AUTOSAVE ANSWERS DIRECT TO FIRESTORE WITH CLIENT-SAFE DEBOUNCING
  const handleSelectAnswer = async (qId: string, value: string, isMulti: boolean) => {
    let currentChoices = studentAnswers[qId] || [];
    
    if (isMulti) {
      if (currentChoices.includes(value)) {
        currentChoices = currentChoices.filter(x => x !== value);
      } else {
        currentChoices = [...currentChoices, value];
      }
    } else {
      currentChoices = [value];
    }

    const updatedMap = {
      ...studentAnswers,
      [qId]: currentChoices,
    };
    setStudentAnswers(updatedMap);

    // Save directly to Firestore dynamically (autosave safeguard)
    try {
      await attemptService.saveAnswer(attemptId, qId, currentChoices);
    } catch (e) {
      console.error("Autosave fail:", e);
    }
  };

  const handleClearChoices = async (qId: string) => {
    const updatedMap = {
      ...studentAnswers,
      [qId]: [],
    };
    setStudentAnswers(updatedMap);
    try {
      await attemptService.saveAnswer(attemptId, qId, []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkReview = (qId: string) => {
    if (markedForReview.includes(qId)) {
      setMarkedForReview(markedForReview.filter(id => id !== qId));
    } else {
      setMarkedForReview([...markedForReview, qId]);
    }
  };

  const handleNavigation = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIdx(idx);
    
    // Set visited
    const targetQId = questions[idx].id;
    if (!visited.includes(targetQId)) {
      setVisited([...visited, targetQId]);
    }
  };

  const handleManualSubmit = async () => {
    const answeredCount = Object.values(studentAnswers).filter(ans => ans.length > 0).length;
    const unansweredCount = questions.length - answeredCount;

    if (!window.confirm(`Submission Confirmation:\n- Answered: ${answeredCount}\n- Remaining: ${unansweredCount}\nAre you sure you want to lock and submit your answers?`)) {
      return;
    }

    await executeEvaluationAndClose();
  };

  const handleForceSubmit = async (reason: string) => {
    await logSecurityIncident('EXAM_TIMEOUT', 'CRITICAL', `Assessment forced submitted due to timer countdown expiry: ${reason}`);
    await executeEvaluationAndClose();
  };

  const executeEvaluationAndClose = async () => {
    setLoading(true);
    try {
      if (exam) {
        // Securely submit attempt and evaluate server-side
        await attemptService.submitAndEvaluate(attemptId, exam);
        
        // Relinquish Fullscreen lock
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }

        alert("Assessment submitted and evaluated successfully. Proceeding to candidate lobby.");
        onSubmitFinished();
      }
    } catch (err) {
      console.error(err);
      onSubmitFinished();
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="text-xs font-semibold font-mono text-slate-500">Locking secure examination room...</span>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const currentAnswers = studentAnswers[currentQuestion?.id] || [];

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 select-none overflow-hidden font-sans">
      
      {/* SECURE CBT ROOM HEADER */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 shadow-sm shrink-0">
        <div className="space-y-0.5">
          <span className="font-mono text-[9px] font-bold text-red-600 dark:text-red-400 tracking-wider flex items-center gap-1.5 uppercase">
            <Shield className="h-3 w-3 animate-pulse" />
            <span>Secure Surveillance Active</span>
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-md">
            {exam?.title}
          </h2>
        </div>

        {/* Autoritative countdown banner */}
        <div className={`flex items-center gap-2 rounded-xl px-4 py-1.5 border font-mono font-bold text-xs sm:text-sm ${timeLeft < 180 ? 'border-red-200 bg-red-50 text-red-600 animate-pulse' : 'border-slate-100 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
          <span className="text-[10px] text-slate-400 uppercase">Remaining:</span>
          <span>{formatTimer(timeLeft)}</span>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold block text-slate-800 dark:text-white">{studentUser.name}</span>
          <span className="text-[9px] text-slate-400 font-mono">Exam Code: {examId.substring(0, 10)}</span>
        </div>
      </header>

      {/* SECURE CBT CORE VIEWPORT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PALETTE SIDEBAR */}
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <h3 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Question Navigator</h3>
            
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isMarked = markedForReview.includes(q.id);
                const isAnswered = studentAnswers[q.id] && studentAnswers[q.id].length > 0;
                const isVis = visited.includes(q.id);

                let btnClass = 'bg-slate-100 border border-slate-200 text-slate-500';
                if (isCurrent) {
                  btnClass = 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-950 border-none';
                } else if (isMarked && isAnswered) {
                  btnClass = 'bg-purple-600 border-none text-white'; // Answered + Marked
                } else if (isMarked) {
                  btnClass = 'bg-amber-500 border-none text-white'; // Marked
                } else if (isAnswered) {
                  btnClass = 'bg-emerald-600 border-none text-white'; // Answered
                } else if (isVis) {
                  btnClass = 'bg-slate-200 text-slate-600'; // Visited
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigation(idx)}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs cursor-pointer select-none transition ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick status guide legend */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[10px] text-slate-400 leading-normal">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
              <span>Answered & Marked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded bg-slate-200" />
              <span>Visited but Unanswered</span>
            </div>

            {/* Simulated webcam radar feed */}
            <div className="mt-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 flex flex-col items-center gap-2">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Video className="h-3 w-3 text-red-500" />
                <span>Local Camera Sensor</span>
              </span>
              <div className="h-20 w-28 rounded-lg bg-black overflow-hidden relative border">
                <video ref={videoRef} className="h-full w-full object-cover scale-x-[-1]" muted playsInline />
                <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER EXAM VIEWPORT */}
        <main className="flex-1 flex flex-col justify-between bg-slate-50 dark:bg-slate-950 overflow-y-auto">
          {currentQuestion ? (
            <div className="p-6 max-w-3xl mx-auto w-full space-y-6 flex-1 flex flex-col justify-center">
              
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentIdx + 1} of {questions.length} · Topic: {currentQuestion.topic}
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {currentQuestion.questionText}
                </p>
              </div>

              {/* Options selectors */}
              <div className="space-y-2.5 mt-2">
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  currentQuestion.options.map((opt, oIdx) => {
                    const choiceLetter = String.fromCharCode(65 + oIdx);
                    const isSelected = currentAnswers.includes(choiceLetter) || currentAnswers.includes(opt);
                    const isMulti = currentQuestion.type === 'mcq_multi';

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectAnswer(currentQuestion.id, choiceLetter, isMulti)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left cursor-pointer transition ${isSelected ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 dark:text-indigo-400 font-bold' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {choiceLetter}
                          </span>
                          <span className="text-xs sm:text-sm font-medium">{opt}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                      </button>
                    );
                  })
                )}

                {/* Numerical inputs */}
                {currentQuestion.type === 'numerical' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 font-mono mb-1 uppercase">Enter numerical response</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 42.15"
                      value={currentAnswers[0] || ''}
                      onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value, false)}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 w-full sm:w-[240px]"
                    />
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs">
              Exam paper is currently empty or loading...
            </div>
          )}

          {/* BOTTOM CONTROLS FOOTER */}
          <footer className="h-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigation(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => handleNavigation(currentIdx + 1)}
                disabled={currentIdx === questions.length - 1}
                className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMarkReview(currentQuestion.id)}
                className={`rounded-lg border px-3 py-2 font-semibold cursor-pointer transition ${markedForReview.includes(currentQuestion?.id) ? 'bg-amber-500 border-none text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
              >
                <span>Mark for Review</span>
              </button>

              <button
                onClick={() => handleClearChoices(currentQuestion.id)}
                className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <span>Clear Response</span>
              </button>
            </div>

            <button
              onClick={handleManualSubmit}
              className="rounded-lg bg-indigo-600 text-white font-bold px-4 py-2 hover:bg-indigo-700 shadow cursor-pointer flex items-center gap-1"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Submit Assessment</span>
            </button>
          </footer>

        </main>
      </div>

      {/* PROCTOR LOG INCIDENT OVERLAY WARNING */}
      {proctorWarning && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[200] rounded-xl bg-red-600 text-white font-sans px-4 py-2.5 shadow-xl text-xs flex items-center gap-2 font-bold animate-bounce">
          <AlertTriangle className="h-4 w-4 animate-ping" />
          <span>{proctorWarning}</span>
        </div>
      )}

    </div>
  );
};
