export default function Footer() {
  return (
    <footer className="shell__footer">
      <div className="shell__footer-left">
        <div className="shell__lockup">
          <img className="shell__logo" src="/brand/wordmark.png" alt="Peregrine Partners" />
          <span className="shell__rule" />
          <span className="shell__product">
            The <em>Venue Brain</em>
            <i>Operating system</i>
          </span>
        </div>

        {/* The LinkedIn href is the plain company URL, not the admin's
            /about/?viewAsMember=true preview: that parameter only tells
            LinkedIn to show an admin what a logged-out visitor sees, and
            shipping it would send every visitor through an admin view of
            a page they are already seeing as a member. No GitHub button
            until there is an org to point one at. */}
        <div className="shell__footer-actions">
          <a
            href="https://www.linkedin.com/company/peregrine-partners-ai/"
            target="_blank"
            rel="noreferrer noopener"
            className="shell__icon-btn"
            title="Peregrine Partners on LinkedIn"
            aria-label="Peregrine Partners on LinkedIn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8m1.39 9.74v-8.37H5.07v8.37h2.78z" />
            </svg>
          </a>

          <a
            href="https://www.peregrinepartners.space/"
            target="_blank"
            rel="noreferrer noopener"
            className="shell__icon-btn"
            title="peregrinepartners.space"
            aria-label="The Peregrine Partners website"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
            </svg>
          </a>

          <a
            href="https://claude.ai"
            target="_blank"
            rel="noreferrer noopener"
            className="shell__claude-badge"
            title="Built with Claude"
          >
            <span className="shell__claude-sparkle" aria-hidden="true">✦</span>
            <span>Built with Claude</span>
          </a>
        </div>
      </div>

      <div className="shell__footer-right">
        &copy; 2026 Peregrine Partners. All panels shown are a live demo for The Peacock.
      </div>
    </footer>
  )
}
