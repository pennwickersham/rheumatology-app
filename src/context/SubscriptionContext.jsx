import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initializeRevenueCat,
  checkSubscriptionStatus,
  invalidateAndCheckStatus,
  setupCustomerInfoListener,
  getOfferings,
  purchasePackage,
  purchaseStoreProduct,
  restorePurchases
} from '../services/subscriptionService';

const SubscriptionContext = createContext(null);

const PRODUCT_ID = 'com.rheumcompanion.app.monthly';
const TEST_SUBSCRIPTION_KEY = 'rheumcompanion_test_subscription';

function hasTestSubscriptionOverride() {
  try {
    return window.localStorage.getItem(TEST_SUBSCRIPTION_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistTestSubscriptionOverride() {
  try {
    window.localStorage.setItem(TEST_SUBSCRIPTION_KEY, 'true');
  } catch {
    // Ignore storage failures in temporary test mode.
  }
}

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrialing, setIsTrialing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState(null);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);

  // Initialize RevenueCat and check status on mount
  useEffect(() => {
    let didTimeout = false;

    const timeoutId = setTimeout(() => {
      didTimeout = true;
      console.warn('[SubscriptionContext] Init timed out — failing closed (paywall visible)');
      setIsSubscribed(false);
      setIsLoading(false);
    }, 15000);

    async function init() {
      try {
        await initializeRevenueCat();
        if (didTimeout) return;

        const status = await checkSubscriptionStatus();
        if (didTimeout) return;
        setIsSubscribed(status.isActive || hasTestSubscriptionOverride());
        setIsTrialing(status.isTrialing);

        // Pre-fetch offerings for the paywall (don't block on this)
        setOfferingsLoading(true);
        fetchOfferingsWithRetry(didTimeout);
      } catch (err) {
        console.error('[SubscriptionContext] Init error:', err);
        if (!didTimeout) setIsSubscribed(false);
      } finally {
        clearTimeout(timeoutId);
        if (!didTimeout) setIsLoading(false);
      }
    }

    /**
     * Fetch offerings with a secondary retry if the first attempt returns null.
     * Sandbox environments often need extra time for offerings to become available.
     */
    function fetchOfferingsWithRetry(cancelled) {
      getOfferings()
        .then(o => {
          if (cancelled) return;
          if (o) {
            setOfferings(o);
            setOfferingsLoading(false);
          } else {
            console.warn('[SubscriptionContext] Initial offerings null, retrying in 3s...');
            setTimeout(() => {
              if (cancelled) return;
              getOfferings()
                .then(o2 => { if (!cancelled) setOfferings(o2); })
                .catch(() => {})
                .finally(() => { if (!cancelled) setOfferingsLoading(false); });
            }, 3000);
          }
        })
        .catch(() => {
          if (!cancelled) setOfferingsLoading(false);
        });
    }

    init();

    return () => clearTimeout(timeoutId);
  }, []);

  // Register CustomerInfo listener
  useEffect(() => {
    let cleanup = () => {};

    async function registerListener() {
      cleanup = await setupCustomerInfoListener(({ isActive, isTrialing: trial }) => {
        const effectiveActive = isActive || hasTestSubscriptionOverride();
        console.log('[SubscriptionContext] CustomerInfo listener update: isActive =', effectiveActive);
        setIsSubscribed(effectiveActive);
        setIsTrialing(trial);
        if (effectiveActive) {
          setShowPaywall(false);
          setPurchaseInProgress(false);
        }
      });
    }

    registerListener();
    return () => cleanup();
  }, []);

  // Allow Paywall to trigger a re-fetch of offerings
  const refreshOfferings = useCallback(async () => {
    setOfferingsLoading(true);
    try {
      const o = await getOfferings();
      setOfferings(o);
      return o;
    } catch {
      return null;
    } finally {
      setOfferingsLoading(false);
    }
  }, []);

  /**
   * Purchase with direct await and error feedback
   */
  const beginPurchase = useCallback(async (pkg) => {
    if (!pkg) {
      return { success: false, error: 'No package provided' };
    }

    setPurchaseInProgress(true);
    console.log('[SubscriptionContext] beginPurchase: starting purchase (awaited)');

    try {
      const result = await purchasePackage(pkg);
      console.log('[SubscriptionContext] Purchase resolved:', result.success);
      if (result.success) {
        setIsSubscribed(true);
        setShowPaywall(false);
        setPurchaseInProgress(false);
        return result;
      } else if (result.error === 'cancelled') {
        console.log('[SubscriptionContext] User cancelled purchase');
        setPurchaseInProgress(false);
        return result;
      } else {
        console.warn('[SubscriptionContext] Purchase error:', result.error);
        setPurchaseInProgress(false);
        return result;
      }
    } catch (err) {
      console.error('[SubscriptionContext] Purchase rejected:', err);
      setPurchaseInProgress(false);
      return { success: false, error: err.message || 'Purchase failed. Please try again.' };
    }
  }, []);

  /**
   * Fallback purchase by product ID
   */
  const beginPurchaseFallback = useCallback(async () => {
    setPurchaseInProgress(true);
    console.log('[SubscriptionContext] beginPurchaseFallback: starting purchase (awaited)');

    try {
      const result = await purchaseStoreProduct(PRODUCT_ID);
      console.log('[SubscriptionContext] Fallback purchase resolved:', result.success);
      if (result.success) {
        setIsSubscribed(true);
        setShowPaywall(false);
        setPurchaseInProgress(false);
        return result;
      } else if (result.error === 'cancelled') {
        console.log('[SubscriptionContext] User cancelled purchase (fallback)');
        setPurchaseInProgress(false);
        return result;
      } else {
        console.warn('[SubscriptionContext] Fallback purchase error:', result.error);
        setPurchaseInProgress(false);
        return result;
      }
    } catch (err) {
      console.error('[SubscriptionContext] Fallback purchase rejected:', err);
      setPurchaseInProgress(false);
      return { success: false, error: err.message || 'Purchase failed. Please try again.' };
    }
  }, []);

  // Cancel a purchase-in-progress (user wants to dismiss)
  const cancelPurchaseState = useCallback(() => {
    setPurchaseInProgress(false);
  }, []);

  const restore = useCallback(async () => {
    const result = await restorePurchases();
    if (result.isActive) {
      setIsSubscribed(true);
      setShowPaywall(false);
    }
    return result;
  }, []);

  const refreshStatus = useCallback(async () => {
    const status = await checkSubscriptionStatus();
    setIsSubscribed(status.isActive || hasTestSubscriptionOverride());
    setIsTrialing(status.isTrialing);
  }, []);

  // Aggressive refresh with cache invalidation
  const refreshStatusWithSync = useCallback(async () => {
    const status = await invalidateAndCheckStatus();
    const effectiveActive = status.isActive || hasTestSubscriptionOverride();
    setIsSubscribed(effectiveActive);
    setIsTrialing(status.isTrialing);
    if (effectiveActive && purchaseInProgress) {
      console.log('[SubscriptionContext] Subscription detected via polling — ending purchase state');
      setPurchaseInProgress(false);
    }
    return { ...status, isActive: effectiveActive };
  }, [purchaseInProgress]);

  const activateTestSubscription = useCallback(() => {
    persistTestSubscriptionOverride();
    setIsSubscribed(true);
    setShowPaywall(false);
    setPurchaseInProgress(false);
  }, []);

  const value = {
    isSubscribed,
    isTrialing,
    isLoading,
    offerings,
    offeringsLoading,
    showPaywall,
    setShowPaywall,
    purchaseInProgress,
    beginPurchase,
    beginPurchaseFallback,
    cancelPurchaseState,
    restore,
    refreshOfferings,
    refreshStatus,
    refreshStatusWithSync,
    activateTestSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
