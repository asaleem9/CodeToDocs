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
            AI-powered documentation generator using Claude 3.5 Sonnet.
            Generate comprehensive, high-quality documentation for your codebase in seconds.
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

      {/* What It Does Section */}
      <section className="what-section" id="what-it-does">
        <div className="section-container">
          <h2 className="section-title">What is CodeToDocsAI?</h2>
          <p className="section-subtitle">
            CodeToDocsAI is an intelligent documentation generator that understands your code
            and creates comprehensive, developer-friendly documentation automatically.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3>AI-Powered Analysis</h3>
              <p>
                Leverages Claude 3.5 Sonnet to deeply understand your code structure,
                patterns, and logic to generate accurate documentation.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3>Instant Generation</h3>
              <p>
                Generate comprehensive documentation in seconds. No more hours spent
                writing and maintaining docs manually.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3>Visual Diagrams</h3>
              <p>
                Automatically generates Mermaid diagrams including flowcharts, class diagrams,
                and dependency graphs to visualize your code.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>Quality Scoring</h3>
              <p>
                Each documentation gets a quality score (0-100) with detailed breakdown,
                ensuring comprehensive and useful docs.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3>Export Options</h3>
              <p>
                Download or copy documentation as Markdown or beautifully formatted HTML.
                Perfect for wikis, READMEs, or documentation sites.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
              </div>
              <h3>GitHub Integration</h3>
              <p>
                Set up webhooks to automatically generate documentation when PRs are merged.
                Keep your docs always up-to-date.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-section" id="how-it-works">
        <div className="section-container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Get started in 3 simple steps
          </p>

          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Configure Your API Key</h3>
                <p>
                  Go to <Link to="/app/settings">Settings</Link> and add your Anthropic API key.
                  Get your key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>.
                </p>
                <div className="code-snippet">
                  <code>API Key: sk-ant-api03-YOUR_KEY_HERE</code>
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Paste Your Code</h3>
                <p>
                  Navigate to the <Link to="/app">Home</Link> page, select your programming language
                  (JavaScript, Python, TypeScript, or Java), and paste your code.
                </p>
                <div className="supported-langs">
                  <span className="lang-badge">JavaScript</span>
                  <span className="lang-badge">Python</span>
                  <span className="lang-badge">TypeScript</span>
                  <span className="lang-badge">Java</span>
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Generate & Export</h3>
                <p>
                  Click "Generate Documentation" and watch as AI creates comprehensive docs
                  with examples, diagrams, and quality scores. Export as Markdown or HTML.
                </p>
                <div className="export-options">
                  <span className="export-badge">📄 Markdown</span>
                  <span className="export-badge">🌐 HTML</span>
                  <span className="export-badge">📋 Copy</span>
                </div>
              </div>
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

      {/* Benefits Section */}
      <section className="benefits-section" id="benefits">
        <div className="section-container">
          <h2 className="section-title">Benefits for Developer Teams</h2>
          <p className="section-subtitle">
            Why teams choose CodeToDocsAI
          </p>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">⚡</div>
              <h3>Save Time</h3>
              <p>
                Reduce documentation time from hours to seconds. Let your developers
                focus on writing code, not documentation.
              </p>
              <div className="benefit-stat">10x faster</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">✨</div>
              <h3>Improve Quality</h3>
              <p>
                AI-generated docs are comprehensive, consistent, and include examples,
                diagrams, and best practices automatically.
              </p>
              <div className="benefit-stat">95+ quality score</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🔄</div>
              <h3>Stay Up-to-Date</h3>
              <p>
                With webhook integration, documentation updates automatically with
                every code change. No more outdated docs.
              </p>
              <div className="benefit-stat">Always current</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">👥</div>
              <h3>Better Onboarding</h3>
              <p>
                New team members can understand your codebase faster with clear,
                comprehensive documentation and visual diagrams.
              </p>
              <div className="benefit-stat">50% faster ramp-up</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">📊</div>
              <h3>Track Progress</h3>
              <p>
                View documentation history, quality scores over time, and track which
                PRs generated what documentation.
              </p>
              <div className="benefit-stat">Full history</div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🎯</div>
              <h3>Standardization</h3>
              <p>
                Ensure all code is documented with the same high quality and structure,
                regardless of who wrote it.
              </p>
              <div className="benefit-stat">Consistent format</div>
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
            <a href="https://www.anthropic.com/claude" target="_blank" rel="noopener noreferrer">Claude AI</a>
            <a href="https://mermaid.js.org/" target="_blank" rel="noopener noreferrer">Mermaid</a>
            <a href="https://react.dev/" target="_blank" rel="noopener noreferrer">React</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CodeToDocsAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
