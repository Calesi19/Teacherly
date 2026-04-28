import './App.css'

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

const OfflineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const ClassroomIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const PrivacyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

function App() {
  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          Teacher<span>ly</span>
        </div>
        <a
          href="https://github.com/Calesi19/Teacherly"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          <GithubIcon />
          GitHub
        </a>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            Free &amp; Open Source
          </div>

          <h1>
            The classroom companion<br />
            <em>teachers actually need</em>
          </h1>

          <p className="hero-sub">
            Teacherly helps you manage classrooms, students, and family contacts —
            all stored locally on your device. No internet required. No subscription. No nonsense.
          </p>

          <div className="hero-actions">
            <a className="btn-primary" href="https://github.com/Calesi19/Teacherly/releases/latest" target="_blank" rel="noopener noreferrer">
              Download for Mac
            </a>
            <a className="btn-ghost" href="https://github.com/Calesi19/Teacherly" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </div>
        </section>

        <section className="features">
          <div className="features-header">
            <h2>Everything you need, nothing you don't</h2>
            <p>Built for simplicity. Designed to stay out of your way.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <OfflineIcon />
              </div>
              <h3>Works Offline</h3>
              <p>
                All data lives on your machine in a local SQLite database.
                No Wi-Fi, no server, no cloud — it just works.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <ClassroomIcon />
              </div>
              <h3>Classroom Manager</h3>
              <p>
                Organize multiple classrooms, add students, and keep family
                contact information in one tidy place.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <PrivacyIcon />
              </div>
              <h3>Private by Design</h3>
              <p>
                No accounts. No tracking. Your students' data never leaves
                your computer, period.
              </p>
            </div>
          </div>
        </section>

        <section className="oss">
          <h2>Completely free, forever</h2>
          <p>
            Teacherly is open source software released under the MIT license.
            Free to use, free to modify, free to share.
          </p>
          <a
            href="https://github.com/Calesi19/Teacherly"
            target="_blank"
            rel="noopener noreferrer"
            className="oss-link"
          >
            <GithubIcon />
            Star on GitHub
          </a>
        </section>
      </main>

      <footer className="footer">
        &copy; {new Date().getFullYear()} Teacherly &mdash; Free &amp; Open Source
      </footer>
    </>
  )
}

export default App
