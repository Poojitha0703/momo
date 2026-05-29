import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Gift, ListTodo, BookOpen, Flame, Award } from 'lucide-react';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { seedDatabase } from '../utils/firebaseSeed';
import '../index.css';

export default function Home() {
  const navigate = useNavigate();

  // Load metrics from Firestore
  const [tasks, setTasks] = useState([]);
  const [passes, setPasses] = useState([]);
  const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, lastActiveDate: '', seeded: false });
  const [seedingText, setSeedingText] = useState('');
  const [loading, setLoading] = useState(true);

  // Get today's date formatted as YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const runSeedCheck = async () => {
      try {
        await seedDatabase((text) => setSeedingText(text));
        setSeedingText('');
      } catch (e) {
        console.error("Error seeding database on load:", e);
        setSeedingText(`Error seeding database: ${e.message}`);
        setLoading(false);
      }
    };
    runSeedCheck();

    // 1. Subscribe to gamification stats
    const statsRef = doc(db, 'gamification', 'stats');
    const unsubStats = onSnapshot(statsRef, 
      (snap) => {
        if (snap.exists()) {
          setStats(snap.data());
          setLoading(false);
        }
      },
      (error) => {
        console.error("Firestore stats error:", error);
        setSeedingText(`Firebase connection error: "${error.message}". Please make sure Firestore is enabled in your console and the Security Rules allow reads and writes.`);
        setLoading(false);
      }
    );

    // 2. Subscribe to passes (unlocked & unredeemed)
    const unsubPasses = onSnapshot(
      collection(db, 'passes'), 
      (snap) => {
        const loadedPasses = [];
        snap.forEach((doc) => {
          loadedPasses.push(doc.data());
        });
        setPasses(loadedPasses);
      },
      (error) => {
        console.error("Firestore passes error:", error);
      }
    );

    // 3. Subscribe to today's tasks
    const todayStr = getTodayDateString();
    const tasksQuery = query(collection(db, 'tasks'), where('date', '==', todayStr));
    const unsubTasks = onSnapshot(
      tasksQuery, 
      (snap) => {
        const loadedTasks = [];
        snap.forEach((doc) => {
          loadedTasks.push(doc.data());
        });
        setTasks(loadedTasks);
      },
      (error) => {
        console.error("Firestore tasks error:", error);
      }
    );



    return () => {
      unsubStats();
      unsubPasses();
      unsubTasks();
    };
  }, []);

  const [isGymsonTouched, setIsGymsonTouched] = useState(false);
  const [isSurvivalTouched, setIsSurvivalTouched] = useState(false);
  const [isPlannerTouched, setIsPlannerTouched] = useState(false);
  const [isJournalTouched, setIsJournalTouched] = useState(false);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning 🌅';
    if (hrs < 17) return 'Good Afternoon ☀️';
    if (hrs < 21) return 'Good Evening 🌆';
    return 'Good Night 🌙';
  };

  // Helper counts
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const remainingPasses = passes.filter(p => p.unlocked && !p.redeemed).length;

  if (loading || seedingText) {
    return (
      <main className="container main-content-wrapper">
        <div className="card page-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div className="spinner-loading"></div>
          <p style={{ marginTop: '20px', fontSize: '1.1rem', color: 'var(--text-main)' }}>
            {seedingText || 'Loading MoMo\'s Hub...'}
          </p>
        </div>
      </main>
    );
  }

  // XP percentage helper
  const xpPercent = Math.min(Math.max(stats.xp % 100, 0), 100);

  return (
    <main className="container main-content-wrapper">
      
      {/* Personalized Welcome Header */}
      <div className="dashboard-header" style={{ marginBottom: '16px' }}>
        <h2>{getGreeting()}</h2>
        <h1>MoMo's Hub <span className="brand-emoji">🤬</span></h1>
      </div>

      {/* Gamification Status Bar */}
      <div className="gamification-status-bar-card card" style={{ padding: '16px', borderRadius: '14px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award className="text-primary" size={20} />
            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>
              Level {stats.level}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame className="text-danger" size={18} style={{ fill: 'var(--danger)' }} />
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
              {stats.streak} Day Streak
            </span>
          </div>
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>XP: {stats.xp % 100} / 100</span>
            <span>Total XP: {stats.xp}</span>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px' }}>
            <div className="progress-bar-fill" style={{ width: `${xpPercent}%`, background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}></div>
          </div>
        </div>
      </div>

      {/* Welcome Intro Summary */}
      <div className="card" style={{ padding: '24px 20px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ fontSize: '1.02rem', color: 'var(--text-main)', lineHeight: '1.5', margin: 0 }}>
          Welcome back, MoMo. Your daily metrics are looking good. Select any card below to track your workouts, manage checklist tasks, or activate passes.
        </p>
      </div>

      {/* 2x2 Features Grid */}
      <div className="features-grid">

        {/* Card 1: Gymson */}
        <div
          className={`feature-card gymson-card ${isGymsonTouched ? 'touched' : ''}`}
          onClick={() => navigate('/gym')}
          onTouchStart={() => setIsGymsonTouched(true)}
          onTouchEnd={() => setIsGymsonTouched(false)}
          onMouseEnter={() => setIsGymsonTouched(true)}
          onMouseLeave={() => setIsGymsonTouched(false)}
        >
          <div className="card-bg-image" style={{ backgroundImage: 'url(/gymson.png)' }} />
          <div className="feature-icon-wrapper">
            <Dumbbell size={24} />
          </div>
          <h3>Gymson</h3>
          <p>Webcam form check & gym-bro roasts</p>
        </div>

        {/* Card 2: Marriage Survival Kit */}
        <div
          className={`feature-card survival-card ${isSurvivalTouched ? 'touched' : ''}`}
          onClick={() => navigate('/passes')}
          onTouchStart={() => setIsSurvivalTouched(true)}
          onTouchEnd={() => setIsSurvivalTouched(false)}
          onMouseEnter={() => setIsSurvivalTouched(true)}
          onMouseLeave={() => setIsSurvivalTouched(false)}
        >
          <div className="card-bg-image" style={{ backgroundImage: 'url(/survival_kit.png)' }} />
          <div className="feature-icon-wrapper">
            <Gift size={24} />
          </div>
          <h3>Survival Kit</h3>
          <p>{remainingPasses} unlocked passes ready</p>
        </div>

        {/* Card 3: Daily Planner */}
        <div
          className={`feature-card planner-card ${isPlannerTouched ? 'touched' : ''}`}
          onClick={() => navigate('/planner')}
          onTouchStart={() => setIsPlannerTouched(true)}
          onTouchEnd={() => setIsPlannerTouched(false)}
          onMouseEnter={() => setIsPlannerTouched(true)}
          onMouseLeave={() => setIsPlannerTouched(false)}
        >
          <div className="card-bg-image" style={{ backgroundImage: 'url(/cozy_walk.png)' }} />
          <div className="feature-icon-wrapper">
            <ListTodo size={24} />
          </div>
          <h3>Daily Planner</h3>
          <p>{completedTasks}/{totalTasks} tasks completed today</p>
        </div>

        {/* Card 4: Personal Journal */}
        <div
          className={`feature-card journal-card ${isJournalTouched ? 'touched' : ''}`}
          onClick={() => navigate('/journal')}
          onTouchStart={() => setIsJournalTouched(true)}
          onTouchEnd={() => setIsJournalTouched(false)}
          onMouseEnter={() => setIsJournalTouched(true)}
          onMouseLeave={() => setIsJournalTouched(false)}
        >
          <div className="card-bg-image" style={{ backgroundImage: 'url(/journal_hover.jpg)' }} />
          <div className="feature-icon-wrapper">
            <BookOpen size={24} />
          </div>
          <h3>Personal Journal</h3>
          <p>Document thoughts, logs, and private diary entries</p>
        </div>

      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '2rem' }}>
        ⚡️✨💪
      </div>

    </main>
  );
}
