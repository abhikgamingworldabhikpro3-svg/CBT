import React, { useState, useEffect } from 'react';
import { Exam, Subject } from '../../types';
import { examService } from '../../services/examService';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { Shield, Clock, FileText, Camera, Mic, Maximize, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ExamInstructionsProps {
  examId: string;
  onStartExam: () => void;
  onBack: () => void;
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({ examId, onStartExam, onBack }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  
  // Permissions states
  const [cameraPermission, setCameraPermission] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [micPermission, setMicPermission] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [fullscreenPermission, setFullscreenPermission] = useState<'checking' | 'granted' | 'denied'>('checking');
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'exams', examId), async (snap) => {
      if (snap.exists()) {
        const eData = snap.data() as Exam;
        setExam(eData);

        // Fetch subject
        const subSnap = doc(db, 'subjects', eData.subjectId);
        onSnapshot(subSnap, (sSnap) => {
          if (sSnap.exists()) {
            setSubject(sSnap.data() as Subject);
          }
        });
      }
    });

    // Check media streams
    checkMediaPermissions();

    // Check fullscreen support
    if (document.fullscreenEnabled) {
      setFullscreenPermission('granted');
    } else {
      setFullscreenPermission('denied');
    }

    return () => unsub();
  }, [examId]);

  const checkMediaPermissions = async () => {
    try {
      // Prompt camera permission
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermission('granted');
      camStream.getTracks().forEach(track => track.stop()); // Clean up immediately!
    } catch (err) {
      setCameraPermission('denied');
    }

    try {
      // Prompt mic permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      micStream.getTracks().forEach(track => track.stop()); // Clean up immediately!
    } catch (err) {
      setMicPermission('denied');
    }
  };

  const handleRequestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setFullscreenPermission('granted');
      }
    } catch (err) {
      setFullscreenPermission('denied');
    }
  };

  if (!exam) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const allPermissionsGranted = cameraPermission === 'granted' && micPermission === 'granted';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{subject?.name}</span>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{exam.title}</h2>
        <p className="text-sm text-slate-500 mt-1">Pre-examination setup and security requirements audit.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: instructions */}
        <div className="md:col-span-2 space-y-6">
          {/* Summary Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <Clock className="w-5 h-5 text-indigo-600 mx-auto" />
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">{exam.duration}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight">Minutes</div>
            </div>
            <div className="space-y-1">
              <FileText className="w-5 h-5 text-indigo-600 mx-auto" />
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">{exam.questionIds.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight">Questions</div>
            </div>
            <div className="space-y-1">
              <Shield className="w-5 h-5 text-indigo-600 mx-auto" />
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">{exam.totalMarks}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight">Total Marks</div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">General Examination Rules</h3>
            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
              {exam.instructions || `Please read the following instructions carefully before starting:
              1. Ensure you are in a quiet, private, and well-lit environment.
              2. Do not exit fullscreen mode or switch browser tabs once the examination is launched. Doing so triggers a SECURITY_EXIT warning.
              3. The camera and microphone are required for proctoring logs.
              4. Answers are saved automatically in real-time. If connection fails, cached answers will sync immediately upon internet restabilization.`}
            </p>
          </div>
        </div>

        {/* Right column: Permissions Checklist */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Proctoring Check</h3>

            {/* Checklist */}
            <div className="space-y-3">
              {/* Camera */}
              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <Camera className={`w-4 h-4 ${cameraPermission === 'granted' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Webcam Monitor</span>
                </div>
                {cameraPermission === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">✓ Ready</span>
                ) : (
                  <button onClick={checkMediaPermissions} className="text-[10px] font-bold text-indigo-600 hover:underline">Enable</button>
                )}
              </div>

              {/* Mic */}
              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <Mic className={`w-4 h-4 ${micPermission === 'granted' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Audio Monitor</span>
                </div>
                {micPermission === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">✓ Ready</span>
                ) : (
                  <button onClick={checkMediaPermissions} className="text-[10px] font-bold text-indigo-600 hover:underline">Enable</button>
                )}
              </div>

              {/* Fullscreen */}
              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <Maximize className={`w-4 h-4 ${fullscreenPermission === 'granted' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fullscreen Capture</span>
                </div>
                {fullscreenPermission === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">✓ Ready</span>
                ) : (
                  <button onClick={handleRequestFullscreen} className="text-[10px] font-bold text-indigo-600 hover:underline">Lock</button>
                )}
              </div>
            </div>

            {/* Error advice */}
            {!allPermissionsGranted && (
              <div className="p-3 bg-amber-50 rounded-xl flex gap-2 text-amber-800 border border-amber-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed">
                  <strong>Permission Denied:</strong> This exam requires camera and microphone permissions to perform client-side fraud logs. Click Enable to grant access.
                </p>
              </div>
            )}
          </div>

          {/* Guidelines agreement checkbox */}
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-1 select-none">
              <input 
                type="checkbox" 
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 text-indigo-600 cursor-pointer mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400 leading-normal cursor-pointer">
                I have read, understood, and agreed to abide by the proctoring rules, and will keep the tab and camera active.
              </label>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onBack}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Back to Dashboard
              </button>
              
              <button
                disabled={!allPermissionsGranted || !acceptedTerms}
                onClick={onStartExam}
                className="flex-1 py-2.5 bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Launch Examination
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
