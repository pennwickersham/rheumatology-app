import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the scroll position of the app's scroll container whenever the
 * route changes. Without this, navigating from a scrolled list into a
 * detail page (or back) opens the new view at the old scroll offset,
 * landing the user in the middle of the text.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // The scrollable element is .app-content (Layout), not the window.
    const content = document.querySelector('.app-content');
    if (content) content.scrollTop = 0;
    // Fallback for any window-level scrolling.
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}
