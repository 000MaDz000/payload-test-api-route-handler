# Contributing to payload-test-api-route-handler

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/<your-username>/payload-test-api-route-handler.git
cd payload-test-api-route-handler

# Install dependencies
pnpm install

# Run the test suite
pnpm test

# Build the project
pnpm build
```

## Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** in the `src/` directory.

3. **Add or update tests** in the `tests/` directory to cover your changes.

4. **Run checks** before committing:
   ```bash
   pnpm lint     # Lint & type-check
   pnpm test     # Run test suite
   pnpm build    # Ensure it compiles
   ```

5. **Commit** with a clear, descriptive message.

6. **Open a Pull Request** against `main`.

## Code Style

- This project uses **ESLint** and **Prettier** for consistent formatting.
- Run `pnpm format` to auto-format your code.
- Run `pnpm lint` to check for lint errors.

## Reporting Issues

When reporting a bug, please include:

- Your Node.js version (`node -v`)
- Your Payload CMS version
- A minimal reproduction case
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
