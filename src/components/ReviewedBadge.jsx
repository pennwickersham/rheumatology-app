/* RheumCompanion — Co-branding components
   ReviewedBadge: physician-review trust marker for content pages.
   BrandFooter: ecosystem line linking the app to The Resilient Path
   and brewsterwickershampublications.com.
   Place per INTEGRATION-GUIDE.md (Home, disease pages, About). */

export function ReviewedBadge({ date }) {
  return (
    <div className="rvb" role="note">
      <style>{`
        .rvb{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:10px 0;
          border-radius:999px;background:rgba(89,217,157,.09);
          border:1px solid rgba(89,217,157,.4);width:fit-content;max-width:100%}
        .rvb .ic{font-size:16px}
        .rvb .tx{font-size:12px;line-height:1.35;color:var(--text-secondary,#bfe9d4)}
        .rvb .tx b{color:#7fe0ae;font-weight:700}
      `}</style>
      <span className="ic" aria-hidden="true">🩺</span>
      <span className="tx">
        <b>Medically reviewed</b> by Pendleton B. Wickersham, MD — Rheumatologist
        {date ? ' · ' + date : ''}
      </span>
    </div>
  );
}

export function BrandFooter() {
  return (
    <footer className="bft">
      <style>{`
        .bft{margin:26px 0 10px;padding-top:14px;text-align:center;
          border-top:1px solid var(--border,#232c47)}
        .bft p{margin:0 0 4px;font-size:12px;color:var(--text-secondary,#8a94b0)}
        .bft a{color:var(--accent,#8fb8ff);text-decoration:none;font-weight:600}
      `}</style>
      <p>From the author of <i>The Resilient Path: Modern Strategies for Living with Chronic Pain</i></p>
      <p>
        <a href="https://brewsterwickershampublications.com"
           target="_blank" rel="noopener noreferrer">
          brewsterwickershampublications.com
        </a>
      </p>
    </footer>
  );
}
