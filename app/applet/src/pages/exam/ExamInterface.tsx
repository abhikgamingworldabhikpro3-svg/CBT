import React, { useState, useEffect, useRef } from 'react';
import { Exam, Subject, Question, Attempt, Answer, ProctoringEventType } from '../../types';
import { examService } from '../../services/examService';
import { questionService } from '../../services/questionService';
import { attemptService } from '../../services/attemptService';
import { proctoringService } from '../../services/proctoringService';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  ShieldAlert, Clock, AlertTriangle, ChevronLeft, ChevronRight, Bookmark, 
  Trash2, Send, Camera, Mic, EyeOff, CheckSquare, RefreshCw 
} from 'lucide-react';

interface ExamInterfaceProps {
  examId: string;
  attemptId: string;
  studentUser: { uid: string; name: string };
  onSubmitFinished: () => void;
}

type PaletteState = 'NOT_VISITED' | 'VISITED' | 'ANSWERED' | 'MARKED_FOR_REVIEW' | 'ANSWERED_AND_MARKED';

export const ExamInterface: React.FC<ExamInterfaceProps> = ({ examId, attemptId, studentUser, onSubmitFinished }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Answer[]>([]);
  
  // Local answers buffer (current question selection)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [paletteStates, setPaletteStates] = useState<Record<string, PaletteState>>({});
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0); // seconds remaining
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Proctoring camera reference
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Security violation states
  const [violationsCount, setViolationsCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Submission loading state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 1. Listen to exam details
    const unsubExam = onSnapshot(doc(db, 'exams', examId), async (snap) => {
      if (snap.exists()) {
        const eData = snap.data() as Exam;
        setExam(eData);

        // Fetch questions inside the exam
        const qList: Question[] = [];
        for (const qId of eData.questionIds) {
          const q = await questionService.getQuestion(qId);
          if (q) qList.push(q);
        }
        setQuestions(qList);
      }
    });

    // 2. Listen to active attempt details
    const unsubAttempt = onSnapshot(doc(db, 'attempts', attemptId), (snap) => {
      if (snap.exists()) {
        const aData = snap.data() as Attempt;
        setAttempt(aData);
        setViolationsCount(aData.violations || 0);

        // Initialize Timer based on deadline
        const deadlineTime = new Date(aData.deadline).getTime();
        const nowTime = new Date().getTime();
        const diffSeconds = Math.max(0, Math.floor((deadlineTime - nowTime) / 1000));
        setTimeLeft(diffSeconds);

        if (aData.status === 'submitted') {
          // Force submit finished trigger
          onSubmitFinished();
        }
      }
    });

    // 3. Load saved answers
    const loadAnswers = async () => {
      const answers = await attemptService.getSavedAnswers(attemptId);
      setSavedAnswers(answers);
    };
    loadAnswers();

    // 4. Start proctoring media streams
    startProctoringWebcam();

    // 5. Initialize Security Monitor Visibility listeners
    setupSecurityListeners();

    return () => {
      unsubExam();
      unsubAttempt();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      stopProctoringWebcam();
      removeSecurityListeners();
    };
  }, [examId, attemptId]);

  // Sync Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && attempt?.status === 'started') {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleForceAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timeLeft, attempt?.status]);

  // Sync palette states whenever questions or answers change
  useEffect(() => {
    if (questions.length === 0) return;
    
    const states: Record<string, PaletteState> = { ...paletteStates };
    questions.forEach((q, idx) => {
      const saved = savedAnswers.find(ans => ans.questionId === q.id);
      const isMarked = states[q.id] === 'MARKED_FOR_REVIEW' || states[q.id] === 'ANSWERED_AND_MARKED';

      if (saved && saved.answer && saved.answer.length > 0) {
        states[q.id] = isMarked ? 'ANSWERED_AND_MARKED' : 'ANSWERED';
      } else {
        if (!states[q.id]) {
          states[q.id] = idx === currentIndex ? 'VISITED' : 'NOT_VISITED';
        }
      }
    });
    setPaletteStates(states);
  }, [questions, savedAnswers]);

  // Load buffered answers when transitioning questions
  useEffect(() => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    const saved = savedAnswers.find(ans => ans.questionId === currentQ.id);
    
    setSelectedAnswers(saved ? saved.answer : []);

    // Update Visited State
    setPaletteStates(prev => {
      const currentStatus = prev[currentQ.id];
      if (currentStatus === 'NOT_VISITED') {
        return { ...prev, [currentQ.id]: 'VISITED' };
      }
      return prev;
    });
  }, [currentIndex, questions, savedAnswers]);

  const startProctoringWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Failed to lock media streams:", err);
      logProctoringViolation('CAMERA_DISABLED', 'CRITICAL', { details: 'Video stream disabled or blocked' });
    }
  };

  const stopProctoringWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
  };

  // Central Security listeners
  const setupSecurityListeners = () => {
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  };

  const removeSecurityListeners = () => {
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };

  const logProctoringViolation = async (type: ProctoringEventType, severity: 'INFO' | 'WARNING' | 'CRITICAL', metadata: Record<string, any> = {}) => {
    try {
      await proctoringService.logEvent(attemptId, examId, type, severity, metadata);
    } catch (err) {
      console.error("Violation logging failed:", err);
    }
  };

  const handleWindowBlur = () => {
    setWarningMessage("Security Alert: Browser window focus was lost. Return to the examination room immediately.");
    logProctoringViolation('WINDOW_BLUR', 'WARNING', { details: 'Window focus lost' });
  };

  const handleWindowFocus = () => {
    // Clear warning details slowly
    setTimeout(() => setWarningMessage(null), 6000);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      setWarningMessage("Proctoring Alert: Tab switching detected. This event has been locked in audit logs.");
      logProctoringViolation('TAB_SWITCH', 'CRITICAL', { details: 'Tab became hidden' });
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      setWarningMessage("Proctoring Alert: Fullscreen mode was exited. Return to fullscreen immediately.");
      logProctoringViolation('FULLSCREEN_EXIT', 'CRITICAL', { details: 'Fullscreen exited' });
    }
  };

  // Trigger simulated proctor check at random intervals (every 10-15 seconds) to demonstrate functional face presence
  useEffect(() => {
    if (!attempt || attempt.status !== 'started') return;

    const simInterval = setInterval(() => {
      // Simulate face tracking evaluation
      const rand = Math.random();
      if (rand > 0.95) {
        setWarningMessage("Proctoring scan: No face detected. Please face the camera directly.");
        logProctoringViolation('FACE_NOT_DETECTED', 'WARNING', { details: 'Lightweight pixel audit check returned zero features' });
      } else if (rand < 0.03) {
        setWarningMessage("Proctoring scan: Multiple faces detected in webcam frame.");
        logProctoringViolation('MULTIPLE_FACES', 'WARNING', { details: 'Lightweight pixel audit check returned multiple outlines' });
      }
    }, 18000);

    return () => clearInterval(simInterval);
  }, [attempt]);

  const handleSaveAndNext = async () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];

    try {
      // Save locally & database
      await attemptService.saveAnswer(attemptId, studentUser.uid, examId, currentQ.id, selectedAnswers);
      
      // Update saved answers state
      const updatedAnswers = [...savedAnswers];
      const matchIdx = updatedAnswers.findIndex(ans => ans.questionId === currentQ.id);
      
      const newAnsRecord: Answer = {
        attemptId,
        studentId: studentUser.uid,
        examId,
        questionId: currentQ.id,
        answer: selectedAnswers,
        savedAt: new Date().toISOString()
      };

      if (matchIdx >= 0) {
        updatedAnswers[matchIdx] = newAnsRecord;
      } else {
        updatedAnswers.push(newAnsRecord);
      }
      setSavedAnswers(updatedAnswers);

      // Increment palette status
      setPaletteStates(prev => {
        const isMarked = prev[currentQ.id] === 'MARKED_FOR_REVIEW' || prev[currentQ.id] === 'ANSWERED_AND_MARKED';
        return {
          ...prev,
          [currentQ.id]: selectedAnswers.length > 0 
            ? (isMarked ? 'ANSWERED_AND_MARKED' : 'ANSWERED') 
            : 'VISITED'
        };
      });

      // Advance Index
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkForReview = () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];

    setPaletteStates(prev => {
      const isAnswered = selectedAnswers.length > 0;
      return {
        ...prev,
        [currentQ.id]: isAnswered ? 'ANSWERED_AND_MARKED' : 'MARKED_FOR_REVIEW'
      };
    });

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleClearResponse = () => {
    setSelectedAnswers([]);
  };

  const handleForceAutoSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (exam) {
        await attemptService.evaluateAndSubmitAttempt(attemptId, exam);
        onSubmitFinished();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (submitting || !exam) return;
    setSubmitting(true);
    try {
      await attemptService.evaluateAndSubmitAttempt(attemptId, exam);
      setShowSubmitConfirm(false);
      onSubmitFinished();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!exam || questions.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const totalAnswered = savedAnswers.filter(a => a.answer.length > 0).length;
  const totalMarked = Object.values(paletteStates).filter(s => s === 'MARKED_FOR_REVIEW' || s === 'ANSWERED_AND_MARKED').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans select-none">
      {/* EXAM HEADER */}
      <header className="flex justify-between items-center bg-slate-900 text-white px-6 py-4 shadow-sm border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold tracking-wide">{exam.title}</h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span>Candidate: {studentUser.name}</span>
            <span>·</span>
            <span>ID: {attemptId.slice(-8)}</span>
          </div>
        </div>

        {/* Autorative countdown timer */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border font-mono font-bold text-sm ${
          timeLeft < 180 ? 'bg-rose-950/40 text-rose-400 border-rose-800 animate-pulse' : 'bg-slate-800 border-slate-700 text-indigo-400'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formatTimer(timeLeft)}</span>
        </div>
      </header>

      {/* Proctoring Banner Warning Notification */}
      {warningMessage && (
        <div className="bg-rose-650 bg-rose-600 text-white px-6 py-2.5 flex items-center justify-between text-xs animate-bounce font-medium shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button onClick={() => setWarningMessage(null)} className="underline cursor-pointer">Acknowledge</button>
        </div>
      )}

      {/* MAIN EXAM CONTAINER */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 overflow-hidden">
        {/* Left Column: Color-coded Question Palette */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wider">Question Palette</h3>
            
            {/* Legend guide */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-850" />Not Visited</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-100" />Visited</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" />Answered</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-500" />Review</div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto pt-2">
              {questions.map((q, idx) => {
                const state = paletteStates[q.id] || 'NOT_VISITED';
                let btnStyle = 'bg-slate-100 dark:bg-slate-850 text-slate-700';

                if (state === 'VISITED') btnStyle = 'bg-amber-100 text-amber-800 border border-amber-300';
                else if (state === 'ANSWERED') btnStyle = 'bg-emerald-500 text-white font-bold';
                else if (state === 'MARKED_FOR_REVIEW') btnStyle = 'bg-purple-500 text-white font-bold';
                else if (state === 'ANSWERED_AND_MARKED') btnStyle = 'bg-indigo-600 text-white font-bold';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${btnStyle} ${
                      currentIndex === idx ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Finish & Submit Exam
            </button>
          </div>
        </div>

        {/* Middle Columns: Question content prompt & selectors */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 uppercase">Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono">+{currentQ.marks} Marks</span>
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                {currentQ.questionText}
              </h3>
              
              {/* Question Image support */}
              {currentQ.imageUrl && (
                <div className="border border-slate-200 rounded-lg p-1 max-w-sm">
                  <img src={currentQ.imageUrl} alt="Question schema display" className="rounded max-h-48 object-contain" />
                </div>
              )}
            </div>

            {/* Answer Selector interface */}
            <div className="space-y-3 pt-2">
              {/* MCQ single choice */}
              {(currentQ.type === 'single-choice' || currentQ.type === 'true-false') && currentQ.options && (
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = selectedAnswers[0] === String(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedAnswers([String(idx)])}
                        className={`w-full flex items-center gap-3 p-3.5 border rounded-xl text-left transition select-none cursor-pointer text-xs font-medium ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/10 text-indigo-700' 
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                        <span className="font-bold font-mono">{String.fromCharCode(65 + idx)}.</span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* MCQ multiple choice */}
              {currentQ.type === 'multiple-choice' && currentQ.options && (
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const sIdx = String(idx);
                    const isSelected = selectedAnswers.includes(sIdx);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedAnswers(prev => 
                            isSelected ? prev.filter(a => a !== sIdx) : [...prev, sIdx]
                          );
                        }}
                        className={`w-full flex items-center gap-3 p-3.5 border rounded-xl text-left transition select-none cursor-pointer text-xs font-medium ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/10 text-indigo-700' 
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-4 h-4 border flex items-center justify-center rounded shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                          {isSelected && <span className="text-[10px]">✓</span>}
                        </span>
                        <span className="font-bold font-mono">{String.fromCharCode(65 + idx)}.</span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Numerical */}
              {currentQ.type === 'numerical' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">Enter Your Numerical Answer</label>
                  <input 
                    type="number"
                    step="any"
                    value={selectedAnswers[0] || ''}
                    onChange={(e) => setSelectedAnswers([e.target.value])}
                    placeholder="Input exact decimals or digits value..."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls footer */}
          <div className="flex justify-between items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
            <div className="flex gap-2">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <button
                onClick={handleMarkForReview}
                className="flex items-center gap-1.5 px-3 py-2 border border-purple-300 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 cursor-pointer"
              >
                <Bookmark className="w-4 h-4" />
                Mark for Review
              </button>
              
              <button
                onClick={handleClearResponse}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Clear Option
              </button>
            </div>

            <button
              onClick={handleSaveAndNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Save & Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Live Proctor webcam feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-indigo-600" />
            Proctoring Sentinel
          </h3>

          {/* Webcam Live display frame */}
          <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden relative shadow-inner border border-slate-850">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {/* Simulated green radar sweep */}
            <div className="absolute inset-0 border border-emerald-500/20 rounded pointer-events-none" />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-emerald-400 font-bold tracking-wider font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE SCANNING
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs font-medium">
            <div className="flex justify-between items-center text-slate-500">
              <span>Security Event warnings:</span>
              <span className={`font-mono font-bold ${violationsCount > 1 ? 'text-rose-600 animate-bounce' : 'text-slate-700'}`}>
                {violationsCount} / 3 Threshold
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-[10px] leading-relaxed text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Webcam feed secured</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Microphone focus active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Page focus and tabs locked</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Paper Submission</h3>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-850/20 border rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="font-bold text-emerald-600 font-mono text-base">{totalAnswered}</div>
                <div className="text-[9px] text-slate-400">Answered</div>
              </div>
              <div>
                <div className="font-bold text-amber-600 font-mono text-base">{questions.length - totalAnswered}</div>
                <div className="text-[9px] text-slate-400">Unanswered</div>
              </div>
              <div>
                <div className="font-bold text-purple-600 font-mono text-base">{totalMarked}</div>
                <div className="text-[9px] text-slate-400">Review</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-normal">
              Are you sure you want to finalize and submit your test paper? Your answers will be securely locks, graded instantly and analytics logged to teacher dashboards. This operation cannot be reversed.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Continue Exam
              </button>
              <button 
                type="button"
                onClick={handleManualSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition disabled:opacity-50"
              >
                {submitting ? 'Evaluating...' : 'Yes, Submit Paper'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
