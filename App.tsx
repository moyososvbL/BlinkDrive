import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Crosshair, 
  Settings, 
  User, 
  Mic, 
  MicOff, 
  Eye, 
  Power,
  Zap,
  MousePointer2,
  Maximize2,
  CheckCircle2,
  Play,
  Download,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  FileCode,
  X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from './components/ui/GlassCard';
import { DwellButton } from './components/ui/DwellButton';
import { CameraFeed } from './components/CameraFeed';
import { GazeCursor } from './components/GazeCursor';
import { voiceService } from './services/voiceService';
import { eyeTrackingService } from './services/eyeTrackingService';
import { UserSettings, ViewState } from './types';

// Mock Data for Charts
const PERFORMANCE_DATA = [
  { time: '10:00', accuracy: 85 },
  { time: '10:05', accuracy: 88 },
  { time: '10:10', accuracy: 92 },
  { time: '10:15', accuracy: 90 },
  { time: '10:20', accuracy: 95 },
  { time: '10:25', accuracy: 94 },
];

// Simple Toast Notification Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bg = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className={`fixed top-4 right-4 z-[10000] ${bg} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5`}>
            {type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <span className="font-medium">{message}</span>
        </div>
    );
};

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
        const saved = localStorage.getItem('eyetrack_settings');
        return saved ? JSON.parse(saved) : {
            dwellTime: 1200,
            sensitivity: 7,
            smoothing: 5,
            theme: 'dark',
            isTrackingEnabled: false,
            isVoiceEnabled: false,
            showGazePath: true
        };
    } catch (e) {
        return {
            dwellTime: 1200,
            sensitivity: 7,
            smoothing: 5,
            theme: 'dark',
            isTrackingEnabled: false,
            isVoiceEnabled: false,
            showGazePath: true
        };
    }
  });

  // Persist settings
  useEffect(() => {
      localStorage.setItem('eyetrack_settings', JSON.stringify(settings));
  }, [settings]);
  
  // Real-time gaze coordinates
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // Advanced Features State
  const [scrollAction, setScrollAction] = useState<'up' | 'down' | null>(null);
  const [precisionMode, setPrecisionMode] = useState(false);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  // New Auto-Calibration State
  const [calibState, setCalibState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [activePointIndex, setActivePointIndex] = useState(0);
  const [calibProgress, setCalibProgress] = useState(0);

  // Refs for accessing state inside voice callbacks without re-triggering effects
  const gazeRef = useRef(gaze);
  const viewRef = useRef(view);
  const precisionModeRef = useRef(precisionMode);
  const lastCommandTime = useRef(0);

  // Sync refs
  useEffect(() => { gazeRef.current = gaze; }, [gaze]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { precisionModeRef.current = precisionMode; }, [precisionMode]);

  // Initialize Tracking
  useEffect(() => {
    const initTracking = async () => {
      const hasPerms = await eyeTrackingService.checkCameraPermission();
      if (!hasPerms) {
          setToast({ msg: "Camera access denied. Please enable camera.", type: "error" });
          return;
      }
      
      try {
        await eyeTrackingService.init();
        eyeTrackingService.setGazeListener((x, y) => {
          // Only update UI if tracking is explicitly enabled AND we aren't calibrating
          // Access calibState from state directly works here as this listener is permanent
          if (settings.isTrackingEnabled) {
              setGaze({ x, y });
              handleSmartFeatures(x, y);
          }
        });
      } catch (e) {
        setToast({ msg: "Failed to start tracking. Check console.", type: "error" });
      }
    };
    initTracking();

    return () => {
      eyeTrackingService.pause();
    };
  }, [settings.isTrackingEnabled]); // Only re-run if tracking toggle changes

  // Smart Features Logic (Scroll & Precision)
  const scrollRef = useRef<number | null>(null);
  const handleSmartFeatures = (x: number, y: number) => {
      const h = window.innerHeight;
      const scrollThreshold = 120; // px from edge

      // Gaze Scroll Logic (skip if calibrating)
      if (document.body.getAttribute('data-calibrating') === 'true') return;

      if (y > h - scrollThreshold) {
          setScrollAction('down');
          if (!scrollRef.current) {
              const scrollLoop = () => {
                  window.scrollBy({ top: 5, behavior: 'auto' }); // Smooth scroll
                  scrollRef.current = requestAnimationFrame(scrollLoop);
              };
              scrollRef.current = requestAnimationFrame(scrollLoop);
          }
      } else if (y < scrollThreshold) {
          setScrollAction('up');
          if (!scrollRef.current) {
              const scrollLoop = () => {
                  window.scrollBy({ top: -5, behavior: 'auto' });
                  scrollRef.current = requestAnimationFrame(scrollLoop);
              };
              scrollRef.current = requestAnimationFrame(scrollLoop);
          }
      } else {
          setScrollAction(null);
          if (scrollRef.current) {
              cancelAnimationFrame(scrollRef.current);
              scrollRef.current = null;
          }
      }
  };

  // Handle Play/Pause
  useEffect(() => {
    if (settings.isTrackingEnabled) {
      eyeTrackingService.resume();
    } else {
      eyeTrackingService.pause();
    }
  }, [settings.isTrackingEnabled]);

  // Voice Command Listener
  // IMPORTANT: We use refs here to avoid adding rapidly changing state (like gaze) to the dependency array
  useEffect(() => {
    if (settings.isVoiceEnabled) {
      voiceService.start((transcript) => {
        // PREVENTION LOGIC:
        if (Date.now() - lastCommandTime.current < 2000) return; // Cooldown
        if (window.speechSynthesis.speaking) return; // Don't listen while speaking

        const cmd = transcript.toLowerCase();
        console.log('Processed Command:', cmd);
        
        // Calibration Interrupt
        if (document.body.getAttribute('data-calibrating') === 'true') {
           if (cmd.includes('stop') || cmd.includes('cancel')) {
             setCalibState('idle');
             document.body.removeAttribute('data-calibrating');
             eyeTrackingService.pause();
             const synth = window.speechSynthesis;
             const utter = new SpeechSynthesisUtterance("Calibration cancelled");
             synth.speak(utter);
           }
           return; // Ignore other commands during calibration
        }
        
        let feedback = "";
        const currentView = viewRef.current;
        const currentPrecision = precisionModeRef.current;

        // Navigation (Phrases distinct from commands to avoid loops)
        if (cmd.includes('dashboard') || cmd.includes('home')) {
            setView('dashboard');
            feedback = "Main view active";
        }
        else if (cmd.includes('calibrate') || cmd.includes('calibration')) {
            setView('calibration');
            feedback = "Alignment view active";
        }
        else if (cmd.includes('settings') || cmd.includes('configure')) {
            setView('settings');
            feedback = "Settings loaded";
        }
        
        // Actions
        else if (cmd.includes('start tracking') || cmd.includes('enable tracking')) {
           setSettings(s => ({...s, isTrackingEnabled: true}));
           feedback = "Tracker active";
        }
        else if (cmd.includes('stop tracking') || cmd.includes('pause')) {
           setSettings(s => ({...s, isTrackingEnabled: false}));
           feedback = "Paused";
        }
        else if (cmd.includes('start') && currentView === 'calibration') {
            startAutoCalibration();
            // No feedback here to avoid distracting user
        }
        // Advanced Features
        else if (cmd.includes('precision') || cmd.includes('slow mode')) {
            setPrecisionMode(!currentPrecision);
            feedback = !currentPrecision ? "Precision active" : "Normal speed";
        }
        else if (cmd.includes('reset')) {
            handleResetCalibration();
            feedback = "Data reset";
        }
        // CLICK COMMAND
        else if (cmd.includes('click') || cmd.includes('select')) {
            const currentGaze = gazeRef.current;
            const el = document.elementFromPoint(currentGaze.x, currentGaze.y);
            if (el) {
                // Robust click simulation for all Element types (including SVG)
                // We use dispatchEvent to ensure it works even if .click() is missing on the element prototype
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: currentGaze.x,
                    clientY: currentGaze.y
                });
                el.dispatchEvent(clickEvent);
                
                // For HTML elements (inputs, buttons), focus them and try native click if dispatch didn't trigger
                if (el instanceof HTMLElement) {
                    el.focus();
                    if (typeof el.click === 'function') {
                        try { el.click(); } catch(e) { console.warn('Native click failed', e); }
                    }
                }
                
                feedback = "Clicked";
                // Visual ripple
                const ripple = document.createElement('div');
                ripple.style.position = 'fixed';
                ripple.style.left = `${currentGaze.x}px`;
                ripple.style.top = `${currentGaze.y}px`;
                ripple.style.width = '20px';
                ripple.style.height = '20px';
                ripple.style.background = 'rgba(255, 255, 255, 0.8)';
                ripple.style.borderRadius = '50%';
                ripple.style.transform = 'translate(-50%, -50%)';
                ripple.style.zIndex = '10000';
                ripple.className = 'animate-ping';
                document.body.appendChild(ripple);
                setTimeout(() => ripple.remove(), 500);
            }
        }

        // Voice Feedback Handling
        if (feedback) {
            lastCommandTime.current = Date.now();
            setToast({ msg: feedback, type: 'info' });
            
            // Soft Mute: Stop listening while speaking
            voiceService.setIgnoreInput(true);

            const synth = window.speechSynthesis;
            synth.cancel(); 
            const utter = new SpeechSynthesisUtterance(feedback);
            utter.rate = 1.2;
            
            utter.onend = () => {
                // Resume listening after speech ends
                voiceService.setIgnoreInput(false);
            };
            
            // Safety timeout in case onend doesn't fire
            setTimeout(() => voiceService.setIgnoreInput(false), 3000);

            synth.speak(utter);
        }
      });
    } else {
      voiceService.stop();
    }
  }, [settings.isVoiceEnabled]); // Only re-run if enable/disable toggle changes

  const toggleTracking = () => {
    setSettings(prev => ({ ...prev, isTrackingEnabled: !prev.isTrackingEnabled }));
  };

  // --- AUTOMATIC HANDS-FREE CALIBRATION LOGIC ---
  const CALIB_POINTS = [
    { x: 10, y: 10 },    // Top Left
    { x: 50, y: 10 },    // Top Mid
    { x: 90, y: 10 },    // Top Right
    { x: 10, y: 50 },    // Mid Left
    { x: 50, y: 50 },    // Center
    { x: 90, y: 50 },    // Mid Right
    { x: 10, y: 90 },    // Bot Left
    { x: 50, y: 90 },    // Bot Mid
    { x: 90, y: 90 },    // Bot Right
  ];

  const startAutoCalibration = () => {
    // Stop voice to ensure silence during calibration
    voiceService.setIgnoreInput(true);
    
    eyeTrackingService.clearCalibration();
    eyeTrackingService.resume(); 
    setSettings(s => ({ ...s, isTrackingEnabled: true })); 
    setCalibState('running');
    setActivePointIndex(0);
    setCalibProgress(0);
    document.body.setAttribute('data-calibrating', 'true');
  };

  // The sequencer for calibration
  useEffect(() => {
    if (calibState !== 'running') {
        document.body.removeAttribute('data-calibrating');
        return;
    }

    let progressInterval: number;
    let pointTimeout: number;

    const settleTime = 800;
    const recordTime = 1200;
    
    const startTime = Date.now();
    progressInterval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const totalDuration = settleTime + recordTime;
        const p = Math.min((elapsed / totalDuration) * 100, 100);
        setCalibProgress(p);

        if (elapsed > settleTime) {
            const pt = CALIB_POINTS[activePointIndex];
            const xPx = (pt.x / 100) * window.innerWidth;
            const yPx = (pt.y / 100) * window.innerHeight;
            eyeTrackingService.recordCalibrationPoint(xPx, yPx);
        }
    }, 50);

    pointTimeout = window.setTimeout(() => {
        clearInterval(progressInterval);
        
        if (activePointIndex < CALIB_POINTS.length - 1) {
            setActivePointIndex(prev => prev + 1);
            setCalibProgress(0);
        } else {
            setCalibState('completed');
            setCalibProgress(100);
            
            // Re-enable voice
            voiceService.setIgnoreInput(false);
            
            setToast({ msg: "Calibration Successful!", type: "success" });
            const synth = window.speechSynthesis;
            const utter = new SpeechSynthesisUtterance("Calibration complete");
            synth.speak(utter);
        }
    }, settleTime + recordTime);

    return () => {
        clearInterval(progressInterval);
        clearTimeout(pointTimeout);
    };
  }, [calibState, activePointIndex]);

  const handleResetCalibration = () => {
      eyeTrackingService.clearCalibration();
      setToast({ msg: "Calibration data reset.", type: "info" });
  };

  const handleDownloadManifest = () => {
      // Updated Manifest for Sandbox architecture
      const manifest = {
        "manifest_version": 3,
        "name": "EyeTrack Assist",
        "version": "1.1",
        "description": "Webcam eye-tracking accessibility tool.",
        "permissions": ["activeTab", "scripting", "storage"],
        "action": {
          "default_popup": "wrapper.html",
          "default_title": "EyeTrack Assist"
        },
        "sandbox": {
            "pages": ["index.html"]
        },
        "content_security_policy": {
          "extension_pages": "script-src 'self'; object-src 'self'",
          "sandbox": "sandbox allow-scripts allow-forms allow-popups allow-modals allow-same-origin; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://webgazer.cs.brown.edu https://cdn.tailwindcss.com https://aistudiocdn.com; child-src 'self';"
        }
      };
      
      const blob = new Blob([JSON.stringify(manifest, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "manifest.json";
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "Manifest downloaded. Don't forget wrapper.html!", type: "success" });
  };

  const handleDownloadWrapper = () => {
      const content = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>EyeTrack Assist Wrapper</title>
    <style>
      body, html { margin: 0; padding: 0; width: 800px; height: 600px; overflow: hidden; background: #0A0A0A; }
      iframe { width: 100%; height: 100%; border: none; display: block; }
    </style>
  </head>
  <body>
    <iframe src="index.html" allow="camera; microphone"></iframe>
  </body>
</html>`;
      const blob = new Blob([content], {type: "text/html"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "wrapper.html";
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "Wrapper.html downloaded!", type: "success" });
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="col-span-1 md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={120} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Tracking Status</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-3 h-3 rounded-full ${settings.isTrackingEnabled ? 'bg-accent shadow-[0_0_10px_#10B981]' : 'bg-red-500'}`} />
            <span className="text-gray-300 font-mono">{settings.isTrackingEnabled ? 'ACTIVE - Monitoring Gaze' : 'PAUSED - Standby'}</span>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <DwellButton 
              onClick={toggleTracking}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors ${settings.isTrackingEnabled ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
              activeColor={settings.isTrackingEnabled ? '#EF4444' : '#3B82F6'}
            >
              <Power size={20} />
              {settings.isTrackingEnabled ? 'Stop Tracking' : 'Start Tracking'}
            </DwellButton>
            
            <DwellButton 
              onClick={() => {
                setView('calibration');
              }}
              className="px-6 py-3 rounded-xl bg-surface/50 text-white font-semibold flex items-center gap-2 hover:bg-surface/70"
            >
              <Crosshair size={20} />
              Recalibrate
            </DwellButton>

            <button
                onClick={() => setPrecisionMode(!precisionMode)}
                className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${precisionMode ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'border-white/10 hover:bg-white/5'}`}
            >
                <Crosshair size={16} />
                {precisionMode ? 'Precision On' : 'Precision Off'}
            </button>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col justify-center items-center text-center">
            <div className="mb-2 p-3 bg-primary/10 rounded-full text-primary">
                <MousePointer2 size={32} />
            </div>
            <h3 className="text-3xl font-bold text-white">1,240</h3>
            <p className="text-sm text-gray-400">Total Clicks (Day)</p>
            <div className="mt-4 text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                +12% vs avg
            </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="col-span-1 md:col-span-2 h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Gaze Accuracy (Last Hour)</h3>
                <span className="text-xs text-gray-400 bg-surface/50 px-2 py-1 rounded border border-white/5">Real-time</span>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={PERFORMANCE_DATA}>
                        <defs>
                            <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 12}} />
                        <YAxis stroke="#64748b" tick={{fontSize: 12}} domain={[80, 100]} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1e293b', borderRadius: '8px' }}
                            itemStyle={{ color: '#3B82F6' }}
                        />
                        <Area type="monotone" dataKey="accuracy" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAccuracy)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg">Voice Controls</h3>
             <div className="flex items-center justify-between p-3 bg-surface/50 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${settings.isVoiceEnabled ? 'bg-accent/20 text-accent animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
                        {settings.isVoiceEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                    </div>
                    <div>
                        <p className="text-sm font-medium">Voice Assistant</p>
                        <p className="text-xs text-gray-400">{settings.isVoiceEnabled ? 'Listening...' : 'Disabled'}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setSettings(s => ({...s, isVoiceEnabled: !s.isVoiceEnabled}))}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.isVoiceEnabled ? 'bg-primary' : 'bg-gray-700'}`}
                >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.isVoiceEnabled ? 'translate-x-4' : ''}`} />
                </button>
             </div>
             
             <div className="text-xs text-gray-400 space-y-2 mt-2">
                <p>Try saying:</p>
                <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10">"Dashboard"</span>
                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10">"Select"</span>
                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10">"Precision"</span>
                </div>
             </div>
        </GlassCard>
      </div>
    </div>
  );

  const renderCalibration = () => {
    return (
    <div className="h-full w-full flex flex-col items-center justify-center relative animate-in zoom-in-95 duration-500">
        <div className="absolute top-4 left-4 z-20 flex gap-4">
            <GlassCard className="py-2 px-4">
                <button onClick={() => setView('dashboard')} className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
                    ← Back
                </button>
            </GlassCard>
        </div>

        {calibState === 'idle' && (
            <div className="text-center z-10 max-w-lg">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Eye size={40} className="text-primary" />
                </div>
                <h2 className="text-4xl font-bold mb-4">Hands-Free Calibration</h2>
                <p className="text-gray-300 mb-8 text-lg">
                    No clicking required. Just relax and follow the blue circle with your eyes. 
                    It will take about 20 seconds.
                </p>
                
                <DwellButton 
                    onClick={startAutoCalibration}
                    className="mx-auto px-8 py-4 bg-primary text-white rounded-full text-xl font-bold shadow-lg shadow-primary/30 flex items-center gap-3 hover:scale-105 transition-transform"
                >
                    <Play fill="currentColor" />
                    Start Calibration
                </DwellButton>
                <p className="mt-4 text-sm text-gray-500">Or say "Start" if voice is enabled.</p>
            </div>
        )}

        {calibState === 'running' && (
            <div className="fixed inset-0 w-full h-full bg-black/95 z-50 cursor-none">
                 <div 
                    className="absolute transition-all duration-700 ease-in-out"
                    style={{ 
                        left: `${CALIB_POINTS[activePointIndex].x}%`, 
                        top: `${CALIB_POINTS[activePointIndex].y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                 >
                    <div className="relative w-24 h-24 flex items-center justify-center">
                         <svg className="w-full h-full rotate-[-90deg]">
                             <circle cx="50%" cy="50%" r="45%" stroke="#1e293b" strokeWidth="4" fill="transparent" />
                             <circle 
                                cx="50%" cy="50%" r="45%" 
                                stroke="#3B82F6" strokeWidth="4" fill="transparent"
                                strokeDasharray="283"
                                strokeDashoffset={283 - (283 * calibProgress / 100)}
                                strokeLinecap="round"
                                className="transition-all duration-100 ease-linear"
                             />
                         </svg>
                         <div className={`absolute w-6 h-6 bg-white rounded-full shadow-[0_0_20px_#3B82F6] ${calibProgress > 40 ? 'scale-50' : 'scale-100'} transition-transform duration-500`} />
                    </div>
                 </div>

                 <div className="absolute bottom-10 w-full text-center">
                    <p className="text-gray-400 font-mono text-xl">Look at the light... {Math.round(calibProgress)}%</p>
                 </div>
            </div>
        )}

        {calibState === 'completed' && (
            <div className="text-center z-10 animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
                    <CheckCircle2 size={50} />
                </div>
                <h2 className="text-3xl font-bold mb-4">Calibration Complete!</h2>
                <p className="text-gray-400 mb-8">
                    Your eye tracking profile is ready. You can now use gaze to navigate.
                </p>
                <div className="flex gap-4 justify-center">
                    <DwellButton 
                        onClick={() => setView('dashboard')}
                        className="px-8 py-3 bg-surface border border-white/10 rounded-xl font-semibold hover:bg-white/5"
                    >
                        Go to Dashboard
                    </DwellButton>
                    <DwellButton 
                        onClick={startAutoCalibration}
                        className="px-8 py-3 bg-surface/50 border border-white/5 rounded-xl text-gray-400 hover:text-white"
                    >
                        Redo
                    </DwellButton>
                </div>
            </div>
        )}
    </div>
    )
  };

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-10 duration-500 pb-20">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('dashboard')} className="p-2 hover:bg-white/10 rounded-lg">
                <span className="text-xl">←</span>
            </button>
            <h2 className="text-3xl font-bold">Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard>
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                    <Maximize2 size={18} className="text-primary"/> Cursor Dynamics
                </h3>
                
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm text-gray-300">Dwell Time</label>
                            <span className="text-sm font-mono text-primary">{settings.dwellTime}ms</span>
                        </div>
                        <input 
                            type="range" 
                            min="500" 
                            max="3000" 
                            step="100"
                            value={settings.dwellTime}
                            onChange={(e) => setSettings({...settings, dwellTime: parseInt(e.target.value)})}
                            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm text-gray-300">Smoothing Factor</label>
                            <span className="text-sm font-mono text-primary">{settings.smoothing}</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={settings.smoothing}
                            onChange={(e) => setSettings({...settings, smoothing: parseInt(e.target.value)})}
                            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                         <p className="text-xs text-gray-500 mt-1">Higher smoothing reduces jitter but increases latency.</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard>
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                    <Zap size={18} className="text-accent"/> Chrome Extension Setup
                </h3>
                
                <div className="space-y-4">
                     <p className="text-sm text-gray-400">
                        To run this with WebGazer (AI), we use a sandbox architecture. You need both files.
                     </p>
                     
                     <div className="flex gap-2">
                         <button 
                            onClick={handleDownloadManifest}
                            className="flex-1 py-3 bg-surface hover:bg-white/10 border border-white/20 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all text-sm"
                         >
                            <Download size={16} />
                            1. Manifest
                         </button>
                         <button 
                            onClick={handleDownloadWrapper}
                            className="flex-1 py-3 bg-surface hover:bg-white/10 border border-white/20 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all text-sm"
                         >
                            <FileCode size={16} />
                            2. Wrapper
                         </button>
                     </div>

                     <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="font-semibold mb-2 text-white">Install Instructions:</h4>
                        <ol className="list-decimal list-inside text-xs text-gray-400 space-y-1">
                            <li>Download both files above.</li>
                            <li>Place them in your build folder (with index.html).</li>
                            <li>Open <code className="bg-black px-1 rounded">chrome://extensions</code></li>
                            <li>"Load Unpacked" -> Select folder.</li>
                        </ol>
                     </div>
                </div>
            </GlassCard>
            
            <GlassCard>
                <h3 className="font-semibold mb-4 text-red-400 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Danger Zone
                </h3>
                <button 
                    onClick={handleResetCalibration}
                    className="w-full py-3 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw size={18} />
                    Reset Calibration Data
                </button>
            </GlassCard>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 flex relative overflow-hidden font-sans">
      
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Expanded Video Modal */}
      {isVideoExpanded && (
        <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
             <div className="absolute top-4 right-4 z-50">
                 <button 
                    onClick={() => setIsVideoExpanded(false)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                 >
                    <X size={32} />
                 </button>
             </div>

             <h2 className="text-white text-2xl font-bold mb-4">Camera Check</h2>
             <p className="text-gray-400 mb-6 text-center max-w-lg">
                Ensure your face is well-lit and centered in the guides below. 
                Avoid bright windows behind you.
             </p>

             <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/20">
                <CameraFeed isActive={settings.isTrackingEnabled} isHighRes={true} />

                 {/* Face Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-1/2 h-1/2 stroke-white stroke-[0.5] fill-none dashed drop-shadow-md">
                         <ellipse cx="100" cy="100" rx="40" ry="55" strokeDasharray="4" />
                         <line x1="100" y1="45" x2="100" y2="155" strokeDasharray="4" />
                         <line x1="60" y1="90" x2="140" y2="90" strokeDasharray="4" />
                    </svg>
                </div>
             </div>

             <div className="mt-8 flex gap-4">
                 <button
                    onClick={() => {
                        setIsVideoExpanded(false);
                        setView('calibration');
                    }}
                    className="px-6 py-3 bg-primary hover:bg-blue-600 rounded-full font-semibold flex items-center gap-2 transition-colors"
                 >
                    <Crosshair size={20} />
                    Go to Calibration
                 </button>
             </div>
        </div>
      )}

      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      <GazeCursor 
        enabled={settings.isTrackingEnabled} 
        smoothing={settings.smoothing}
        isPrecisionMode={precisionMode}
        x={gaze.x}
        y={gaze.y}
      />

      {scrollAction === 'up' && (
          <div className="fixed top-0 left-0 w-full h-16 bg-gradient-to-b from-primary/50 to-transparent z-[9990] flex items-start justify-center pt-2">
              <ArrowUp className="animate-bounce text-white" />
          </div>
      )}
      {scrollAction === 'down' && (
          <div className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-t from-primary/50 to-transparent z-[9990] flex items-end justify-center pb-2">
              <ArrowDown className="animate-bounce text-white" />
          </div>
      )}

      <nav className="w-20 md:w-64 border-r border-white/5 bg-surface/30 backdrop-blur-md flex flex-col justify-between z-40 fixed md:relative h-full">
        <div className="p-6">
           <div className="flex items-center gap-3 mb-10">
              <div className="w-8 h-8 bg-gradient-to-tr from-primary to-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                 <Eye size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden md:block text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                EyeTrack
              </span>
           </div>

           <div className="space-y-2">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { id: 'calibration', icon: Crosshair, label: 'Calibration' },
                { id: 'settings', icon: Settings, label: 'Settings' },
              ].map((item) => (
                <DwellButton
                   key={item.id}
                   onClick={() => setView(item.id as ViewState)}
                   className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                   activeColor={view === item.id ? '#1e40af' : '#3B82F6'}
                >
                   <item.icon size={20} />
                   <span className="hidden md:block font-medium">{item.label}</span>
                </DwellButton>
              ))}
           </div>
        </div>

        <div className="p-4 border-t border-white/5">
             <div 
                onClick={() => setIsVideoExpanded(true)}
                className="rounded-xl overflow-hidden aspect-video bg-black relative shadow-inner ring-1 ring-white/10 group cursor-pointer hover:ring-primary/50 transition-all"
             >
                <CameraFeed isActive={settings.isTrackingEnabled} /> 
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={20} />
                </div>
             </div>
             <div className="mt-4 flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
                    <User size={14} className="text-gray-400" />
                </div>
                <div className="hidden md:block">
                    <p className="text-xs font-semibold">Alex D.</p>
                    <p className="text-[10px] text-gray-500">Pro Account</p>
                </div>
             </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto z-10 p-4 md:p-8 relative ml-20 md:ml-0">
         <div className="max-w-7xl mx-auto h-full">
            {view === 'dashboard' && renderDashboard()}
            {view === 'calibration' && renderCalibration()}
            {view === 'settings' && renderSettings()}
         </div>
      </main>

    </div>
  );
}