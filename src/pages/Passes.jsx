import { useState, useEffect } from 'react';
import { Gift, Check, Lock } from 'lucide-react';
import { onSnapshot, updateDoc, query, orderBy, doc } from 'firebase/firestore';
import { auth, getUserStatsRef, getUserPassesCol, getUserType } from '../firebase';
import '../index.css';

export default function Passes() {
  const user = auth.currentUser;
  const uid = user ? user.uid : null;

  const [passes, setPasses] = useState([]);
  const [userLevel, setUserLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [successRedeemedId, setSuccessRedeemedId] = useState(null);
  const [openPassIds, setOpenPassIds] = useState(new Set());

  useEffect(() => {
    if (!uid) return;

    // 1. Subscribe to gamification stats to get user level
    const statsRef = getUserStatsRef(uid);
    const unsubStats = onSnapshot(statsRef, (snap) => {
      if (snap.exists()) {
        setUserLevel(snap.data().level || 1);
      }
    });

    // 2. Subscribe to passes collection
    const passesQuery = query(getUserPassesCol(uid), orderBy('id'));
    const unsubPasses = onSnapshot(passesQuery, (snap) => {
      const loadedPasses = [];
      snap.forEach((doc) => {
        loadedPasses.push({ ...doc.data(), id: doc.id });
      });
      // Sort numerically by id (since ID is string '1'..'10')
      loadedPasses.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      setPasses(loadedPasses);
      setLoading(false);
    });

    return () => {
      unsubStats();
      unsubPasses();
    };
  }, [uid]);

  // Check if any passes need to be updated to unlocked: true in Firestore
  useEffect(() => {
    if (!uid) return;
    passes.forEach(async (pass) => {
      if (userLevel >= pass.unlockLevel && !pass.unlocked) {
        try {
          const passRef = doc(getUserPassesCol(uid), pass.id);
          await updateDoc(passRef, { unlocked: true });
        } catch (err) {
          console.error("Error unlocking pass:", err);
        }
      }
    });
  }, [passes, userLevel, uid]);

  const togglePass = (id, isLocked) => {
    if (isLocked) return; // Can't toggle locked passes
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

  const handleRedeemPass = async (id, e) => {
    e.stopPropagation(); // prevent toggling fold on header click
    if (!uid) return;
    try {
      const passRef = doc(getUserPassesCol(uid), id);
      await updateDoc(passRef, { redeemed: true });
      setSuccessRedeemedId(id);
      setTimeout(() => {
        setSuccessRedeemedId(null);
      }, 2000);
    } catch (err) {
      console.error("Error redeeming pass:", err);
    }
  };

  if (loading) {
    return (
      <main className="container main-content-wrapper">
        <div className="card page-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner-loading"></div>
          <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading survival kit...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container main-content-wrapper">
      <div className="card page-card">
        
        {/* Page Header */}
        <div className="page-header-title">
          <Gift size={28} className="text-primary" />
          <div>
            <h1>Marriage Survival Kit</h1>
            <p>Annoy each other forever. Claim vouchers for special favors!</p>
          </div>
        </div>

        {/* Animated Text Quote */}
        <div className="survival-quote-text" style={{ margin: '16px 0 24px' }}>
          Mood swings & fights are temporary, but annoying each other is permanent. 😈
        </div>

        {/* List of Passes */}
        <div className="passes-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {passes.map(pass => {
            const isLocked = userLevel < pass.unlockLevel;
            const isOpen = openPassIds.has(pass.id) && !isLocked;
            
            return (
              <div
                key={pass.id}
                className={`folded-pass ${isOpen ? 'open' : ''} ${pass.redeemed ? 'redeemed' : ''} ${isLocked ? 'locked-pass-card' : ''}`}
                onClick={() => togglePass(pass.id, isLocked)}
              >
                
                {/* Redemption Overlay */}
                {successRedeemedId === pass.id && (
                  <div className="redeem-success-overlay">
                    <div className="success-ribbon">PASS ACTIVATED</div>
                    <div className="success-title">Redeemed 🎫</div>
                    <div className="success-sub">Show this screen to redeem your favor!</div>
                  </div>
                )}

                {/* Locked Cover Overlay */}
                {isLocked && (
                  <div className="locked-pass-overlay">
                    <Lock size={20} className="text-muted" />
                    <span>Locked until Level {pass.unlockLevel}</span>
                  </div>
                )}

                <div className="folded-pass-header" style={{ opacity: isLocked ? 0.35 : 1 }}>
                  <div className="folded-pass-title-wrapper">
                    <h3>{pass.title}</h3>
                    {pass.redeemed && <span className="redeemed-badge-small">Claimed</span>}
                  </div>
                  <div className="folded-pass-indicator">
                    {isLocked ? '🔒 Locked' : (isOpen ? 'Fold 🔼' : 'Unfold 🔽')}
                  </div>
                </div>

                <div className="folded-pass-body-container">
                  <div className="folded-pass-body">
                    <p className="pass-description">
                      "{getUserType(user) === 'poojitha' 
                        ? pass.desc.replace(/\bPooja\b/g, 'Praneeth').replace(/\bpooja\b/g, 'praneeth') 
                        : pass.desc}"
                    </p>
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
    </main>
  );
}
