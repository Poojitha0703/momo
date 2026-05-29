import { useState, useRef, useEffect } from 'react';
import { Camera, Square, Plus, Flame, X, RotateCcw } from 'lucide-react';
import '../index.css';

// Default exercises now use the static images we generated
const DEFAULT_EXERCISES = [
  { id: '1', name: 'Squats (Side View)', refImageUrl: '/squat.png' },
  { id: '2', name: 'Pushups (Side View)', refImageUrl: '/pushup.png' }
];

const ROAST_MESSAGES = [
  "My grandma has better form, and she's 90! 👵",
  "Is that a squat or are you just bowing to the weights? 🙇‍♂️",
  "Bro, the mirror is judging you right now... 🪞",
  "Are we doing reps or just shaking violently? 🫨",
  "Zero. Zero. Still Zero. 📉"
];

function GymTracker() {
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [selectedExerciseId, setSelectedExerciseId] = useState(DEFAULT_EXERCISES[0].id);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  
  const [showRoast, setShowRoast] = useState(false);
  const [roastMsg, setRoastMsg] = useState('');
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'single'

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  // Always start camera on mount, unless playing back
  useEffect(() => {
    if (!recordedVideoUrl) {
      startCamera();
    }
    return () => stopCamera();
  }, [recordedVideoUrl]);

  const handleStartRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    chunksRef.current = [];
    const stream = videoRef.current.srcObject;
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTryAgain = () => {
    setRecordedVideoUrl(null);
    setShowRoast(false);
  };

  const handleAddExercise = (e) => {
    e.preventDefault();
    if (!newExerciseName.trim()) return;
    
    const newEx = {
      id: Date.now().toString(),
      name: newExerciseName,
      refImageUrl: '/squat.png' // default to squat image for custom exercises for now
    };
    
    setExercises([...exercises, newEx]);
    setSelectedExerciseId(newEx.id);
    setNewExerciseName('');
    setShowAddModal(false);
  };

  const triggerRoast = () => {
    const msg = ROAST_MESSAGES[Math.floor(Math.random() * ROAST_MESSAGES.length)];
    setRoastMsg(msg);
    setShowRoast(true);
    setTimeout(() => setShowRoast(false), 3000);
  };

  const selectedExercise = exercises.find(e => e.id === selectedExerciseId);

  return (
    <>
      <main className="container main-content-wrapper" style={{gap: '10px', paddingTop: '10px'}}>
        
        {/* ONE PAGE LAYOUT */}
        <div className="card" style={{padding: '16px', position: 'relative', overflow: 'hidden'}}>
          
          {/* Roast Overlay */}
          {showRoast && (
            <div className="roast-overlay">
              <Flame size={64} color="var(--danger)" style={{marginBottom: '20px'}} />
              <h2 className="roast-text">{roastMsg}</h2>
            </div>
          )}

          {/* Top Controls: Exercise Selection */}
          <div style={{display: 'flex', gap: '10px', marginBottom: '16px'}}>
            <div className="select-wrapper" style={{flex: 1}}>
              <select 
                value={selectedExerciseId} 
                onChange={(e) => {
                  setSelectedExerciseId(e.target.value);
                  handleTryAgain(); // reset camera on change
                }}
                style={{padding: '12px'}}
              >
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-secondary" style={{width: 'auto', padding: '0 16px'}} onClick={() => setShowAddModal(true)}>
              <Plus size={20} />
            </button>
          </div>

          {/* View Mode Toggle Controls */}
          <div className="toggle-view-container" style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
            <button 
              className={`btn-toggle-view ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
            >
              Side-by-Side
            </button>
            <button 
              className={`btn-toggle-view ${viewMode === 'single' ? 'active' : ''}`}
              onClick={() => setViewMode('single')}
            >
              My Video Only
            </button>
          </div>
          
          {/* Main Visual Panel */}
          <div className="side-by-side" style={{height: '50vh', marginBottom: '16px'}}>
            
            {/* Left: Perfect Form Reference Image (only rendered in side-by-side view) */}
            {viewMode === 'side-by-side' && (
              <div className="side-video">
                <img 
                  src={selectedExercise?.refImageUrl} 
                  alt="Perfect Form" 
                  style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                />
                <div className="video-label" style={{background: 'rgba(255, 215, 0, 0.8)', color: '#000'}}>Perfect Form</div>
              </div>
            )}

            {/* Right: Camera or Playback */}
            <div className="side-video">
              {!recordedVideoUrl ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)'}} />
                  {isRecording && (
                    <div className="recording-indicator" style={{top: '10px', right: '10px'}}>
                      <div className="dot"></div> REC
                    </div>
                  )}
                  <div className="video-label">Your Camera</div>
                </>
              ) : (
                <>
                  <video src={recordedVideoUrl} autoPlay loop playsInline controls style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  <div className="video-label" style={{background: 'rgba(255, 59, 48, 0.8)', color: '#fff'}}>Your Set</div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {!recordedVideoUrl ? (
              !isRecording ? (
                <button className="btn-primary" onClick={handleStartRecording}>
                  <Camera size={24} /> Record Set
                </button>
              ) : (
                <button className="btn-danger btn-primary" onClick={handleStopRecording} style={{color: '#fff', background: 'var(--danger)'}}>
                  <Square size={24} /> Stop Set
                </button>
              )
            ) : (
              <div style={{display: 'flex', gap: '10px'}}>
                <button className="btn-secondary" onClick={handleTryAgain} style={{flex: 1}}>
                  <RotateCcw size={20} /> Retry
                </button>
                <button className="btn-danger btn-primary" onClick={triggerRoast} style={{flex: 1}}>
                  <Flame size={20} /> Roast Me
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ADD EXERCISE MODAL */}
        {showAddModal && (
          <div className="add-exercise-modal">
            <div className="modal-content">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>Add Custom Exercise</h3>
                <X size={24} style={{cursor: 'pointer'}} onClick={() => setShowAddModal(false)} />
              </div>
              <form onSubmit={handleAddExercise} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Deadlift" 
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-primary">Add Exercise</button>
              </form>
            </div>
          </div>
        )}

      </main>
    </>
  );
}

export default GymTracker;
