# Fancy JSON Studio

A powerful, free online JSON tool for viewing, comparing, formatting, and analyzing JSON files with an intuitive interface and advanced diff capabilities. Perfect for developers, data engineers, and anyone working with JSON data.

**Fancy JSON Studio** is your go-to JSON viewer, formatter, and comparator. Whether you need to visualize complex JSON structures, compare API responses, or debug configuration files, this tool provides everything you need in a sleek, modern interface.

## Key Features

- **JSON Viewer & Tree Explorer**: Beautiful, interactive tree view for exploring deep JSON structures with expand/collapse controls
- **Side-by-Side JSON Comparison**: Compare two JSON files with detailed diff highlighting and change tracking
- **Advanced Diff Filtering**: Filter diff results by changes only, added fields, removed fields, or view all changes
- **Drag & Drop File Upload**: Simply drag JSON files into the application to instantly load and preview them
- **Raw JSON Preview**: View formatted or minified JSON in raw text mode with syntax highlighting
- **Monaco Code Editor**: Edit JSON directly with full syntax highlighting, validation, and error detection
- **Light & Dark Theme**: Automatic system preference detection with manual theme toggle for comfortable viewing
- **Responsive Web Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Privacy-First & Secure**: Completely client-side application - your data never leaves your browser, no server uploads
- **Zero Dependencies**: No backend required, no registration, no ads

## Live Demo

[Try Fancy JSON Studio Now](https://fancy-json-studio.vercel.app/)

Free online JSON tool. No sign-up required.

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **JSON Diffing**: jsondiffpatch
- **Editor**: Monaco Editor
- **File Handling**: react-dropzone
- **Testing**: Vitest with React Testing Library
- **Styling**: CSS3 with theme variables

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/thisisdarkstar/Fancy-JSON-Studio.git
cd Fancy-JSON-Studio
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

## Available Scripts

- `npm run dev` - Start the development server with hot module reloading
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run test` - Run the test suite with Vitest

## Usage

### Loading JSON Files

1. **Drag & Drop**: Drag a JSON file directly into the application
2. **Manual Input**: Paste JSON content directly into the text editor

### Single View Mode

Select a JSON file to view its structure in an interactive tree format with:
- Expandable/collapsible nodes
- Search and filtering capabilities
- Raw JSON preview

### Compare Mode

1. Load two JSON files (Pane A and Pane B)
2. The diff view will highlight:
   - **Added fields** (green)
   - **Removed fields** (red)
   - **Changed values** (blue)
3. Use filters to focus on specific types of changes
4. Toggle tree view for detailed exploration

### Navigation

- **Theme Toggle**: Switch between light and dark modes
- **View Mode**: Toggle between single and side-by-side comparison views
- **Search**: Filter tree nodes by text search
- **Expand/Collapse**: Navigate complex JSON structures efficiently

## Project Structure

```
src/
├── features/
│   ├── viewer/          # JSON viewing and tree components
│   │   ├── JsonTreePanel.tsx      # Tree view for JSON structures
│   │   └── RawPreviewCard.tsx     # Raw JSON preview display
│   └── workbench/       # Main application workspace
│       ├── WorkbenchPage.tsx      # Main page component
│       └── components/
│           └── JsonPaneCard.tsx   # Individual JSON pane editor
├── lib/
│   ├── file.ts          # File handling utilities
│   ├── monacoThemes.ts  # Monaco Editor theme definitions
│   └── json/
│       ├── jsonTools.ts # JSON processing and diff utilities
│       └── jsonTools.test.ts
├── App.tsx              # Application root
├── main.tsx             # Entry point
├── types.ts             # TypeScript type definitions
└── styles.css           # Global styles and theme variables
```

## Key Features in Detail

### Diff Capabilities

- **Recursive Diffing**: Deeply compares nested JSON structures
- **Change Tracking**: Identifies additions, removals, and modifications
- **Summary Stats**: Quick overview of total changes
- **Filtered Views**: Focus on specific types of changes

### Editor Integration

- Syntax highlighting for JSON
- Real-time validation
- Auto-formatting
- Copy/paste support

### Theme System

- Automatic system preference detection
- Persistent theme selection
- Carefully chosen color palettes for accessibility
- Support for light and dark modes

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Any modern browser with ES2020+ support

## Performance

- Efficient rendering with React 19 and Vite
- Optimized tree traversal for large JSON files
- Lazy loading of tree expanded states
- Debounced search and resize handlers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Author

[thisisdarkstar](https://github.com/thisisdarkstar)

## Support

If you encounter any issues or have feature requests, please open an issue on the [GitHub repository](https://github.com/thisisdarkstar/Fancy-JSON-Studio/issues).

---

Enjoy analyzing your JSON files with Fancy JSON Studio! 🚀
