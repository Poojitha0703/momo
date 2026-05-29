import { doc, getDoc, setDoc, writeBatch, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const INITIAL_PASSES = [
  { id: '1', title: '🎫 Skip One Fight Pass', desc: 'Lite teesko bro', redeemed: false, unlockLevel: 1, unlocked: true },
  { id: '2', title: '🎫 Gym Ego Protection Pass', desc: 'Can be used when Pooja tries to correct workout form😎', redeemed: false, unlockLevel: 1, unlocked: true },
  { id: '3', title: '🎫 Midnight Food Demand Pass', desc: 'Edhina tinalanipistundhi - Maggi/ egg fried rice/ 4 am biryani', redeemed: false, unlockLevel: 1, unlocked: true },
  { id: '4', title: '🎫 Silent Treatment Breaker Pass', desc: 'Inka chaaaaaalu inka chaaalu', redeemed: false, unlockLevel: 1, unlocked: true },
  { id: '5', title: '🎫 I’m Mad But Come Here Pass', desc: 'Nenu aliganu bunga moothi pettukunna', redeemed: false, unlockLevel: 1, unlocked: true },
  
  // Unlocked gamified passes
  { id: '6', title: '🎫 Back Massage Pass 💆‍♂️', desc: 'Good for one 20-minute relaxing massage', redeemed: false, unlockLevel: 2, unlocked: false },
  { id: '7', title: '🎫 Cheat Meal Choice Pass 🍔', desc: 'You get to choose the next cheat meal without arguments', redeemed: false, unlockLevel: 4, unlocked: false },
  { id: '8', title: '🎫 Chores Day Off Pass 🧹', desc: 'Pooja handles all household chores for today', redeemed: false, unlockLevel: 6, unlocked: false },
  { id: '9', title: '🎫 One Free Wish Pass 🧞‍♂️', desc: 'Good for one free wish, no questions asked!', redeemed: false, unlockLevel: 8, unlocked: false },
  { id: '10', title: '🎫 Mega Birthday Treat Pass 🎁', desc: 'A special day out fully funded and planned by Pooja', redeemed: false, unlockLevel: 10, unlocked: false }
];

const INITIAL_MILESTONES = [
  { id: 'read_books', title: '📖 Read 10 books', category: 'lifestyle', target: 10, current: 0, xpReward: 150, completed: false },
  { id: 'limit_insta', title: '📱 Limit Instagram (90 Days)', category: 'lifestyle', target: 90, current: 0, xpReward: 150, completed: false },
  { id: 'watch_movies', title: '🎬 Watch 30 movies intentionally', category: 'lifestyle', target: 30, current: 0, xpReward: 150, completed: false },
  { id: 'watch_series', title: '📺 Watch 5 series (max 2 seasons)', category: 'lifestyle', target: 5, current: 0, xpReward: 150, completed: false },
  { id: 'meet_parents', title: '🏡 Meet parents once a week (13 weeks)', category: 'lifestyle', target: 13, current: 0, xpReward: 150, completed: false },
  { id: 'weight_praneeth', title: '⚖️ Praneeth Weight: 72kg', category: 'workout', target: 72, current: 78, xpReward: 200, completed: false },
  { id: 'weight_poojitha', title: '⚖️ Poojitha Weight: 55kg', category: 'workout', target: 55, current: 58, xpReward: 200, completed: false },
  { id: 'bodyfat_praneeth', title: '💪 Praneeth Body Fat: 16%', category: 'workout', target: 16, current: 20, xpReward: 200, completed: false }
];

const INITIAL_JOURNAL = [
  {
    id: 'journal_1',
    title: 'Workout Day 1 🏋️‍♂️',
    content: 'Felt strong today. Form was correct during Squats. Gymson was quiet, no roasts today! Let’s keep this up.',
    mood: 'gym',
    date: '2026-05-26',
    time: '04:30 PM'
  },
  {
    id: 'journal_2',
    title: 'Cheat meal biryani 🍕',
    content: 'Redeemed the Midnight Food Demand Pass for egg fried rice and double chicken biryani. Absolute bliss.',
    mood: 'hungry',
    date: '2026-05-25',
    time: '11:45 PM'
  }
];

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function seedDatabase(onProgress = () => {}) {
  const statsRef = doc(db, "gamification", "stats");
  const statsSnap = await getDoc(statsRef);
  
  const SEED_VERSION = 5;
  const currentVersion = statsSnap.exists() ? (statsSnap.data().seededVersion || 1) : 0;
  
  if (statsSnap.exists() && statsSnap.data().seeded && currentVersion === SEED_VERSION) {
    return;
  }
  
  console.log("Seeding Database...");
  onProgress("Checking database connection and seeding...");

  // If upgrading, clear out existing tasks to avoid duplicates
  if (currentVersion > 0 && currentVersion < SEED_VERSION) {
    onProgress("Cleaning up old database tasks...");
    const tasksSnap = await getDocs(collection(db, "tasks"));
    let batch = writeBatch(db);
    let count = 0;
    for (const d of tasksSnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    if (count % 400 !== 0) {
      await batch.commit();
    }
  }
  
  // 1. Generate tasks for June 1, 2026 to August 31, 2026
  const tasks = [];
  const startDate = new Date(2026, 5, 1); // June 1, 2026
  const endDate = new Date(2026, 7, 31); // August 31, 2026
  
  let current = new Date(startDate);
  let idCounter = 1;
  
  while (current <= endDate) {
    const dateStr = formatDate(current);
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Daily non-negotiables / lifestyle
    const dailyTasks = [
      { text: 'Drink 4L of water everyday 💧', priority: 'high', category: 'lifestyle', time: null },
      { text: 'Limit instagram usage to 20 min per day 📱', priority: 'medium', category: 'lifestyle', time: null },
      { text: 'Bath, do Pooja, Meal Prep, Quick snack 🥗', priority: 'medium', category: 'lifestyle', time: '09:45' },
      { text: 'Lunch break (12:30-1:30) & Dinner by 7:30 🍲', priority: 'medium', category: 'lifestyle', time: '12:30' },
      { text: 'Get on bed by 10:30 PM, sleep by 11 🛌', priority: 'high', category: 'lifestyle', time: '22:30' }
    ];

    // Gym and Work are omitted on Sundays (Rest Day)
    if (dayOfWeek !== 0) {
      dailyTasks.push({ text: 'Finish Gym by 9:30 AM 🏋️‍♂️', priority: 'high', category: 'workout', time: '08:00' });
      dailyTasks.push({ text: 'Start work by 10:30 AM 💼', priority: 'medium', category: 'work', time: '10:30' });
    }
    
    dailyTasks.forEach(task => {
      tasks.push({
        id: `seeded_${dateStr}_${idCounter++}`,
        text: task.text,
        priority: task.priority,
        category: task.category,
        completed: false,
        date: dateStr,
        time: task.time || null
      });
    });
    
    // Saturday specific
    if (dayOfWeek === 6) {
      tasks.push({
        id: `seeded_${dateStr}_${idCounter++}`,
        text: 'Sex once a week (Saturday) 👩‍❤️‍👨',
        priority: 'medium',
        category: 'lifestyle',
        completed: false,
        date: dateStr,
        time: '22:00'
      });
    }
    
    // Sunday specific
    if (dayOfWeek === 0) {
      tasks.push({
        id: `seeded_${dateStr}_${idCounter++}`,
        text: 'Meet parents once a week 🏡',
        priority: 'high',
        category: 'lifestyle',
        completed: false,
        date: dateStr,
        time: '11:00'
      });
      tasks.push({
        id: `seeded_${dateStr}_${idCounter++}`,
        text: 'Sunday night - light food (fruits/salad) 🥗',
        priority: 'high',
        category: 'lifestyle',
        completed: false,
        date: dateStr,
        time: '19:30'
      });
      tasks.push({
        id: `seeded_${dateStr}_${idCounter++}`,
        text: 'No unlimited buffets today 🚫🍕',
        priority: 'high',
        category: 'lifestyle',
        completed: false,
        date: dateStr,
        time: null
      });
    }
    
    // Weekdays specific (Monday to Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      tasks.push({
        id: `seeded_${dateStr}_${idCounter++}`,
        text: 'Work: Put out Live/Shorts/Videos on YouTube 🎥',
        priority: 'medium',
        category: 'work',
        completed: false,
        date: dateStr,
        time: '14:00'
      });
      tasks.push({
        id: `seeded_${dateStr}_${idCounter++}`,
        text: 'Work: Put out Reel/Podcast edit on Instagram 📸',
        priority: 'medium',
        category: 'work',
        completed: false,
        date: dateStr,
        time: '16:00'
      });
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  console.log(`Generated ${tasks.length} tasks. Seeding to Firestore...`);
  
  // 2. Batch write tasks (Firestore limit is 500 writes per batch)
  const batchSize = 400;
  for (let i = 0; i < tasks.length; i += batchSize) {
    onProgress(`Seeding tasks block ${Math.floor(i / batchSize) + 1}...`);
    const batch = writeBatch(db);
    const chunk = tasks.slice(i, i + batchSize);
    
    chunk.forEach(task => {
      const docRef = doc(db, "tasks", task.id);
      batch.set(docRef, task);
    });
    
    await batch.commit();
  }
  
  // 3. Seed passes
  onProgress("Seeding reward passes...");
  const passesBatch = writeBatch(db);
  INITIAL_PASSES.forEach(pass => {
    const docRef = doc(db, "passes", pass.id);
    passesBatch.set(docRef, pass);
  });
  await passesBatch.commit();
  
  // 4. Seed milestones
  onProgress("Seeding milestones...");
  const milestonesBatch = writeBatch(db);
  INITIAL_MILESTONES.forEach(m => {
    const docRef = doc(db, "epic_milestones", m.id);
    milestonesBatch.set(docRef, m);
  });
  await milestonesBatch.commit();
  
  // 5. Seed initial journal entries
  onProgress("Seeding journal entries...");
  const journalRef = collection(db, "journal");
  const journalSnap = await getDocs(journalRef);
  if (journalSnap.empty) {
    const journalBatch = writeBatch(db);
    INITIAL_JOURNAL.forEach(entry => {
      const docRef = doc(db, "journal", entry.id);
      journalBatch.set(docRef, entry);
    });
    await journalBatch.commit();
  }

  // 6. Seed stats document
  onProgress("Setting up profiles...");
  await setDoc(statsRef, {
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: "",
    seeded: true,
    seededVersion: SEED_VERSION
  });
  
  onProgress("Seeding completed successfully!");
}
