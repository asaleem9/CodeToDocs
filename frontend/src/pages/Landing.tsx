import { Link } from 'react-router-dom'
import Logo3D from '../components/Logo3D'
import Logo from '../components/Logo'
import './Landing.css'

function Landing() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <Logo3D size="large" autoRotate={true} />
          <h1 className="hero-title">
            Transform Your Code into Beautiful Documentation
          </h1>
          <p className="hero-description">
            AI-powered documentation generator for your codebase.
            Generate comprehensive, high-quality documentation in seconds.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Get Started
            </Link>
            <a href="#how-it-works" className="btn btn-secondary">
              Learn More
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="code-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <span className="preview-title">example.js</span>
            </div>
            <pre className="preview-code">{`function calculateTotal(items) {
  return items.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0
  );
}`}</pre>
          </div>
          <div className="arrow-indicator">→</div>
          <div className="docs-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <span className="preview-title">documentation.md</span>
            </div>
            <div className="preview-docs">
              <h3>Calculate Total</h3>
              <p>Calculates the total price...</p>
              <div className="quality-badge">Quality Score: 95</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section" id="benefits">
        <div className="section-container">
          <h2 className="section-title">Documentation That Actually Gets Written</h2>
          <p className="section-subtitle">
            Not another tool you'll "get to later" — documentation that happens automatically
          </p>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">⚡</div>
              <h3>180x Faster</h3>
              <p>
                From 15-30 minutes per file to 5-10 seconds. Stop writing documentation,
                start shipping features.
              </p>
              <div className="benefit-stat">Manual: 30 min → AI: 10 sec</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🔄</div>
              <h3>Zero Extra Steps</h3>
              <p>
                Merge a PR, get documentation. No copy-pasting to ChatGPT, no manual
                triggers. It just happens in your GitHub workflow.
              </p>
              <div className="benefit-stat">Automatic on every merge</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">👥</div>
              <h3>Onboard in Hours, Not Weeks</h3>
              <p>
                New developers understand your codebase immediately with visual diagrams,
                examples, and comprehensive explanations for every module.
              </p>
              <div className="benefit-stat">Knowledge that stays</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">✨</div>
              <h3>Consistent Quality</h3>
              <p>
                Every piece of documentation scored 0-100 for completeness. Same high
                standard across your entire codebase, regardless of who wrote it.
              </p>
              <div className="benefit-stat">95+ quality score</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">📊</div>
              <h3>Visual Architecture</h3>
              <p>
                Auto-generated Mermaid diagrams for every file. See code flow,
                relationships, and architecture at a glance.
              </p>
              <div className="benefit-stat">Diagrams included</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🎯</div>
              <h3>Knowledge Retention</h3>
              <p>
                When developers leave, their knowledge stays. Every merged PR creates
                an automatic knowledge base for your team.
              </p>
              <div className="benefit-stat">10% → 95% coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="benefits-section" id="features">
        <div className="section-container">
          <h2 className="section-title">Core Features</h2>
          <p className="section-subtitle">
            Everything you need to automate documentation across your entire codebase
          </p>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">📄</div>
              <h3>Single File Documentation</h3>
              <p>
                Paste code or upload files to generate instant documentation with
                examples, parameters, and return values. Perfect for quick docs.
              </p>
              <div className="benefit-stat">In 5-10 seconds</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">📦</div>
              <h3>Batch Repository Processing</h3>
              <p>
                Document entire GitHub repositories at once. Processes up to 50 files
                concurrently with real-time progress tracking.
              </p>
              <div className="benefit-stat">Full repo in minutes</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🔔</div>
              <h3>GitHub Webhook Integration</h3>
              <p>
                Automatically document every merged PR. Set it once, and documentation
                happens in the background—forever.
              </p>
              <div className="benefit-stat">Zero manual work</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🔍</div>
              <h3>Quality Scoring System</h3>
              <p>
                Every document scored 0-100 for completeness. Ensures consistent
                quality across examples, parameters, and best practices.
              </p>
              <div className="benefit-stat">95+ average score</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🎨</div>
              <h3>Visual Mermaid Diagrams</h3>
              <p>
                Auto-generated flowcharts and architecture diagrams for every file.
                See code relationships and logic flow instantly.
              </p>
              <div className="benefit-stat">Every file visualized</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">📚</div>
              <h3>Documentation History</h3>
              <p>
                Track all generated documentation with timestamps, quality scores,
                and PR metadata. Search, filter, and revisit past docs anytime.
              </p>
              <div className="benefit-stat">Full audit trail</div>
            </div>
          </div>
        </div>
      </section>

      {/* Webhook Setup Section */}
      <section className="webhook-section" id="webhook-setup">
        <div className="section-container">
          <h2 className="section-title">GitHub Webhook Integration</h2>
          <p className="section-subtitle">
            Automate documentation generation when PRs are merged
          </p>

          <div className="webhook-content">
            <div className="webhook-info">
              <div className="info-card">
                <h3>Why Use Webhooks?</h3>
                <ul>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Automatically generate docs when code changes
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Keep documentation always in sync with codebase
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Track documentation by PR number and author
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    No manual intervention required
                  </li>
                </ul>
              </div>

              <div className="setup-steps">
                <h3>Setup Instructions</h3>
                <ol>
                  <li>
                    <strong>Get Your Webhook URL:</strong>
                    <p>Find it in <Link to="/app/settings">Settings</Link> page</p>
                    <div className="code-snippet">
                      <code>https://your-domain.com/api/webhook/github</code>
                    </div>
                  </li>
                  <li>
                    <strong>Configure GitHub Webhook:</strong>
                    <p>Go to your repository → Settings → Webhooks → Add webhook</p>
                  </li>
                  <li>
                    <strong>Set Webhook Details:</strong>
                    <ul className="webhook-details">
                      <li><strong>Payload URL:</strong> Your webhook URL from step 1</li>
                      <li><strong>Content type:</strong> application/json</li>
                      <li><strong>Secret:</strong> Your GITHUB_WEBHOOK_SECRET from .env</li>
                      <li><strong>Events:</strong> Select "Pull requests"</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Test It:</strong>
                    <p>Merge a PR and check the <Link to="/app/history">History</Link> page for auto-generated docs</p>
                  </li>
                </ol>
              </div>
            </div>

            <div className="webhook-diagram">
              <div className="diagram-box">
                <div className="diagram-item">
                  <span className="diagram-icon">🔀</span>
                  <span>PR Merged</span>
                </div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-item">
                  <span className="diagram-icon">🔔</span>
                  <span>GitHub Webhook</span>
                </div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-item">
                  <span className="diagram-icon">🤖</span>
                  <span>CodeToDocsAI</span>
                </div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-item">
                  <span className="diagram-icon">📚</span>
                  <span>Documentation Generated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Documentation?</h2>
          <p>Start generating AI-powered documentation in minutes</p>
          <Link to="/app" className="btn btn-primary btn-large">
            Get Started Now
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <Logo size="small" showText={true} />
            <p>AI-powered documentation for modern development teams</p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <Link to="/app">Home</Link>
            <Link to="/app/history">History</Link>
            <Link to="/app/settings">Settings</Link>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <a href="#how-it-works">How It Works</a>
            <a href="#webhook-setup">Webhook Setup</a>
            <a href="#benefits">Benefits</a>
          </div>
          <div className="footer-section">
            <h4>Technology</h4>
            <a href="https://mermaid.js.org/" target="_blank" rel="noopener noreferrer">Mermaid</a>
            <a href="https://react.dev/" target="_blank" rel="noopener noreferrer">React</a>
            <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">Node.js</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CodeToDocsAI</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
