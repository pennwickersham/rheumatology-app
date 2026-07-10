import { useState, useEffect, useRef } from 'react';
import { Shield, BookOpen, MessageCircle, Activity, CheckCircle, Loader2, RotateCcw, RefreshCw } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { Capacitor } from '@capacitor/core';

/**
 * Paywall Component
 */
const Paywall = ({ onClose }) => {
  const platform = Capacitor.getPlatform();
  const isIOS = platform === 'ios';
  const {
    isSubscribed,
    offerings,
    productInfo,
    offeringsLoading,
    beginPurchase,
    beginPurchaseFallback,
    cancelPurchaseState,
    purchaseInProgress,
    restore,
    refreshOfferings,
    refreshStatusWithSync,
  } = useSubscription();

  // Get the selected package from product info or offerings
  const selectedPackage = productInfo?.package || offerings?.monthly || offerings?.availablePackages?.[0] || null;
  // Get price string and other details from product info
  const priceString = productInfo?.priceString || '$6.99';
  // Check if free trial is available from the package's product
  const isFreeTrialAvailable = selectedPackage?.product?.introPrice?.price === 0;
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [restoreMsg, setRestoreMsg] = useState(null);
  const [purchaseElapsed, setPurchaseElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const elapsedTimerRef = useRef(null);
  const pollingRef = useRef(null);
  const gracefulTimeoutRef = useRef(null);
  const GRACEFUL_TIMEOUT_MS = 15000;

  useEffect(() => {
    if (purchaseInProgress) {
      setPurchaseElapsed(0);
      setTimedOut(false);
      setError(null);

      // Tick every second for progressive status display
      elapsedTimerRef.current = setInterval(() => {
        setPurchaseElapsed(prev => prev + 1);
      }, 1000);

      // Poll every 3 seconds with cache invalidation
      pollingRef.current = setInterval(async () => {
        try {
          console.log('[Paywall] Polling with cache invalidation...');
          await refreshStatusWithSync();
        } catch (e) {
          console.warn('[Paywall] Polling error (non-critical):', e.message);
        }
      }, 3000);

      // Graceful timeout
      gracefulTimeoutRef.current = setTimeout(() => {
        console.log('[Paywall] Graceful timeout reached');
        setTimedOut(true);
      }, GRACEFUL_TIMEOUT_MS);
    } else {
      setPurchaseElapsed(0);
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (gracefulTimeoutRef.current) {
        clearTimeout(gracefulTimeoutRef.current);
        gracefulTimeoutRef.current = null;
      }
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (gracefulTimeoutRef.current) clearTimeout(gracefulTimeoutRef.current);
    };
  }, [purchaseInProgress, refreshStatusWithSync]);

  // When the paywall opens and offerings are null, attempt to fetch them
  useEffect(() => {
    if (!offerings && !offeringsLoading) {
      refreshOfferings();
    }
  }, []);

  // Auto-close when subscription detected
  useEffect(() => {
    if (isSubscribed && purchaseInProgress) {
      console.log('[Paywall] Subscription detected — auto-closing paywall');
      onClose();
    }
  }, [isSubscribed, purchaseInProgress, onClose]);

  // Also auto-close if isSubscribed becomes true while paywall is open
  const initialSubscribedRef = useRef(isSubscribed);
  useEffect(() => {
    if (isSubscribed && !initialSubscribedRef.current) {
      console.log('[Paywall] Subscription status transitioned to active — closing');
      onClose();
    }
  }, [isSubscribed, onClose]);

  const handleSubscribe = async () => {
    setError(null);
    setTimedOut(false);

    const result = selectedPackage
      ? await beginPurchase(selectedPackage)
      : await beginPurchaseFallback();

    if (!result?.success && result?.error && result.error !== 'cancelled') {
      setError(result.error);
    }
  };

  const handleCheckAgain = async () => {
    setTimedOut(false);
    setError(null);
    try {
      console.log('[Paywall] Check Again — one final poll...');
      const status = await refreshStatusWithSync();
      if (status?.isActive) {
        onClose();
        return;
      }
    } catch (e) {
      console.warn('[Paywall] Check Again poll failed:', e.message);
    }
    cancelPurchaseState();
    setError('The purchase didn\'t complete this time. Your account was not charged. Please try again.');
  };

  const handleCancelPurchase = () => {
    cancelPurchaseState();
  };

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    setRestoreMsg(null);
    
    try {
      const result = await restore();
      
      if (result.isActive) {
        setRestoreMsg('Subscription restored!');
      } else {
        setRestoreMsg('No active subscription found. If you believe this is an error, please contact support.');
      }
    } catch (err) {
      console.error('[Paywall] Unexpected error during restore:', err);
      setRestoreMsg('Unable to restore. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  // Progressive status messages
  const getStatusMessage = () => {
    const storeName = isIOS ? 'App Store' : 'Google Play';
    if (purchaseElapsed >= 20) return `Almost there — the ${storeName} is still processing…`;
    if (purchaseElapsed >= 12) return `Waiting for ${storeName} response…`;
    if (purchaseElapsed >= 8) return `Processing with the ${storeName}…`;
    if (purchaseElapsed >= 4) return `Connecting to the ${storeName}…`;
    if (purchaseElapsed >= 2) return 'Starting purchase…';
    return 'Processing…';
  };

  const handleManageSubscription = () => {
    if (isIOS) {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    }
  };

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  };

  const panelStyle = {
    width: '100%',
    maxWidth: '380px',
    maxHeight: '85vh',
    overflowY: 'auto',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '28px',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
  };

  const heroStyle = {
    padding: '24px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #9333ea 100%)',
    position: 'relative',
    overflow: 'hidden',
  };

  const iconBadgeStyle = {
    width: '64px',
    height: '64px',
    margin: '0 auto 12px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  const sectionStyle = {
    padding: '20px',
  };

  const featureRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  };

  const featureIconWrapStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'rgba(14, 165, 233, 0.12)',
  };

  const primaryButtonStyle = {
    width: '100%',
    border: 'none',
    borderRadius: '14px',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #9333ea 100%)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: purchaseInProgress ? 'default' : 'pointer',
    opacity: purchaseInProgress ? 0.65 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 16px 40px rgba(14, 165, 233, 0.28)',
  };

  const secondaryButtonStyle = {
    width: '100%',
    borderRadius: '14px',
    padding: '12px 16px',
    border: '1px solid var(--border)',
    background: 'var(--bg-glass)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  };

  const ghostButtonStyle = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: 'var(--accent-primary)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 600,
    padding: '8px 12px',
    cursor: 'pointer',
  };

  const subtleButtonStyle = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    padding: '6px 12px',
    cursor: 'pointer',
  };

  const cardStyle = {
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '20px',
    textAlign: 'center',
    background: 'var(--bg-primary)',
  };

  const footerNoteStyle = {
    background: 'var(--bg-glass)',
    borderRadius: '14px',
    padding: '12px',
    color: 'var(--text-muted)',
    fontSize: '10px',
    lineHeight: 1.6,
    border: '1px solid var(--border)',
  };

  // If user is already subscribed
  if (isSubscribed) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...panelStyle, maxHeight: 'unset', overflow: 'hidden' }}>
          <div style={heroStyle}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={iconBadgeStyle}>
                <CheckCircle color="#ffffff" size={32} />
              </div>
              <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>You're Subscribed!</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Enjoy all premium features of RheumCompanion
              </p>
            </div>
          </div>
          <div style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 4px' }}>
                Your subscription is active and you have full access to all features.
              </p>
            </div>
            <button
              onClick={handleManageSubscription}
              style={secondaryButtonStyle}
            >
              Manage Subscription
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{ ...primaryButtonStyle, opacity: 1 }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        
        {/* Header with gradient */}
        <div style={heroStyle}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={iconBadgeStyle}>
              <Shield color="#ffffff" size={32} />
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Unlock RheumCompanion</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
              Your complete rheumatology toolkit
            </p>
          </div>
        </div>

        {/* Features */}
        <div style={{ ...sectionStyle, paddingBottom: '8px' }}>
          <div style={featureRowStyle}>
            <div style={featureIconWrapStyle}>
              <MessageCircle color="var(--accent-primary)" size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700, margin: 0 }}>AI Chatbot</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '2px 0 0', lineHeight: 1.4 }}>Ask rheumatology questions anytime</p>
            </div>
          </div>
          
          <div style={featureRowStyle}>
            <div style={featureIconWrapStyle}>
              <Activity color="var(--accent-primary)" size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700, margin: 0 }}>Symptom Tracker</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '2px 0 0', lineHeight: 1.4 }}>Track symptoms and progress</p>
            </div>
          </div>

          <div style={{ ...featureRowStyle, marginBottom: 0 }}>
            <div style={featureIconWrapStyle}>
              <BookOpen color="var(--accent-primary)" size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700, margin: 0 }}>Drug Interaction Checker</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '2px 0 0', lineHeight: 1.4 }}>Check for medication interactions</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div style={{ padding: '0 20px 8px' }}>
          <div style={cardStyle}>
            <p style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
              {priceString}<span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>/month</span>
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '8px 0 0', lineHeight: 1.5 }}>
              {isFreeTrialAvailable ? '7-day free trial, then auto-renewing monthly subscription' : 'Auto-renewing monthly subscription'}
            </p>
            
            {isIOS && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
                  Cancel anytime. Payment will be charged to your Apple ID account.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{ ...sectionStyle, paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            id="subscribe-btn"
            onClick={handleSubscribe}
            disabled={purchaseInProgress}
            style={primaryButtonStyle}
          >
            {purchaseInProgress ? (
              <>
                <Loader2 className="animate-spin" size={18} color="#ffffff" />
                {timedOut ? 'Still checking…' : getStatusMessage()}
              </>
            ) : (
              <>
                <CheckCircle size={18} color="#ffffff" />
                {isFreeTrialAvailable ? `Start Free Trial — ${priceString}/month` : `Subscribe — ${priceString}/month`}
              </>
            )}
          </button>

          {purchaseInProgress && timedOut && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleCheckAgain}
                style={{
                  ...secondaryButtonStyle,
                  background: 'rgba(14, 165, 233, 0.1)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(14, 165, 233, 0.15)',
                }}
              >
                <RefreshCw size={14} />
                Check Again
              </button>
              <button
                onClick={handleCancelPurchase}
                style={subtleButtonStyle}
              >
                Cancel
              </button>
            </div>
          )}

          {purchaseInProgress && !timedOut && purchaseElapsed >= 8 && (
            <button
              onClick={handleCancelPurchase}
              style={subtleButtonStyle}
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleRestore}
            disabled={restoring}
            style={ghostButtonStyle}
          >
            {restoring ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <RotateCcw size={14} />
            )}
            Restore Purchases
          </button>

          {error && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '12px',
                background: 'var(--bg-glass)',
                padding: '12px',
                borderRadius: '14px',
                lineHeight: 1.5,
                border: '1px solid var(--border)',
                margin: 0,
              }}>
                {error}
              </p>
              <button
                onClick={handleSubscribe}
                disabled={purchaseInProgress}
                style={{
                  ...secondaryButtonStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <RefreshCw size={14} className={purchaseInProgress ? 'animate-spin' : ''} />
                Try Again
              </button>
            </div>
          )}

          {restoreMsg && (
            <p style={{
              margin: 0,
              fontSize: '12px',
              textAlign: 'center',
              padding: '10px',
              borderRadius: '10px',
              color: restoreMsg.includes('restored') ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: restoreMsg.includes('restored') ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg-glass)',
            }}>
              {restoreMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 20px 20px' }}>
          {/* Subscription details */}
          <div style={footerNoteStyle}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, margin: '0 0 6px' }}>RheumCompanion Monthly Subscription</p>
            <p style={{ margin: 0 }}>• Duration: 1 month, auto-renewing</p>
            <p style={{ margin: 0 }}>• Price: {priceString}/month</p>
            {isIOS && (
              <>
                <p style={{ margin: 0 }}>• Payment charged to your Apple ID at confirmation of purchase</p>
                <p style={{ margin: 0 }}>• Manage or cancel in iPhone Settings → Apple ID → Subscriptions</p>
              </>
            )}
            <p style={{ margin: 0 }}>• Subscription renews unless cancelled at least 24 hours before the end of the current period</p>
          </div>

          {/* Legal links - required by App Store Guideline 3.1.2(c) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '12px',
            marginTop: '12px'
          }}>
            <a
              href="https://pennwickersham.github.io/rheumatology-app/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-primary)', fontSize: '10px', textDecoration: 'underline' }}
            >
              Privacy Policy
            </a>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>•</span>
            <a
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-primary)', fontSize: '10px', textDecoration: 'underline' }}
            >
              Terms of Use (EULA)
            </a>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={subtleButtonStyle}
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Paywall;
