import { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import '../index.css';

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [search, setSearch] = useState('');

  // Format Helper: YYYY-MM-DD
  const formatDateStr = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = formatDateStr(selectedDate);

  // Subscribe to Journal Logs from Firestore ordered by timestamp
  useEffect(() => {
    const journalQuery = query(collection(db, 'journal'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(journalQuery, (snap) => {
      const loaded = [];
      snap.forEach((doc) => {
        loaded.push({ ...doc.data(), id: doc.id });
      });
      setEntries(loaded);
    });
    return () => unsub();
  }, []);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const today = new Date();
    const timeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetDateStr = showCalendar ? selectedDateStr : formatDateStr(today);

    const newId = Date.now().toString();
    const newEntry = {
      id: newId,
      title: title.trim(),
      content: content.trim(),
      mood,
      date: targetDateStr,
      time: timeStr,
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, 'journal', newId), newEntry);
      setTitle('');
      setContent('');
      setMood('neutral');
    } catch (err) {
      console.error("Error adding journal entry:", err);
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await deleteDoc(doc(db, 'journal', id));
    } catch (err) {
      console.error("Error deleting journal entry:", err);
    }
  };

  const getMoodEmoji = (moodKey) => {
    const emojis = {
      happy: '😊',
      grumpy: '🤬',
      tired: '😴',
      gym: '🏋️',
      hungry: '🍕',
      neutral: '📝'
    };
    return emojis[moodKey] || '📝';
  };

  const formatLogDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  };

  // Build filter list
  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
                          e.content.toLowerCase().includes(search.toLowerCase());
    if (showCalendar) {
      return matchesSearch && e.date === selectedDateStr;
    }
    return matchesSearch;
  });

  // Calendar calculations
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
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

  // Map dates containing entries
  const datesWithEntries = {};
  entries.forEach(e => {
    if (e.date) datesWithEntries[e.date] = true;
  });

  return (
    <main className="container main-content-wrapper">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        
        {/* Header Title Card */}
        <div className="card page-card" style={{ padding: '24px' }}>
          <div className="page-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BookOpen size={28} className="text-primary" />
              <div>
                <h1 style={{ margin: 0 }}>Personal Journal</h1>
                <p style={{ margin: 0 }}>Document thoughts, milestones, and diary logs</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                setShowCalendar(!showCalendar);
                setSelectedDate(new Date());
              }} 
              className={`btn-priority-select ${showCalendar ? 'active' : ''}`}
              style={{ padding: '8px 14px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Calendar size={16} />
              {showCalendar ? 'Show All Logs' : 'Browse by Date'}
            </button>
          </div>
        </div>

        {/* Optional Calendar Navigation view */}
        {showCalendar && (
          <div className="calendar-card" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
            
            <div className="calendar-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button type="button" onClick={handlePrevMonth} className="btn-priority-select" style={{ padding: '6px 10px' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>
                {getMonthName(currentMonth)} {currentYear}
              </span>
              <button type="button" onClick={handleNextMonth} className="btn-priority-select" style={{ padding: '6px 10px' }}>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="calendar-weekdays-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>

            <div className="calendar-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                const isSelected = selectedDateStr === dateStr;
                const isToday = formatDateStr(new Date()) === dateStr;
                
                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => setSelectedDate(new Date(currentYear, currentMonth, dayNum))}
                    className={`calendar-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    style={{ 
                      position: 'relative', 
                      aspectRatio: '1', 
                      border: 'none', 
                      borderRadius: '8px', 
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
                    {datesWithEntries[dateStr] && (
                      <span className="calendar-status-dot note-dot" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2-Column Grid on Desktop */}
        <div className="journal-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          
          {/* Write Entry Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.15rem' }}>
              {showCalendar 
                ? `Write Entry for ${selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`
                : 'Write New Log Entry (Today)'
              }
            </h3>
            
            <form onSubmit={handleAddEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Entry Title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ padding: '12px' }}
                required
              />

              <textarea
                className="form-input"
                placeholder="Write whatever is on your mind today, MoMo..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ padding: '12px', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                required
              />

              {/* Mood picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mood tag for entry:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { key: 'neutral', emoji: '📝', label: 'Neutral' },
                    { key: 'happy', emoji: '😊', label: 'Happy' },
                    { key: 'grumpy', emoji: '🤬', label: 'Grumpy' },
                    { key: 'tired', emoji: '😴', label: 'Tired' },
                    { key: 'gym', emoji: '🏋️', label: 'Gym' },
                    { key: 'hungry', emoji: '🍕', label: 'Hungry' }
                  ].map(m => (
                    <button
                      key={m.key}
                      type="button"
                      className={`btn-mood-tag-select ${mood === m.key ? 'active' : ''}`}
                      onClick={() => setMood(m.key)}
                      style={{ padding: '8px 12px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', background: mood === m.key ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)', color: mood === m.key ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                <Plus size={20} /> Save Entry
              </button>
            </form>
          </div>

          {/* Diary Entries List Card */}
          <div className="card" style={{ padding: '24px' }}>
            
            {/* Search inputs */}
            <div className="search-bar-container" style={{ display: 'flex', alignItems: 'center', background: '#000', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '12px', marginBottom: '20px' }}>
              <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search logged entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                {showCalendar 
                  ? `Entries for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (${filteredEntries.length})`
                  : `Previous Entries (${filteredEntries.length})`
                }
              </h3>
              {showCalendar && (
                <button 
                  type="button" 
                  onClick={() => setShowCalendar(false)} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
                >
                  ← Show All Logs
                </button>
              )}
            </div>

            {/* List */}
            <div className="journal-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredEntries.map(entry => (
                <div key={entry.id} className="journal-entry-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', position: 'relative' }}>
                  
                  {/* Delete Button */}
                  <button
                    className="btn-delete-task"
                    onClick={() => handleDeleteEntry(entry.id)}
                    style={{ position: 'absolute', top: '16px', right: '16px' }}
                    title="Delete Entry"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.3rem' }} title={`Mood: ${entry.mood}`}>{getMoodEmoji(entry.mood)}</span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', margin: 0, paddingRight: '30px' }}>{entry.title}</h4>
                  </div>

                  <p style={{ color: '#ccc', fontSize: '0.92rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                    {entry.content}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Calendar size={12} />
                    <span>{formatLogDate(entry.date)} at {entry.time}</span>
                  </div>

                </div>
              ))}

              {filteredEntries.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  No entries found. {showCalendar ? "Write a note on the left for this day!" : "Start writing your logs today!"}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
