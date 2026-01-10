# Contributing to CodeToDocsAI

Thank you for your interest in contributing to CodeToDocsAI! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CodeToDocs.git
   cd CodeToDocs
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment variables** following the README instructions

## Development Workflow

1. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards:
   - Use TypeScript for all new code
   - Follow existing code formatting
   - Add comments for complex logic
   - Update tests if applicable

3. **Test your changes**:
   ```bash
   npm run dev
   ```
   - Test both frontend and backend
   - Verify no console errors
   - Test edge cases

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```
   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code refactoring
   - `test:` for tests

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub:
   - Describe what your PR does
   - Link any related issues
   - Add screenshots for UI changes

## Areas to Contribute

### Good First Issues
- Documentation improvements
- Adding support for new programming languages
- UI/UX enhancements
- Bug fixes

### Feature Ideas
- Additional diagram types (sequence diagrams, architecture diagrams)
- Code complexity metrics
- Custom documentation templates
- API rate limiting improvements
- Caching strategies

### Documentation
- Improve setup instructions
- Add usage examples
- Create video tutorials
- Translate documentation

## Code Style

- **TypeScript**: Use strict mode, proper types
- **React**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: Use JSDoc for functions and complex logic

## Testing

Before submitting a PR:
- [ ] Code runs without errors
- [ ] No console warnings
- [ ] Tested on latest Chrome/Firefox
- [ ] Backend API responses are correct
- [ ] Frontend UI looks good on mobile and desktop

## Pull Request Guidelines

✅ **DO:**
- Keep PRs focused on a single feature or fix
- Write clear commit messages
- Update documentation if needed
- Test thoroughly before submitting

❌ **DON'T:**
- Submit large PRs with unrelated changes
- Change formatting of unrelated code
- Add dependencies without discussion
- Break existing functionality

## Getting Help

- 📝 Check existing [Issues](https://github.com/asaleem9/CodeToDocs/issues)
- 💬 Open a new issue for questions
- 📧 Contact: Ali Saleem via GitHub

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for making CodeToDocsAI better! 🎉
