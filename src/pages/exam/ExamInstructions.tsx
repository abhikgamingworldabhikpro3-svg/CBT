import React, { useState, useEffect } from 'react';
import { examService } from '../../services/examService';
import { Exam } from '../../types';
import { ShieldCheck, Video, Mic, Expand, AlertCircle, Play } from 'lucide-react';

interface ExamInstructionsProps {
  examId: string;
  onStartExam: () => void;
  onBack: () => void;
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({ examId, onStartExam, onBack }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Permission checks
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [checkingDevices, setCheckingDevices] = useState(false);

  useEffect(() => {
    examService.getExam(examId)
      .then(res => {
        setExam(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [examId]);

  const runPermissionChecks = async () => {
    setCheckingDevices(true);
    try {
      // 1. Camera check
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (camStream) {
        setCameraReady(true);
        // Clean up stream immediately
        camStream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      console.warn("Camera check failed:", e);
      setCameraReady(false);
    }

    try {
      // 2. Microphone check
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (micStream) {
        setMicReady(true);
        // Clean up stream immediately
        micStream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      console.warn("Microphone check failed:", e);
      setMicReady(false);
    }

    // 3. Fullscreen check (request fullscreen dynamically upon Start)
    setFullscreenReady(true);
    setCheckingDevices(false);
  };

  const handleLaunchCBT = async () => {
    if (!cameraReady || !micReady) {
      alert("Please authorize Camera and Microphone device access before launching the secure examination room.");
      return;
    }
    
    // Request Fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request rejected:", err);
    }

    onStartExam();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-slate-400 font-mono text-xs">
        Loading exam packet...
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-6 text-center text-xs border rounded-xl text-red-500 font-semibold max-w-md mx-auto mt-12">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <span>Exam packet not found or access expired.</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 font-sans text-slate-900 dark:text-slate-100 space-y-6">
      
      {/* Header instructions block */}
      <div className="rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">SUBJECT ASSESSMENTS Portal</span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{exam.title}</h2>
          <p className="text-xs text-slate-400 font-mono">Exam Limit: {exam.duration} minutes · Total Weight: {exam.totalMarks} Marks</p>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4 leading-relaxed">
          <p className="font-bold text-slate-850 dark:text-white text-[13px]">Pre-Exam Safeguards & Guidelines:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Device Surveillance:</strong> Your webcam feed is analyzed locally. Any face loss or multiple face intrusions are logged.</li>
            <li><strong>Audio Event Logging:</strong> Noise/audio fluctuations are evaluated locally. Avoid talking or audio disruptions.</li>
            <li><strong>Tab Lockout Surveillance:</strong> Exiting fullscreen mode, switching tabs, or losing window focus is logged as a <strong>surveillance incident</strong>.</li>
            <li><strong>Automatic Submit:</strong> Upon time limit expiration, your saved answers are automatically evaluated and submitted.</li>
          </ul>
        </div>
      </div>

      {/* Proctoring Device Clearance */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">Device Clearance Desk</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 flex flex-col justify-between h-28">
            <Video className={`h-5 w-5 ${cameraReady ? 'text-emerald-500' : 'text-slate-400 animate-pulse'}`} />
            <div>
              <span className="block font-bold">Webcam Sensor</span>
              <span className={`text-[10px] font-semibold ${cameraReady ? 'text-emerald-600' : 'text-slate-400 italic'}`}>
                {cameraReady ? '✓ Sensor Ready' : 'Permission Pending'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 flex flex-col justify-between h-28">
            <Mic className={`h-5 w-5 ${micReady ? 'text-emerald-500' : 'text-slate-400 animate-pulse'}`} />
            <div>
              <span className="block font-bold">Microphone Probe</span>
              <span className={`text-[10px] font-semibold ${micReady ? 'text-emerald-600' : 'text-slate-400 italic'}`}>
                {micReady ? '✓ Probe Ready' : 'Permission Pending'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 flex flex-col justify-between h-28">
            <Expand className="h-5 w-5 text-indigo-500" />
            <div>
              <span className="block font-bold">Fullscreen Lock</span>
              <span className="text-[10px] font-semibold text-indigo-600">Trigger on Launch</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center pt-2">
          <button
            onClick={runPermissionChecks}
            disabled={checkingDevices}
            className="rounded-lg border border-indigo-200 px-4 py-2 font-semibold text-indigo-600 hover:bg-indigo-50 cursor-pointer disabled:opacity-50 text-xs"
          >
            {checkingDevices ? 'Initializing Sensors...' : 'Run Diagnostics'}
          </button>

          {(cameraReady && micReady) && (
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="accent-indigo-600 h-4 w-4 cursor-pointer"
              />
              <span>I confirm reading the instructions and authorizing sensors.</span>
            </label>
          )}
        </div>
      </div>

      {/* Launcher Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-slate-200 dark:border-slate-800 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
        >
          Back to Roster
        </button>

        <button
          onClick={handleLaunchCBT}
          disabled={!cameraReady || !micReady || !acceptTerms}
          className="rounded-lg bg-indigo-600 text-white font-semibold px-6 py-2.5 shadow-md hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 text-xs"
        >
          <Play className="h-3 w-3 fill-white" />
          <span>Launch Secure CBT Room</span>
        </button>
      </div>

    </div>
  );
};
