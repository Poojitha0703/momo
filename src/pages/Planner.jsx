import { useState, useEffect } from 'react';
import { 
  ListTodo, Check, Trash2, Plus, ChevronLeft, ChevronRight, 
  Award, Flame, Calendar, Target, Minus, X 
} from 'lucide-react';
import { 
  onSnapshot, setDoc, updateDoc, deleteDoc, 
  query, where, getDocs, doc, writeBatch 
} from 'firebase/firestore';
import { auth, getUserStatsRef, getUserTasksCol, getUserMilestonesCol, getUserType, db } from '../firebase';
import { seedDatabase } from '../utils/firebaseSeed';
import '../index.css';

export default function Planner() {
  const user = auth.currentUser;
  const uid = user ? user.uid : null;

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'epic'
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Tasks & Milestones State
  const [monthTasks, setMonthTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, lastActiveDate: '', seeded: false });
  
  // UI States
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskCategory, setNewTaskCategory] = useState('lifestyle');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [seedingText, setSeedingText] = useState('');
  const [levelUpUnlocked, setLevelUpUnlocked] = useState(null); // stores level if just leveled up
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Delete task states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [futureTasksList, setFutureTasksList] = useState([]);

  // Repeat task states
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatUntilDate, setRepeatUntilDate] = useState('');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0..11

  // Format Helper: YYYY-MM-DD
  const formatDateStr = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const dispHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${dispHours}:${minutesStr} ${ampm}`;
  };

  const selectedDateStr = formatDateStr(selectedDate);
  const todayDateStr = formatDateStr(new Date());

  // --- Real-time Listeners ---
  useEffect(() => {
    if (!uid) return;

    const runSeedCheck = async () => {
      try {
        await seedDatabase(uid, (text) => setSeedingText(text));
        setSeedingText('');
      } catch (e) {
        console.error("Error seeding:", e);
      }
    };
    runSeedCheck();

    // 1. Stats Subscription
    const statsRef = getUserStatsRef(uid);
    const unsubStats = onSnapshot(statsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Detect level up
        setStats(prev => {
          if (prev.seeded && data.level > prev.level) {
            setLevelUpUnlocked(data.level);
          }
          return data;
        });
      }
    });

    // 2. Epic Milestones Subscription
    const milestonesQuery = query(getUserMilestonesCol(uid));
    const unsubMilestones = onSnapshot(milestonesQuery, (snap) => {
      const loaded = [];
      snap.forEach((doc) => {
        loaded.push({ ...doc.data(), id: doc.id });
      });
      setMilestones(loaded);
    });

    return () => {
      unsubStats();
      unsubMilestones();
    };
  }, [uid]);

  // Subscribe to Tasks in the Current Month (for Calendar dots)
  useEffect(() => {
    if (!uid) return;

    const firstOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31`;
    
    const monthQuery = query(
      getUserTasksCol(uid),
      where('date', '>=', firstOfMonth),
      where('date', '<=', lastOfMonth)
    );

    const unsubMonthTasks = onSnapshot(monthQuery, (snap) => {
      const loaded = [];
      snap.forEach((doc) => {
        loaded.push({ ...doc.data(), id: doc.id });
      });
      setMonthTasks(loaded);
    });

    return () => unsubMonthTasks();
  }, [currentYear, currentMonth, uid]);

  // Filter tasks for the selected date
  const selectedDateTasks = monthTasks.filter(t => t.date === selectedDateStr);

  // --- Streak Calculation ---
  const updateStreakMetric = async () => {
    if (!uid) return;
    try {
      const completedQuery = query(getUserTasksCol(uid), where('completed', '==', true));
      const snap = await getDocs(completedQuery);
      const completedDates = [];
      snap.forEach(doc => {
        completedDates.push(doc.data().date);
      });
      
      const uniqueDates = new Set(completedDates);
      let streak = 0;
      let check = new Date();
      const checkTodayStr = formatDateStr(check);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const checkYesterdayStr = formatDateStr(yesterday);

      if (!uniqueDates.has(checkTodayStr) && !uniqueDates.has(checkYesterdayStr)) {
        streak = 0;
      } else {
        if (!uniqueDates.has(checkTodayStr) && uniqueDates.has(checkYesterdayStr)) {
          check = yesterday;
        }
        while (true) {
          const currentStr = formatDateStr(check);
          if (uniqueDates.has(currentStr)) {
            streak++;
            check.setDate(check.getDate() - 1);
          } else {
            break;
          }
        }
      }

      const statsRef = getUserStatsRef(uid);
      await updateDoc(statsRef, { streak });
    } catch (err) {
      console.error("Error updating streak:", err);
    }
  };

  // --- Add Task ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !uid) return;

    try {
      if (isRecurring && repeatUntilDate) {
        // Parse date boundaries
        const start = new Date(selectedDate);
        const end = new Date(repeatUntilDate + 'T00:00:00');
        
        if (end >= start) {
          const tasksToCreate = [];
          let current = new Date(start);
          
          while (current <= end) {
            const dateStr = formatDateStr(current);
            // Generate client-side Firestore ID
            const newId = doc(getUserTasksCol(uid)).id;
            tasksToCreate.push({
              id: newId,
              text: newTaskText.trim(),
              priority: newTaskPriority,
              category: newTaskCategory,
              completed: false,
              date: dateStr,
              time: newTaskTime || null
            });
            current.setDate(current.getDate() + 1);
          }

          if (tasksToCreate.length > 0) {
            const batch = writeBatch(db);
            tasksToCreate.forEach(task => {
              batch.set(doc(getUserTasksCol(uid), task.id), task);
            });
            await batch.commit();
          }
        } else {
          // If end date is before start date, fallback to single add
          const newId = Date.now().toString();
          const newTask = {
            id: newId,
            text: newTaskText.trim(),
            priority: newTaskPriority,
            category: newTaskCategory,
            completed: false,
            date: selectedDateStr,
            time: newTaskTime || null
          };
          await setDoc(doc(getUserTasksCol(uid), newId), newTask);
        }
      } else {
        // Single Task Add
        const newId = Date.now().toString();
        const newTask = {
          id: newId,
          text: newTaskText.trim(),
          priority: newTaskPriority,
          category: newTaskCategory,
          completed: false,
          date: selectedDateStr,
          time: newTaskTime || null
        };
        await setDoc(doc(getUserTasksCol(uid), newId), newTask);
      }

      setNewTaskText('');
      setNewTaskTime('');
      setNewTaskPriority('medium');
      setNewTaskCategory('lifestyle');
      setIsRecurring(false);
      setRepeatUntilDate('');
      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  // --- Toggle Task ---
  const toggleTask = async (task) => {
    if (!uid) return;
    const statsRef = getUserStatsRef(uid);
    const taskRef = doc(getUserTasksCol(uid), task.id);
    
    const xpChange = task.priority === 'high' ? 30 : (task.priority === 'medium' ? 20 : 10);
    const newCompletedState = !task.completed;
    const newXp = stats.xp + (newCompletedState ? xpChange : -xpChange);
    const newLevel = Math.max(Math.floor(newXp / 100) + 1, 1);

    try {
      await updateDoc(taskRef, { completed: newCompletedState });
      await updateDoc(statsRef, { 
        xp: Math.max(newXp, 0),
        level: newLevel
      });
      // Trigger streak recalculation on toggling
      setTimeout(() => updateStreakMetric(), 550);
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  // --- Delete Task ---
  const deleteTask = async (task) => {
    if (!uid) return;
    try {
      // Find all tasks with the same text to check for future occurrences
      const q = query(
        getUserTasksCol(uid),
        where('text', '==', task.text)
      );
      const snap = await getDocs(q);
      const futureTasks = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.date > task.date) {
          futureTasks.push({ ...data, id: docSnap.id });
        }
      });

      setTaskToDelete(task);
      setFutureTasksList(futureTasks);
      setShowDeleteConfirm(true);
    } catch (err) {
      console.error("Error querying future tasks:", err);
      // Fallback: prompt confirmation for single task
      setTaskToDelete(task);
      setFutureTasksList([]);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDeleteTask = async (deleteAllFuture) => {
    if (!uid || !taskToDelete) return;
    try {
      let xpDeduction = 0;
      
      // 1. Delete main task
      await deleteDoc(doc(getUserTasksCol(uid), taskToDelete.id));
      if (taskToDelete.completed) {
        xpDeduction += taskToDelete.priority === 'high' ? 30 : (taskToDelete.priority === 'medium' ? 20 : 10);
      }

      // 2. Delete future tasks if selected
      if (deleteAllFuture && futureTasksList.length > 0) {
        const batch = writeBatch(db);
        futureTasksList.forEach(t => {
          batch.delete(doc(getUserTasksCol(uid), t.id));
          if (t.completed) {
            xpDeduction += t.priority === 'high' ? 30 : (t.priority === 'medium' ? 20 : 10);
          }
        });
        await batch.commit();
      }

      // 3. Update stats if XP changed
      if (xpDeduction > 0) {
        const statsRef = getUserStatsRef(uid);
        const newXp = Math.max(stats.xp - xpDeduction, 0);
        const newLevel = Math.max(Math.floor(newXp / 100) + 1, 1);
        await updateDoc(statsRef, { xp: newXp, level: newLevel });
      }

      setTimeout(() => updateStreakMetric(), 550);
    } catch (err) {
      console.error("Error confirming delete:", err);
    } finally {
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
      setFutureTasksList([]);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
    setFutureTasksList([]);
  };

  // --- Increment/Decrement Epic Milestones ---
  const updateMilestoneProgress = async (m, increment) => {
    const isWeightType = m.id.startsWith('weight') || m.id.startsWith('bodyfat');
    const step = isWeightType ? 0.1 : 1;
    let newCurrent = parseFloat((m.current + (increment ? step : -step)).toFixed(1));
    
    // Boundary check
    if (isWeightType) {
      if (newCurrent < 0) return;
    } else {
      if (newCurrent < 0 || newCurrent > m.target) return;
    }

    // Completion check
    const isCompleted = isWeightType 
      ? newCurrent <= m.target 
      : newCurrent >= m.target;

    const stateChanged = isCompleted !== m.completed;
    if (!uid) return;
    const statsRef = getUserStatsRef(uid);
    const milestoneRef = doc(getUserMilestonesCol(uid), m.id);

    try {
      const updateData = {
        current: newCurrent,
        completed: isCompleted
      };

      await updateDoc(milestoneRef, updateData);

      if (stateChanged) {
        const xpChange = m.xpReward || 150;
        const newXp = stats.xp + (isCompleted ? xpChange : -xpChange);
        const newLevel = Math.max(Math.floor(newXp / 100) + 1, 1);
        await updateDoc(statsRef, { 
          xp: Math.max(newXp, 0),
          level: newLevel
        });
      }
    } catch (err) {
      console.error("Error updating milestone:", err);
    }
  };

  // --- Manual Edit Milestone Input ---
  const handleMilestoneInputChange = async (m, val) => {
    let newCurrent = isNaN(val) ? 0 : val;
    
    // Boundary check
    const isWeightType = m.id.startsWith('weight') || m.id.startsWith('bodyfat');
    if (isWeightType) {
      if (newCurrent < 0) return;
    } else {
      if (newCurrent < 0) newCurrent = 0;
      if (newCurrent > m.target) newCurrent = m.target;
    }

    newCurrent = parseFloat(newCurrent.toFixed(1));

    // Completion check
    const isCompleted = isWeightType 
      ? newCurrent <= m.target 
      : newCurrent >= m.target;

    const stateChanged = isCompleted !== m.completed;
    if (!uid) return;
    const statsRef = getUserStatsRef(uid);
    const milestoneRef = doc(getUserMilestonesCol(uid), m.id);

    try {
      const updateData = {
        current: newCurrent,
        completed: isCompleted
      };

      await updateDoc(milestoneRef, updateData);

      if (stateChanged) {
        const xpChange = m.xpReward || 150;
        const newXp = stats.xp + (isCompleted ? xpChange : -xpChange);
        const newLevel = Math.max(Math.floor(newXp / 100) + 1, 1);
        await updateDoc(statsRef, { 
          xp: Math.max(newXp, 0),
          level: newLevel
        });
      }
    } catch (err) {
      console.error("Error setting milestone:", err);
    }
  };

  // --- Monthly Calendar Math ---
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const getMonthName = (monthIdx) => {
    const names = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return names[monthIdx];
  };

  // Build task summary per date for calendar dots
  const dateSummary = {};
  monthTasks.forEach(t => {
    if (!dateSummary[t.date]) {
      dateSummary[t.date] = { total: 0, completed: 0 };
    }
    dateSummary[t.date].total++;
    if (t.completed) {
      dateSummary[t.date].completed++;
    }
  });

  // Filter Tasks by tab filter
  const filteredTasks = selectedDateTasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    if (a.time) return -1;
    if (b.time) return 1;
    return a.text.localeCompare(b.text);
  });

  const completedCount = selectedDateTasks.filter(t => t.completed).length;
  const totalCount = selectedDateTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const xpPercent = Math.min(Math.max(stats.xp % 100, 0), 100);

  if (seedingText) {
    return (
      <main className="container main-content-wrapper">
        <div className="card page-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div className="spinner-loading"></div>
          <p style={{ marginTop: '20px', fontSize: '1.1rem', color: 'var(--text-main)' }}>
            {seedingText}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container main-content-wrapper">
      
      {/* Level Up Banner Modal */}
      {levelUpUnlocked && (
        <div className="level-up-modal-overlay" onClick={() => setLevelUpUnlocked(null)}>
          <div className="level-up-modal card" onClick={e => e.stopPropagation()}>
            <div className="level-up-sparkle">✨✨✨</div>
            <Award className="text-primary level-up-badge-icon" size={60} />
            <h2>LEVEL UP!</h2>
            <p>You reached <strong>Level {levelUpUnlocked}</strong>!</p>
            <span className="level-up-unlocked-text">🎉 Check the Survival Kit for new unlocked rewards!</span>
            <button className="btn-primary" onClick={() => setLevelUpUnlocked(null)} style={{ marginTop: '16px' }}>
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {showDeleteConfirm && taskToDelete && (
        <div className="level-up-modal-overlay" style={{ zIndex: 1100 }} onClick={cancelDelete}>
          <div className="level-up-modal card" style={{ border: '2px solid var(--danger)', boxShadow: '0 0 35px rgba(255, 59, 48, 0.25)', maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
            <Trash2 className="text-danger" size={48} style={{ filter: 'drop-shadow(0 0 8px rgba(255, 59, 48, 0.4))', marginBottom: '8px' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: '0' }}>Delete Task?</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0', textAlign: 'center', lineHeight: '1.4' }}>
              Are you sure you want to delete <strong style={{ color: '#fff' }}>"{taskToDelete.text}"</strong>?
            </p>

            {futureTasksList.length > 0 ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px 0', textAlign: 'center', lineHeight: '1.4' }}>
                  This task has <strong style={{ color: 'var(--primary)' }}>{futureTasksList.length}</strong> future occurrence{futureTasksList.length > 1 ? 's' : ''}.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
                  <button 
                    className="btn-danger" 
                    onClick={() => confirmDeleteTask(true)}
                    style={{ padding: '12px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Delete All Future Tasks
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => confirmDeleteTask(false)}
                    style={{ padding: '12px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Delete This Instance Only
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={cancelDelete}
                    style={{ padding: '12px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '12px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={cancelDelete}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-danger" 
                  onClick={() => confirmDeleteTask(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card page-card">
        
        {/* Page Title */}
        <div className="page-header-title" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <ListTodo size={28} className="text-primary" />
          <div>
            <h1>Daily Focus Planner</h1>
            <p>Prioritize and conquer your day</p>
          </div>
        </div>

        {/* Gamification Panel */}
        <div className="planner-gamification-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award className="text-primary" size={18} />
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Level {stats.level}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame className="text-danger" size={16} style={{ fill: 'var(--danger)' }} />
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{stats.streak} Day Streak</span>
            </div>
          </div>
          <div>
            <div className="progress-bar-bg" style={{ height: '5px' }}>
              <div className="progress-bar-fill" style={{ width: `${xpPercent}%`, background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>XP: {stats.xp % 100} / 100</span>
              <span>Total: {stats.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Tabs for Navigation */}
        <div className="filter-tabs-container" style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px', marginBottom: '8px' }}>
          <button 
            className={`filter-tab ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            <Calendar size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'text-bottom' }} />
            Daily Planner
          </button>
          <button 
            className={`filter-tab ${activeTab === 'epic' ? 'active' : ''}`}
            onClick={() => setActiveTab('epic')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            <Target size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'text-bottom' }} />
            Epic Milestones
          </button>
        </div>

        {/* Daily Tab Contents */}
        {activeTab === 'daily' && (
          <div>
            {/* Calendar Grid Container */}
            <div className="calendar-card" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
              
              {/* Calendar Selector Header */}
              <div className="calendar-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <button onClick={handlePrevMonth} className="btn-priority-select" style={{ padding: '6px 10px' }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>
                  {getMonthName(currentMonth)} {currentYear}
                </span>
                <button onClick={handleNextMonth} className="btn-priority-select" style={{ padding: '6px 10px' }}>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day Labels */}
              <div className="calendar-weekdays-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>

              {/* Day Slots */}
              <div className="calendar-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {/* Empty cells for padding */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {/* Days cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  
                  const isSelected = selectedDateStr === dateStr;
                  const isToday = todayDateStr === dateStr;
                  
                  // Heatmap status
                  const summary = dateSummary[dateStr];
                  let statusDotClass = '';
                  let cellStatusClass = '';
                  if (summary && summary.total > 0) {
                    if (summary.completed === summary.total) {
                      statusDotClass = 'complete';
                      cellStatusClass = 'status-complete';
                    } else if (summary.completed > 0) {
                      statusDotClass = 'partial';
                      cellStatusClass = 'status-partial';
                    } else {
                      statusDotClass = 'unstarted';
                      cellStatusClass = 'status-unstarted';
                    }
                  }

                  return (
                    <button
                      key={`day-${dayNum}`}
                      onClick={() => {
                        setSelectedDate(new Date(currentYear, currentMonth, dayNum));
                        setIsDayViewOpen(true);
                        setShowAddForm(false);
                      }}
                      className={`calendar-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${cellStatusClass}`}
                      style={{ 
                        position: 'relative', 
                        aspectRatio: '1', 
                        border: 'none', 
                        borderRadius: cellStatusClass === 'status-complete' ? '50%' : '8px', 
                        fontSize: '0.85rem', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      {dayNum}
                      {statusDotClass && statusDotClass !== 'complete' && (
                        <span className={`calendar-status-dot ${statusDotClass}`} />
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Day View Overlay Modal */}
            {isDayViewOpen && (
              <div className="day-view-overlay" onClick={() => { setIsDayViewOpen(false); setShowAddForm(false); }}>
                <div className="day-view-drawer card" onClick={e => e.stopPropagation()}>
                  
                  {/* Drawer Header with Close Button */}
                  <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} className="text-primary" /> Daily Schedule
                    </h2>
                    <button className="drawer-close-btn" onClick={() => { setIsDayViewOpen(false); setShowAddForm(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                      <X size={20} />
                    </button>
                  </div>

                  {/* Date Details Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff', margin: '0 0 2px 0' }}>
                        {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        {totalCount} task{totalCount !== 1 ? 's' : ''} planned
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                        {progressPercent}%
                      </span>
                      <div style={{ position: 'relative', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="36" height="36" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="3"
                            fill="transparent"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            stroke="var(--primary)"
                            strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 15}
                            strokeDashoffset={2 * Math.PI * 15 * (1 - progressPercent / 100)}
                            strokeLinecap="round"
                            fill="transparent"
                            style={{
                              transition: 'stroke-dashoffset 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', fontSize: '0.78rem', fontWeight: '800', color: '#fff' }}>
                          {completedCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="filter-tabs-container" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '12px' }}>
                    {['all', 'active', 'completed'].map(f => (
                      <button
                        key={f}
                        className={`filter-tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Task Items (Scrollable List) */}
                  <div className="tasks-list" style={{ marginTop: '0', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {sortedTasks.map(task => (
                      <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} priority-${task.priority || 'medium'} category-${task.category || 'lifestyle'}`}>
                        <label className="task-checkbox-label" onClick={() => toggleTask(task)}>
                          <div className="custom-checkbox">
                            {task.completed && <Check size={14} />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                              {task.time && (
                                <span style={{ color: '#ffa500', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                                  {formatTime(task.time)}
                                </span>
                              )}
                              {task.time && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>•</span>}
                              <span className="task-text">{task.text}</span>
                            </div>
                            {task.priority === 'high' && (
                              <div style={{ display: 'flex' }}>
                                <span className="task-priority-tag high" style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '4px' }}>
                                  ⚡ HIGH
                                </span>
                              </div>
                            )}
                          </div>
                        </label>
                        <button className="btn-delete-task" onClick={() => deleteTask(task)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    {sortedTasks.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: '0.9rem' }}>
                        No {filter !== 'all' ? filter : ''} tasks found for this date.
                      </div>
                    )}
                  </div>

                  {/* Add Task Collapsible Section at the Bottom */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '12px' }}>
                    {!showAddForm ? (
                      <button 
                        onClick={() => setShowAddForm(true)} 
                        className="btn-primary" 
                        style={{ padding: '12px', fontSize: '0.9rem', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: 'rgba(255, 215, 0, 0.1)', color: 'var(--primary)', border: '1px dashed rgba(255, 215, 0, 0.3)' }}
                      >
                        <Plus size={16} /> Add Task
                      </button>
                    ) : (
                      <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)' }}>New Task</span>
                          <button 
                            type="button" 
                            onClick={() => setShowAddForm(false)} 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                          >
                            Cancel
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Task description..."
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            style={{ flex: 1, padding: '10px 12px', fontSize: '0.9rem' }}
                          />
                          <input
                            type="time"
                            className="form-input time-picker-input"
                            value={newTaskTime}
                            onChange={(e) => setNewTaskTime(e.target.value)}
                            style={{ width: '100px', padding: '10px 8px', color: '#fff', fontSize: '0.8rem', background: '#000' }}
                          />
                          <button onClick={handleAddTask} className="btn-primary" style={{ width: 'auto', padding: '0 16px', borderRadius: '10px' }}>
                            <Plus size={18} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '50px' }}>Priority:</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {['high', 'medium', 'low'].map(p => (
                              <button
                                key={p}
                                type="button"
                                className={`btn-priority-select ${p} ${newTaskPriority === p ? 'active' : ''}`}
                                onClick={() => setNewTaskPriority(p)}
                                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '50px' }}>Category:</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {['lifestyle', 'work', 'workout'].map(c => (
                              <button
                                key={c}
                                type="button"
                                className={`btn-category-select ${c} ${newTaskCategory === c ? 'active' : ''}`}
                                onClick={() => setNewTaskCategory(c)}
                                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Repeat Option */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)', userSelect: 'none' }}>
                            <input
                              type="checkbox"
                              checked={isRecurring}
                              onChange={(e) => {
                                setIsRecurring(e.target.checked);
                                if (e.target.checked && !repeatUntilDate) {
                                  // Default end date is 7 days in the future
                                  const defaultEnd = new Date(selectedDate);
                                  defaultEnd.setDate(defaultEnd.getDate() + 7);
                                  setRepeatUntilDate(formatDateStr(defaultEnd));
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <span>Repeat daily until a specific date</span>
                          </label>

                          {isRecurring && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Until:</span>
                              <input
                                type="date"
                                className="form-input"
                                value={repeatUntilDate}
                                min={selectedDateStr}
                                onChange={(e) => setRepeatUntilDate(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#fff', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '140px' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* Epic Tab Contents */}
        {activeTab === 'epic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px 0', textAlign: 'center' }}>
              Long-term targets for the 3-month plan. Complete them for massive XP bonuses!
            </p>
            
            <div className="milestones-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {milestones
                .filter(m => {
                  const userType = getUserType(user);
                  if (userType === 'poojitha') {
                    return !m.id.includes('praneeth');
                  }
                  if (userType === 'praneeth') {
                    return !m.id.includes('poojitha');
                  }
                  return true;
                })
                .map(m => {
                  const isWeight = m.id.startsWith('weight') || m.id.startsWith('bodyfat');
                  const startVal = m.start !== undefined ? m.start : (isWeight ? (m.id.includes('praneeth') ? (m.id.includes('weight') ? 78 : 20) : 58) : 0);
                  
                  let dispPercent;
                  if (isWeight) {
                    const totalDiff = startVal - m.target;
                    const currentDiff = startVal - m.current;
                    dispPercent = totalDiff > 0 ? Math.min(Math.max(Math.round((currentDiff / totalDiff) * 100), 0), 100) : 0;
                  } else {
                    const totalDiff = m.target - startVal;
                    const currentDiff = m.current - startVal;
                    dispPercent = totalDiff > 0 ? Math.min(Math.max(Math.round((currentDiff / totalDiff) * 100), 0), 100) : 0;
                  }

                  const userType = getUserType(user);
                  let displayTitle = m.title;
                  if (userType === 'poojitha' && m.id === 'weight_poojitha') {
                    displayTitle = '⚖️ Weight Goal: 55kg';
                  } else if (userType === 'praneeth') {
                    if (m.id === 'weight_praneeth') {
                      displayTitle = '⚖️ Weight Goal: 72kg';
                    } else if (m.id === 'bodyfat_praneeth') {
                      displayTitle = '💪 Body Fat Goal: 16%';
                    }
                  }

                  return (
                    <div key={m.id} className={`card ${m.completed ? 'milestone-completed' : ''}`} style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#fff' }}>{displayTitle}</span>
                      {m.completed ? (
                        <span className="badge-completed-xp" style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'rgba(255,215,0,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          ✓ Done (+{m.xpReward} XP)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          +{m.xpReward} XP
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      {/* Progress bar */}
                      <div style={{ flex: 1 }}>
                        <div className="progress-bar-bg" style={{ height: '6px' }}>
                          <div className="progress-bar-fill" style={{ width: `${dispPercent}%`, background: m.completed ? 'var(--primary)' : '#0a84ff' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', alignItems: 'center' }}>
                          <span>Progress: {dispPercent}%</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              value={m.current}
                              onChange={(e) => handleMilestoneInputChange(m, parseFloat(e.target.value))}
                              step={isWeight ? "0.1" : "1"}
                              style={{
                                width: '55px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                color: '#fff',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                textAlign: 'center',
                                fontWeight: '700',
                                outline: 'none'
                              }}
                            />
                            <span>/ {m.target}</span>
                          </div>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => updateMilestoneProgress(m, false)}
                          className="btn-priority-select" 
                          style={{ padding: '6px 8px' }}
                        >
                          <Minus size={14} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => updateMilestoneProgress(m, true)}
                          className="btn-priority-select" 
                          style={{ padding: '6px 8px' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
