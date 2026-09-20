# Contributing to TheIntroDB Universal Extension

First of all, thank you for your interest in contributing to TheIntroDB Universal Extension! We appreciate your help in making this project better.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS version recommended)
- [pnpm](https://pnpm.io/) (used for package management)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/theintrodb/universal-extension.git
   cd universal-extension
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

## Development Standards

To maintain a consistent codebase, we use **ESLint** for linting and **Prettier** for code formatting.

### Formatting

We use Prettier to ensure a consistent code style. You can check the formatting or automatically fix it using the following commands:

```bash
# Check if code is properly formatted
pnpm format:check

# Automatically fix formatting issues
pnpm format
```

### Linting

We use ESLint to catch common errors and enforce coding standards.

```bash
# Run ESLint
pnpm lint

# Run ESLint and fix auto-fixable issues
pnpm lint:fix
```

## Adding a New Site

This project supports many streaming sites through custom extractors. If you'd like to add support for a new site, please see the [Contributing: adding a new site](https://github.com/theintrodb/universal-extension#contributing-adding-a-new-site) section in the README.

If you can't add it yourself, feel free to [open a site request](https://github.com/theintrodb/universal-extension/issues/new?template=site_request.md).

## Pull Request Guidelines

1. **Create a Branch**: Create a descriptive branch name for your changes (e.g., `feat/add-new-feature` or `fix/issue-description`).
2. **Make Changes**: Implement your changes and ensure they follow the project's coding standards.
3. **Verify Changes**: Before submitting, run linting and formatting checks:
   ```bash
   pnpm lint
   pnpm format:check
   ```
4. **Submit a PR**: Provide a clear and concise description of your changes in the pull request. Reference any related issues if applicable.

## CI/CD

Our GitHub Actions will automatically run linting and formatting checks on every pull request. If these checks fail, you will need to fix them locally and push the changes before your PR can be merged.

---

Happy coding!
