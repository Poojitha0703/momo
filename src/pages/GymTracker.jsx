import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Square, Plus, Flame, X, RotateCcw,
  ChevronLeft, ChevronRight, CheckCircle2, Clock,
  Users, Dumbbell, ImagePlus, Trash2, Trophy, Zap
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { getUserType, getUserFirstName } from '../firebase';
import {
  collection, doc, setDoc, getDocs, onSnapshot
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../index.css';

// ─── Firebase Helpers ────────────────────────────────────────────────────────
const getGymLogRef = (uid, dateStr) =>
  doc(db, 'users', uid, 'gym_logs', dateStr);

const getGymLogsCol = (uid) =>
  collection(db, 'users', uid, 'gym_logs');

// ─── Utility ─────────────────────────────────────────────────────────────────
const today = () => new Date();
const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ─── Video Form-Check Sub-component ──────────────────────────────────────────
const DEFAULT_EXERCISES = [
  { id: '1', name: 'Squats (Side View)', refImageUrl: '/squat.png' },
  { id: '2', name: 'Pushups (Side View)', refImageUrl: '/pushup.png' },
];
const ROAST_MESSAGES = [
  "My grandma has better form, and she's 90! 👵",
  "Is that a squat or are you just bowing to the weights? 🙇‍♂️",
  "Bro, the mirror is judging you right now... 🪞",
  "Are we doing reps or just shaking violently? 🫨",
  "Zero. Zero. Still Zero. 📉",
];

function FormCheckModal({ onClose }) {
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [selectedId, setSelectedId] = useState(DEFAULT_EXERCISES[0].id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [showRoast, setShowRoast] = useState(false);
  const [roastMsg, setRoastMsg] = useState('');
  const [viewMode, setViewMode] = useState('single');
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { console.error('Camera error:', err); }
  };
  const stopCamera = () => {
    if (videoRef.current?.srcObject)
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
  };
  useEffect(() => {
    if (!recordedUrl) startCamera();
    return () => stopCamera();
  }, [recordedUrl]);

  const handleStart = () => {
    if (!videoRef.current?.srcObject) return;
    chunksRef.current = [];
    const stream = videoRef.current.srcObject;
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedUrl(URL.createObjectURL(blob));
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };
  const handleStop = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  const handleTryAgain = () => { setRecordedUrl(null); setShowRoast(false); };
  const triggerRoast = () => {
    const msg = ROAST_MESSAGES[Math.floor(Math.random() * ROAST_MESSAGES.length)];
    setRoastMsg(msg); setShowRoast(true);
    setTimeout(() => setShowRoast(false), 3000);
  };
  const addExercise = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const ex = { id: Date.now().toString(), name: newName, refImageUrl: '/squat.png' };
    setExercises([...exercises, ex]);
    setSelectedId(ex.id);
    setNewName(''); setShowAddModal(false);
  };
  const selected = exercises.find(e => e.id === selectedId);

  return (
    <div className="add-exercise-modal">
      <div className="modal-content" style={{ maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Camera size={20} color="var(--primary)" /> Form Check
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Exercise selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div className="select-wrapper" style={{ flex: 1 }}>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); handleTryAgain(); }} style={{ padding: '10px' }}>
              {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '0 14px' }} onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
          </button>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['single', 'side-by-side'].map(m => (
            <button key={m}
              className={`btn-toggle-view${viewMode === m ? ' active' : ''}`}
              onClick={() => setViewMode(m)}
            >
              {m === 'single' ? 'My Video Only' : 'Side-by-Side'}
            </button>
          ))}
        </div>

        {/* Video panel */}
        <div className="side-by-side" style={{ height: '45vh', marginBottom: 12 }}>
          {viewMode === 'side-by-side' && (
            <div className="side-video">
              <img src={selected?.refImageUrl} alt="Perfect Form" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div className="video-label" style={{ background: 'rgba(255,215,0,0.8)', color: '#000' }}>Perfect Form</div>
            </div>
          )}
          <div className="side-video" style={{ position: 'relative' }}>
            {showRoast && (
              <div className="roast-overlay">
                <Flame size={48} color="var(--danger)" style={{ marginBottom: 12 }} />
                <h2 className="roast-text" style={{ fontSize: '1.3rem' }}>{roastMsg}</h2>
              </div>
            )}
            {!recordedUrl ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {isRecording && (
                  <div className="recording-indicator" style={{ top: 8, right: 8 }}>
                    <div className="dot" /> REC
                  </div>
                )}
                <div className="video-label">Your Camera</div>
              </>
            ) : (
              <>
                <video src={recordedUrl} autoPlay loop playsInline controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="video-label" style={{ background: 'rgba(255,59,48,0.8)', color: '#fff' }}>Your Set</div>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        {!recordedUrl ? (
          !isRecording ? (
            <button className="btn-primary" onClick={handleStart}><Camera size={20} /> Record Set</button>
          ) : (
            <button className="btn-primary" onClick={handleStop} style={{ background: 'var(--danger)', color: '#fff' }}>
              <Square size={20} /> Stop Set
            </button>
          )
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={handleTryAgain} style={{ flex: 1 }}><RotateCcw size={18} /> Retry</button>
            <button className="btn-primary" onClick={triggerRoast} style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}><Flame size={18} /> Roast Me</button>
          </div>
        )}

        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Add Exercise</h3>
                <X size={22} style={{ cursor: 'pointer' }} onClick={() => setShowAddModal(false)} />
              </div>
              <form onSubmit={addExercise} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="form-input" placeholder="e.g. Deadlift" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                <button type="submit" className="btn-primary">Add</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Log Entry Modal ──────────────────────────────────────────────────────────
