import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Gift, X, Check } from 'lucide-react';

const INITIAL_PASSES = [
  { id: '1', title: '🎫 Skip One Fight Pass', desc: 'Lite teesko bro', redeemed: false },
  { id: '2', title: '🎫 Gym Ego Protection Pass', desc: 'Can be used when Pooja tries to correct workout form😎', redeemed: false },
  { id: '3', title: '🎫 Midnight Food Demand Pass', desc: 'Edhina tinalanipistundhi - Maggi/ egg fried rice/ 4 am biryani', redeemed: false },
  { id: '4', title: '🎫 Silent Treatment Breaker Pass', desc: 'Inka chaaaaaalu inka chaaalu', redeemed: false },
  { id: '5', title: '🎫 I’m Mad But Come Here Pass', desc: 'Nenu aliganu bunga moothi pettukunna', redeemed: false }
];

// Other constants discarded to show only Gymson & Marriage Survival Kit

export default function Home() {
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState(null);

  // Load/save passes state in localStorage
  const [passes, setPasses] = useState(() => {
    const saved = localStorage.getItem('momo_passes_v3');
    return saved ? JSON.parse(saved) : INITIAL_PASSES;
  });

  useEffect(() => {
    localStorage.setItem('momo_passes_v3', JSON.stringify(passes));
  }, [passes]);

  const [successRedeemedId, setSuccessRedeemedId] = useState(null);
  const [isGymsonTouched, setIsGymsonTouched] = useState(false);
  const [isSurvivalTouched, setIsSurvivalTouched] = useState(false);
  const [openPassIds, setOpenPassIds] = useState(new Set());

  const togglePass = (id) => {
    setOpenPassIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRedeemPass = (id, e) => {
    e.stopPropagation(); // prevent toggling fold on button click
    setPasses(prev => prev.map(p => p.id === id ? { ...p, redeemed: true } : p));
    setSuccessRedeemedId(id);
    setTimeout(() => {
      setSuccessRedeemedId(null);
    }, 2000);
  };

  return (
    <div className="container" style={{ paddingTop: '10px' }}>

      {/* Personalized Welcome Header */}
      <div className="dashboard-header">
        <h2>Happy Birthday</h2>
        <h1>MoMo <span className="brand-emoji">🤬</span></h1>
      </div>

      {/* Intro message */}
      <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
          Welcome to your personal space. Pick a card below to explore your birthday features!
        </p>
      </div>

      {/* 2x2 Features Grid */}
      <div className="features-grid">

        {/* Card 1: Gym Tracker (Routes to existing gym check page) */}
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
          onClick={() => setActiveSheet('coupons')}
          onTouchStart={() => setIsSurvivalTouched(true)}
          onTouchEnd={() => setIsSurvivalTouched(false)}
          onMouseEnter={() => setIsSurvivalTouched(true)}
          onMouseLeave={() => setIsSurvivalTouched(false)}
        >
          <div className="card-bg-image" style={{ backgroundImage: 'url(/survival_kit.png)' }} />
          <div className="feature-icon-wrapper">
            <Gift size={24} />
          </div>
          <h3>Marriage Survival Kit</h3>
          <p>Annoy each other forever</p>
        </div>

      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '2rem' }}>
        🎂✨🎉
      </div>

      {/* --- FEATURE SLIDING SHEETS --- */}

      {/* 1. Marriage Survival Kit Sheet */}
      {activeSheet === 'coupons' && (
        <div className="feature-sheet">
          <div className="sheet-container">
            <div className="sheet-header">
              <h2 style={{ color: 'var(--primary)' }}>
                <Gift size={24} /> Marriage Survival Kit
              </h2>
              <button className="btn-close" onClick={() => setActiveSheet(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Animated Text Quote */}
            <div className="survival-quote-text">
              Mood swings & Fights are temporary, but annoying each other is permanent.
            </div>

            <div className="passes-list">
              {passes.map(pass => {
                const isOpen = openPassIds.has(pass.id);
                return (
                  <div
                    key={pass.id}
                    className={`folded-pass ${isOpen ? 'open' : ''} ${pass.redeemed ? 'redeemed' : ''}`}
                    onClick={() => togglePass(pass.id)}
                  >

                    {/* Pass Redemption Success Animation Overlay */}
                    {successRedeemedId === pass.id && (
                      <div className="redeem-success-overlay">
                        <div className="success-ribbon">PASS ACTIVATED</div>
                        <div className="success-title">Redeemed 🎫</div>
                        <div className="success-sub">Show this screen to redeem your favor!</div>
                      </div>
                    )}

                    <div className="folded-pass-header">
                      <div className="folded-pass-title-wrapper">
                        <h3>{pass.title}</h3>
                        {pass.redeemed && <span className="redeemed-badge-small">Claimed</span>}
                      </div>
                      <div className="folded-pass-indicator">
                        {isOpen ? 'Fold 🔼' : 'Unfold 🔽'}
                      </div>
                    </div>

                    <div className="folded-pass-body-container">
                      <div className="folded-pass-body">
                        <p className="pass-description">"{pass.desc}"</p>
                        <div className="pass-actions">
                          {pass.redeemed ? (
                            <span className="pass-claimed-badge">
                              <Check size={14} /> Claimed
                            </span>
                          ) : (
                            <button className="btn-redeem-pass" onClick={(e) => handleRedeemPass(pass.id, e)}>
                              Activate Pass
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
