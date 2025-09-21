# Contributing to ISEP ICS Bridge

This is a personal helper project, but if you find it useful and want to improve it, feel free to contribute! 🚀

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**:

   ```bash
   git clone https://github.com/your-username/isep-ics.git
   cd isep-ics
   ```

3. **Install dependencies**:

   ```bash
   bun install
   ```

4. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🧪 Development Setup

### Prerequisites

- [Bun](https://bun.sh) installed
- Docker and Docker Compose
- ISEP portal credentials (for testing)

### Running the Application

```bash
# Development mode with hot reload
bun run dev

# Or with Docker
docker compose up -d
```

### Running Tests

```bash
# Run all tests
bun run test:all

# Run specific tests
bun run test:e2e
bun run test:diagnostic
bun run test:docker
```

## 📝 Code Style

This project uses:

- **Biome** for linting and formatting
- **TypeScript** with strict type checking
- **Husky** for pre-commit hooks

### Before Committing

```bash
# Check code quality
bun run check

# Fix issues automatically
bun run check:fix
```

## 🔧 Making Changes

### 1. **Code Changes**

- Follow existing code patterns
- Add TypeScript types for new functions
- Update tests if adding new features
- Update documentation if changing behavior

### 2. **Configuration Changes**

- Update both `docker-compose.yml` and `docker-compose.prod.yml`
- Update `env.example` with new environment variables
- Update README.md with new configuration options

### 3. **API Changes**

- Update OpenAPI specification in `src/openapi.ts`
- Update API documentation in README.md
- Add/update tests for new endpoints

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment**: OS, Bun version, Docker version
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Logs**: Any error messages or console output

## ✨ Feature Requests

For new features, please:

- Check existing issues first
- Describe the use case clearly
- Explain how it fits with the project's goals
- Consider implementation complexity

## 📋 Pull Request Process

1. **Update documentation** for any new features
2. **Add tests** for new functionality
3. **Ensure all tests pass**:

   ```bash
   bun run test:all
   ```

4. **Update version** in `package.json` if needed
5. **Write clear commit messages**
6. **Link to related issues**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Updated documentation

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## 🔒 Security

- **Never commit credentials** or sensitive data
- **Use environment variables** for configuration

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: Use GitHub Discussions for general questions

## 🎉 Recognition

If you contribute something useful, I'll mention you in the release notes. No promises on timeline though - this is a side project! 😅

Thanks for making this better! 🙏
