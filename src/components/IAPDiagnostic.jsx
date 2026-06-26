import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { Capacitor } from '@capacitor/core';
import {
  checkSubscriptionStatus,
  invalidateAndCheckStatus,
  getOfferings
} from '../services/subscriptionService';

const IAPDiagnostic = ({ onClose }) => {
  const { isSubscribed, isLoading, refreshStatus } = useSubscription();
  const [diagnostics, setDiagnostics] = useState([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setRunning(true);
    const diag = [];

    // Check platform
    diag.push({
      name: 'Platform',
      status: Capacitor.isNativePlatform() ? 'success' : 'warning',
      message: Capacitor.isNativePlatform()
        ? `Running on ${Capacitor.getPlatform()}`
        : 'Not on native platform - IAP disabled'
    });

    // Check initial subscription status
    const initialStatus = await checkSubscriptionStatus();
    diag.push({
      name: 'Subscription Status (cached)',
      status: initialStatus.isActive ? 'success' : 'warning',
      message: `isActive: ${initialStatus.isActive}, isTrialing: ${initialStatus.isTrialing}`
    });

    // Check offerings
    try {
      const offerings = await getOfferings();
      diag.push({
        name: 'RevenueCat Offerings',
        status: offerings ? 'success' : 'error',
        message: offerings
          ? `Found ${offerings.availablePackages?.length || 0} packages`
          : 'No offerings available'
      });
    } catch (e) {
      diag.push({
        name: 'RevenueCat Offerings',
        status: 'error',
        message: `Error: ${e.message}`
      });
    }

    // Invalidate and check again
    const freshStatus = await invalidateAndCheckStatus();
    diag.push({
      name: 'Subscription Status (fresh)',
      status: freshStatus.isActive ? 'success' : 'warning',
      message: `isActive: ${freshStatus.isActive}, isTrialing: ${freshStatus.isTrialing}`
    });

    // Check context state
    diag.push({
      name: 'React Context State',
      status: isSubscribed ? 'success' : (isLoading ? 'warning' : 'warning'),
      message: `isSubscribed: ${isSubscribed}, isLoading: ${isLoading}`
    });

    setDiagnostics(diag);
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-[var(--border)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">IAP Diagnostics</h2>
          <button 
            onClick={onClose} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {diagnostics.map((d, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-glass)]">
              {d.status === 'success' ? (
                <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={18} />
              ) : d.status === 'error' ? (
                <XCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
              ) : (
                <div className="w-4.5 h-4.5 border-2 border-yellow-400 rounded-full shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{d.name}</p>
                <p className="text-[var(--text-secondary)] text-xs mt-1">{d.message}</p>
              </div>
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Running diagnostics...</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            <RefreshCw className={running ? 'animate-spin' : ''} size={16} />
            Refresh
          </button>
          <button
            onClick={refreshStatus}
            className="flex-1 bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] text-[var(--text-primary)] font-semibold py-2.5 px-4 rounded-lg transition-colors border border-[var(--border)]"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default IAPDiagnostic;
