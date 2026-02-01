# UT Degree Audit Plus

An unofficial Chrome extension designed to enhance and modernize the degree planning experience for students at the University of Texas at Austin.

## The Problem

The official degree audit system is powerful but can be difficult to read, non-interactive, and challenging for long-term planning. Degree Audit Plus aims to solve this by transforming the static audit page into a dynamic, interactive, and user-friendly dashboard through an extension.

## Key Features (to be implemented)

- **Interactive Dashboard:** Replaces the default audit layout with a clean, modern interface that visualizes your degree progress.
- **Dynamic Checklists:** See exactly which requirements you've fulfilled and what's left to complete for your majors, minors, and certificates.
- **What-If Scenarios:** Experiment with adding a minor or changing majors to instantly see how it would affect your graduation requirements.
- **Prerequisite Visualization:** A clear, graphical view of course dependencies so you never register for a class out of sequence.
- **Four-Year Planner:** Drag and drop courses into a semester-by-semester plan to build a clear roadmap to graduation.
- **Secure & Private:** The extension runs entirely in your local browser. Your academic data is never sent to, stored on, or seen by any external server.

_(Add a screenshot or a GIF of your extension in action here!)_

## Tech Stack

- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Redux Toolkit
- **Backend & Data:** Supabase (for storing user-created plans)
- **Platform:** Chrome Extension API (Manifest V3)
- **Build Tools:** WXT, Vite, Bun

## Installation

### For Students (Recommended)

1. Install the extension from the [**Chrome Web Store**](https://www.google.com/search?q=https://chrome.google.com/webstore/detail/your-extension-id) (Link coming soon!).
2. Navigate to the UT Degree Audit page, run an audit, and the extension will automatically activate.

### For Developers

To get the development environment running locally:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Degree-Audit-Plus/Degree-Audit-Plus.git
   cd Degree-Audit-Plus
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Run the development build:**
   This command will watch for file changes and rebuild the extension automatically.

   ```bash
   bun run dev
   ```

4. **Load the extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **"Developer mode"** in the top right corner.
   - Click on **"Load unpacked"**.
   - Select the `.output/chrome-mv3` folder that was created in the project directory.

5. **Development Tools:**

   The project uses WXT as the extension framework, which provides:
   - Hot Module Replacement (HMR) for fast development
   - TypeScript support out of the box
   - Automatic manifest generation

   **Available Scripts:**
   - `bun run dev` - Start development mode with hot reload
   - `bun run dev:firefox` - Start development mode for Firefox
   - `bun run build` - Build production-ready extension for Chrome
   - `bun run build:firefox` - Build production-ready extension for Firefox
   - `bun run compile` - Type-check without building

   **Styling with Tailwind CSS:**
   - Tailwind CSS is configured and ready to use
   - Use utility classes directly in your React components
   - Configuration file: `tailwind.config.js`
   - Main stylesheet: `entrypoints/popup/style.css`

## Contributing

Contributions are **greatly appreciated**. First time contributers are encouraged to contribute to issues labeled "easy".

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
Examples:

- `feat: add new dashboard component`
- `fix: resolve login redirect issue`
- `docs: update README installation steps`

### Git Hooks with Husky

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. Husky automatically runs scripts before commits and pushes to ensure code quality and enforce commit conventions.

## The Team

This project is led and maintained by a dedicated group of UT Austin students.

## License

This project is distributed under the MIT License. See `LICENSE` for more information.

---

### Disclaimer

UT Degree Audit Plus is an independent, student-led project and is **not** an official application of, or affiliated with, The University of Texas at Austin. The tool is provided as-is, without warranty. Always confirm your academic plan with your academic advisor.