function LogEntryModal({ dateStr, existingLog, onSave, onClose }) {
  const [wentToGym, setWentToGym] = useState(existingLog?.wentToGym ?? true);
  const [startTime, setStartTime] = useState(existingLog?.startTime ?? '07:00');
  const [endTime, setEndTime] = useState(existingLog?.endTime ?? '08:00');
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [photoPreview, setPhotoPreview] = useState(existingLog?.photoUrl ?? null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    let photoUrl = existingLog?.photoUrl ?? null;
    if (photoFile) {
      try {
        const uid = auth.currentUser?.uid;
        const sRef = storageRef(storage, `gym_photos/${uid}/${dateStr}_${Date.now()}`);
        await uploadBytes(sRef, photoFile);
        photoUrl = await getDownloadURL(sRef);
      } catch (err) {
        console.error('Photo upload failed:', err);
      }
    }
    await onSave({ wentToGym, startTime, endTime, notes, photoUrl });
    setSaving(false);
  };

  const displayDate = new Date(dateStr + 'T12:00:00');
  const formatted = displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="add-exercise-modal">
      <div className="modal-content" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Gym Log</div>
            <h3 style={{ fontSize: '1.2rem' }}>{formatted}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Went to gym toggle */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setWentToGym(true)}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.95rem',
              background: wentToGym ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.07)',
              color: wentToGym ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            💪 Crushed It!
          </button>
          <button
            onClick={() => setWentToGym(false)}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.95rem',
              background: !wentToGym ? 'rgba(255,59,48,0.3)' : 'rgba(255,255,255,0.07)',
              color: !wentToGym ? '#ff6b6b' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            😴 Rest Day
          </button>
        </div>

        {wentToGym && (
          <>
            {/* Time */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="form-input"
                  style={{ padding: '10px 12px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="form-input"
                  style={{ padding: '10px 12px' }}
                />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
              <textarea
                className="form-input"
                placeholder="What did you work on today?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'none', minHeight: 70 }}
              />
            </div>

            {/* Photo */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Gym Photo</label>
              {photoPreview ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3' }}>
                  <img src={photoPreview} alt="Gym" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    style={{ flex: 1, padding: '12px', background: 'rgba(255,215,0,0.1)', border: '1px dashed rgba(255,215,0,0.3)', borderRadius: 12, color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Camera size={18} /> Take Photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12, color: '#888', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <ImagePlus size={18} /> Upload
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </div>
          </>
        )}

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={saving ? { opacity: 0.6 } : {}}
        >
          {saving ? 'Saving...' : '✓ Save Log'}
        </button>
      </div>
    </div>
  );
}

// ─── Calendar Component ───────────────────────────────────────────────────────
function GymCalendar({ logs, onDayClick, viewingUid, challengePartnerName }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(today());
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isFuture = (d) => {
    const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
    return ds > todayStr;
  };

  const getLog = (d) => {
    const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
    return logs[ds];
  };

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{MONTHS[month]} {year}</div>
          {challengePartnerName && (
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: 2 }}>{challengePartnerName}'s Calendar</div>
          )}
        </div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, idx) => {
          if (!d) return <div key={`blank-${idx}`} />;
          const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
          const log = getLog(d);
          const isToday = ds === todayStr;
          const future = isFuture(d);
          let bg = 'rgba(255,255,255,0.04)';
          let border = '1px solid rgba(255,255,255,0.06)';
          if (log?.wentToGym === true) {
            bg = 'rgba(34,197,94,0.18)';
            border = '1px solid rgba(34,197,94,0.4)';
          } else if (log?.wentToGym === false) {
            bg = 'rgba(255,59,48,0.12)';
            border = '1px solid rgba(255,59,48,0.25)';
          }
          if (isToday) border = '2px solid var(--primary)';

          return (
            <button
              key={ds}
              onClick={() => !future && onDayClick(ds, log)}
              disabled={future}
              style={{
                aspectRatio: '1', borderRadius: 10, background: bg, border, cursor: future ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                opacity: future ? 0.35 : 1, transition: 'all 0.15s', fontFamily: 'inherit', position: 'relative'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--primary)' : '#fff' }}>
                {d}
              </span>
              {log?.wentToGym === true && <span style={{ fontSize: '0.6rem' }}>💪</span>}
              {log?.wentToGym === false && <span style={{ fontSize: '0.6rem' }}>😴</span>}
              {log?.photoUrl && (
                <div style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Challenge Stats ──────────────────────────────────────────────────────────
function ChallengeStats({ myLogs, partnerLogs, myName, partnerName }) {
  const countGymDays = (logs) => Object.values(logs).filter(l => l.wentToGym).length;
  const myCount = countGymDays(myLogs);
  const partnerCount = countGymDays(partnerLogs);

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      {[{ name: myName, count: myCount, color: '#FFD700' }, { name: partnerName, count: partnerCount, color: '#a78bfa' }].map(({ name, count, color }) => (
        <div key={name} style={{
          flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '14px 12px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{count}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{name}'s gym days</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main GymTracker ─────────────────────────────────────────────────────────
function GymTracker() {
  const user = auth.currentUser;
  const myUid = user?.uid;
  const myName = getUserFirstName(user);
  const userType = getUserType(user);

  // Figure out partner UID from the known email mapping
  // We store partner log reads under a shared collection approach
  const [myLogs, setMyLogs] = useState({});
  const [partnerLogs, setPartnerLogs] = useState({});
  const [partnerName, setPartnerName] = useState('');
  const [partnerUid, setPartnerUid] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFormCheck, setShowFormCheck] = useState(false);
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'partner' | 'challenge'
  const [loading, setLoading] = useState(true);

  // Fetch partner UID from users collection
  useEffect(() => {
    if (!myUid) return;
    const fetchPartner = async () => {
      try {
        // We store a partner link in users/{uid}/profile
        // But since we know the two users, let's look up by user type
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(docSnap => {
          if (docSnap.id !== myUid) {
            setPartnerUid(docSnap.id);
            // Try to get partner name from profile doc
            const profileRef = doc(db, 'users', docSnap.id, 'profile', 'info');
            getDoc(profileRef).then(pd => {
              if (pd.exists() && pd.data().displayName) {
                setPartnerName(pd.data().displayName.split(' ')[0]);
              } else {
                // fallback: infer from type
                setPartnerName(userType === 'poojitha' ? 'Praneeth' : 'Poojitha');
              }
            });
          }
        });
      } catch (err) {
        setPartnerName(userType === 'poojitha' ? 'Praneeth' : 'Poojitha');
      }
    };
    fetchPartner();
  }, [myUid]);

  // Subscribe to my logs
  useEffect(() => {
    if (!myUid) return;
    const unsub = onSnapshot(getGymLogsCol(myUid), (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      setMyLogs(data);
      setLoading(false);
    });
    return unsub;
  }, [myUid]);

  // Subscribe to partner logs
  useEffect(() => {
    if (!partnerUid) return;
    const unsub = onSnapshot(getGymLogsCol(partnerUid), (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      setPartnerLogs(data);
    });
    return unsub;
  }, [partnerUid]);

  const handleDayClick = (dateStr, log) => {
    setSelectedDate(dateStr);
    setSelectedLog(log || null);
  };

  const handleSaveLog = async (logData) => {
    if (!myUid || !selectedDate) return;
    await setDoc(getGymLogRef(myUid, selectedDate), {
      ...logData,
      updatedAt: new Date().toISOString()
    });
    setSelectedDate(null);
    setSelectedLog(null);
  };

  // Streak calc
  const calcStreak = (logs) => {
    let streak = 0;
    const d = today();
    while (true) {
      const ds = toDateStr(d);
      if (logs[ds]?.wentToGym) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  };
  const myStreak = calcStreak(myLogs);

  return (
    <>
      <main className="container main-content-wrapper" style={{ gap: 12, paddingTop: 12 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--primary)' }}>Gym</span>son 🏋️
            </h2>
            {myStreak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Flame size={14} color="#ff6b35" />
                <span style={{ fontSize: '0.78rem', color: '#ff6b35', fontWeight: 700 }}>{myStreak} day streak!</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFormCheck(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: 10, color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s'
            }}
          >
            <Camera size={16} /> Form Check
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, gap: 2 }}>
          {[
            { key: 'mine', label: `My Log`, icon: <Dumbbell size={14} /> },
            { key: 'partner', label: `${partnerName || 'Partner'}'s Log`, icon: <Users size={14} /> },
            { key: 'challenge', label: 'Challenge', icon: <Trophy size={14} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 600, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.key ? '#000' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Challenge view */}
        {activeTab === 'challenge' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Trophy size={18} color="var(--primary)" />
              <h3 style={{ fontWeight: 800, fontSize: '1.05rem' }}>Couple Challenge</h3>
            </div>
            <ChallengeStats
              myLogs={myLogs}
              partnerLogs={partnerLogs}
              myName={myName}
              partnerName={partnerName || 'Partner'}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
              {Object.values(myLogs).filter(l => l.wentToGym).length > Object.values(partnerLogs).filter(l => l.wentToGym).length
                ? `🏆 ${myName} is winning! Keep it up!`
                : Object.values(partnerLogs).filter(l => l.wentToGym).length > Object.values(myLogs).filter(l => l.wentToGym).length
                  ? `💪 ${partnerName || 'Partner'} is ahead – time to grind!`
                  : `🤝 You're tied – the real competition starts now!`}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <GymCalendar
              logs={activeTab === 'partner' ? partnerLogs : myLogs}
              onDayClick={activeTab === 'partner' ? () => {} : handleDayClick}
              challengePartnerName={activeTab === 'partner' ? (partnerName || 'Partner') : null}
            />
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {[
            { color: 'rgba(34,197,94,0.5)', label: '💪 Gym day' },
            { color: 'rgba(255,59,48,0.35)', label: '😴 Rest day' },
            { color: 'rgba(255,215,0,0.3)', label: '⭐ Today' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
              {label}
            </div>
          ))}
        </div>

        {/* Recent photo strip for my logs */}
        {activeTab === 'mine' && (() => {
          const photoDays = Object.entries(myLogs)
            .filter(([, l]) => l.photoUrl)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 5);
          if (!photoDays.length) return null;
          return (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImagePlus size={15} color="var(--primary)" /> Recent Gym Photos
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {photoDays.map(([ds, l]) => (
                  <div key={ds} style={{ flexShrink: 0, width: 90, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                    <img src={l.photoUrl} alt={ds} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', fontSize: '0.6rem', color: '#ddd', padding: '3px 6px', textAlign: 'center' }}>
                      {ds.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Partner photo strip */}
        {activeTab === 'partner' && (() => {
          const photoDays = Object.entries(partnerLogs)
            .filter(([, l]) => l.photoUrl)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 5);
          if (!photoDays.length) return null;
          return (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImagePlus size={15} color="#a78bfa" /> {partnerName || 'Partner'}'s Gym Photos
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {photoDays.map(([ds, l]) => (
                  <div key={ds} style={{ flexShrink: 0, width: 90, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                    <img src={l.photoUrl} alt={ds} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', fontSize: '0.6rem', color: '#ddd', padding: '3px 6px', textAlign: 'center' }}>
                      {ds.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </main>

      {/* Day Log Modal */}
      {selectedDate && (
        <LogEntryModal
          dateStr={selectedDate}
          existingLog={selectedLog}
          onSave={handleSaveLog}
          onClose={() => { setSelectedDate(null); setSelectedLog(null); }}
        />
      )}

      {/* Form Check Modal */}
      {showFormCheck && <FormCheckModal onClose={() => setShowFormCheck(false)} />}
    </>
  );
}

export default GymTracker;
