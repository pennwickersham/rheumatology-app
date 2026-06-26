/**
 * Subscription Service — RevenueCat Integration
 *
 * Handles all RevenueCat interactions for the RheumCompanion app.
 * Product: com.rheumcompanion.app.monthly ($6.99/month with 7-day free trial)
 */
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, ENTITLEMENT_VERIFICATION_MODE, PURCHASES_ARE_COMPLETED_BY_TYPE } from '@revenuecat/purchases-capacitor';

// ─── CONFIGURATION ───────────────────────────────────────────────
// RevenueCat Public SDK API keys
const REVENUECAT_API_KEY_APPLE = 'appl_your_apple_key_here'; // TODO: Replace with your actual key
const REVENUECAT_API_KEY_GOOGLE = 'goog_your_google_key_here'; // TODO: Replace with your actual key

const PRODUCT_ID = 'com.rheumcompanion.app.monthly';

// ─── STATE ───────────────────────────────────────────────────────
let isInitialized = false;
let isConfiguredSuccessfully = false;
let customerInfoListenerRemover = null;

/**
 * Helper: detect user-initiated purchase cancellation across RevenueCat versions.
 */
function isPurchaseCancelled(err) {
  if (!err) return false;
  // RevenueCat error code 1 = user cancelled
  if (err.code === 1 || err.code === '1') return true;
  if (err.userCancelled === true) return true;
  const msg = (err.message || err.readableErrorCode || '').toLowerCase();
  return msg.includes('cancelled') || msg.includes('canceled') || msg.includes('user cancelled')
    || msg.includes('purchase_cancelled');
}

/**
 * Initialize RevenueCat SDK. Call once on app startup.
 */
export async function initializeRevenueCat() {
  if (isInitialized) return;

  if (!Capacitor.isNativePlatform()) {
    console.log('[SubscriptionService] Skipping init — not on native platform');
    isInitialized = true;
    return;
  }

  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios' ? REVENUECAT_API_KEY_APPLE : REVENUECAT_API_KEY_GOOGLE;

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey,
      entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
      pendingTransactionsForPrepaidPlansEnabled: true,
      diagnosticsEnabled: true,
      purchasesAreCompletedBy: PURCHASES_ARE_COMPLETED_BY_TYPE.REVENUECAT,
    });
    isInitialized = true;
    isConfiguredSuccessfully = true;
    console.log(`[SubscriptionService] RevenueCat initialized for ${platform}`);
  } catch (err) {
    console.error('[SubscriptionService] Init failed:', err);
  }
}

/**
 * Register a listener for CustomerInfo updates from RevenueCat.
 *
 * @param {Function} onUpdate — called with { isActive, isTrialing } whenever status changes
 * @returns {Function} cleanup function to remove the listener
 */
export async function setupCustomerInfoListener(onUpdate) {
  if (!Capacitor.isNativePlatform()) return () => {};

  try {
    // Remove any existing listener first
    if (customerInfoListenerRemover) {
      try { customerInfoListenerRemover.remove(); } catch (_) {}
      customerInfoListenerRemover = null;
    }

    customerInfoListenerRemover = await Purchases.addCustomerInfoUpdateListener(
      ({ customerInfo }) => {
        console.log('[SubscriptionService] CustomerInfo listener fired');
        const entitlements = customerInfo?.entitlements?.active || {};
        const hasActive = Object.keys(entitlements).length > 0;
        let isTrialing = false;
        if (hasActive) {
          const first = Object.values(entitlements)[0];
          isTrialing = first?.periodType === 'TRIAL';
        }
        console.log('[SubscriptionService] Listener: isActive =', hasActive, ', isTrialing =', isTrialing);
        onUpdate({ isActive: hasActive, isTrialing });
      }
    );
    console.log('[SubscriptionService] CustomerInfo listener registered ✓');
    return () => {
      if (customerInfoListenerRemover) {
        try { customerInfoListenerRemover.remove(); } catch (_) {}
        customerInfoListenerRemover = null;
      }
    };
  } catch (err) {
    console.warn('[SubscriptionService] Failed to add CustomerInfo listener:', err.message);
    return () => {};
  }
}

/**
 * Ensure RevenueCat SDK is configured before making API calls.
 */
async function ensureConfigured() {
  if (isConfiguredSuccessfully) return true;

  if (!Capacitor.isNativePlatform()) return false;

  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios' ? REVENUECAT_API_KEY_APPLE : REVENUECAT_API_KEY_GOOGLE;

  console.log('[SubscriptionService] ensureConfigured: SDK not configured, attempting configure...');
  try {
    await Purchases.configure({
      apiKey,
      entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
      pendingTransactionsForPrepaidPlansEnabled: true,
      diagnosticsEnabled: true,
      purchasesAreCompletedBy: PURCHASES_ARE_COMPLETED_BY_TYPE.REVENUECAT,
    });
    isInitialized = true;
    isConfiguredSuccessfully = true;
    console.log('[SubscriptionService] ensureConfigured: SUCCESS — SDK now configured');
    return true;
  } catch (err) {
    console.error('[SubscriptionService] ensureConfigured: FAILED —', err.message);
    return false;
  }
}

