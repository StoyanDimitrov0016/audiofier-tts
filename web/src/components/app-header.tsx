import { Link } from "@tanstack/react-router";

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="brand-link" to="/">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            <strong>Audiofier</strong>
            <small>Lesson audio workspace</small>
          </span>
        </Link>

        <nav className="app-nav" aria-label="Primary navigation">
          <Link className="app-nav-link" to="/groups">
            Groups
          </Link>
          <Link className="app-nav-link app-nav-link-primary" to="/groups/new">
            New group
          </Link>
        </nav>
      </div>
    </header>
  );
}