/**
 * Check the current subscription status.
 * @returns {{ isActive: boolean, isTrialing: boolean, expirationDate: string|null }}
 */
export async function checkSubscriptionStatus() {
  // On web/desktop, auto-unlock everything
  if (!Capacitor.isNativePlatform()) {
    return { isActive: true, isTrialing: false, expirationDate: null };
  }

  await ensureConfigured();

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlements = customerInfo.entitlements.active;

    // Check if any entitlement is active
    const hasActive = Object.keys(entitlements).length > 0;

    // Check trial status from the first active entitlement
    let isTrialing = false;
    let expirationDate = null;

    if (hasActive) {
      const firstEntitlement = Object.values(entitlements)[0];
      isTrialing = firstEntitlement.periodType === 'TRIAL';
      expirationDate = firstEntitlement.expirationDate || null;
    }

    return { isActive: hasActive, isTrialing, expirationDate };
  } catch (err) {
    console.error('[SubscriptionService] Status check failed:', err);
    return { isActive: false, isTrialing: false, expirationDate: null };
  }
}

/**
 * Invalidate cache then check status — forces a fresh server fetch.
 */
export async function invalidateAndCheckStatus() {
  if (!Capacitor.isNativePlatform()) {
    return { isActive: false, isTrialing: false, expirationDate: null };
  }

  await ensureConfigured();

  try {
    // Invalidate cache so getCustomerInfo fetches fresh from server
    await Purchases.invalidateCustomerInfoCache();
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlements = customerInfo.entitlements.active;
    const hasActive = Object.keys(entitlements).length > 0;

    let isTrialing = false;
    let expirationDate = null;
    if (hasActive) {
      const firstEntitlement = Object.values(entitlements)[0];
      isTrialing = firstEntitlement.periodType === 'TRIAL';
      expirationDate = firstEntitlement.expirationDate || null;
    }

    return { isActive: hasActive, isTrialing, expirationDate };
  } catch (err) {
    console.error('[SubscriptionService] invalidateAndCheckStatus failed:', err);
    return { isActive: false, isTrialing: false, expirationDate: null };
  }
}

/**
 * Fetch available subscription offerings from RevenueCat.
 * @returns {Object|null} The current offering, or null if unavailable.
 */
export async function getOfferings() {
  if (!Capacitor.isNativePlatform()) return null;

  await ensureConfigured();

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings?.current) return offerings.current;
    console.warn('[SubscriptionService] offerings.current is null');
    return null;
  } catch (err) {
    console.error('[SubscriptionService] getOfferings failed:', err.message);
    return null;
  }
}

/**
 * Purchase a package
 * @param {Object} pkg — A RevenueCat package object from getOfferings()
 * @returns {{ success: boolean, customerInfo?: Object, error?: string }}
 */
export async function purchasePackage(pkg) {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Purchases not available on this platform' };
  }

  if (!(await ensureConfigured())) {
    return { success: false, error: 'Unable to connect to the subscription service. Please restart the app and try again.' };
  }

  console.log('[SubscriptionService] purchasePackage: calling Purchases.purchasePackage directly...');
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    console.log('[SubscriptionService] purchasePackage completed successfully');
    const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
    return { success: hasActive, customerInfo };
  } catch (err) {
    if (isPurchaseCancelled(err)) {
      console.log('[SubscriptionService] Purchase cancelled by user');
      return { success: false, error: 'cancelled' };
    }
    console.error('[SubscriptionService] purchasePackage failed:', err.message);
    return {
      success: false,
      error: 'Unable to complete purchase. Please check your internet connection and try again.'
    };
  }
}

/**
 * Fallback: purchase by product identifier directly.
 * @param {string} productId — The StoreKit product identifier
 * @returns {{ success: boolean, customerInfo?: Object, error?: string }}
 */
export async function purchaseStoreProduct(productId = PRODUCT_ID) {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Purchases not available on this platform' };
  }

  if (!(await ensureConfigured())) {
    return { success: false, error: 'Unable to connect to the subscription service. Please restart the app and try again.' };
  }

  try {
    console.log(`[SubscriptionService] Fetching product: ${productId}`);
    const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
    if (!products || products.length === 0) {
      return { success: false, error: 'The subscription is temporarily unavailable. Please try again in a moment.' };
    }

    const product = products[0];
    console.log('[SubscriptionService] Starting purchaseStoreProduct...');
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
    console.log('[SubscriptionService] purchaseStoreProduct completed');

    const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
    return { success: hasActive, customerInfo };
  } catch (err) {
    if (isPurchaseCancelled(err)) {
      console.log('[SubscriptionService] Purchase cancelled by user');
      return { success: false, error: 'cancelled' };
    }
    console.error('[SubscriptionService] purchaseStoreProduct failed:', err.message);
    return {
      success: false,
      error: 'Unable to complete purchase. Please check your internet connection and try again.'
    };
  }
}

/**
 * Restore previous purchases (for reinstalls or device switches).
 * @returns {{ isActive: boolean }}
 */
export async function restorePurchases() {
  if (!Capacitor.isNativePlatform()) {
    return { isActive: true }; // Web fallback
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
    return { isActive: hasActive };
  } catch (err) {
    console.error('[SubscriptionService] Restore failed:', err);
    return { isActive: false };
  }
}
