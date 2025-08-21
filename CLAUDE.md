## Important Workflow Rules
- **ALWAYS get explicit confirmation before making any code changes**
- Propose changes clearly and wait for approval before implementation
- When suggesting multiple changes, present them as separate options
- For complex changes, outline the approach and seek confirmation first

## Build & Development Commands
- `yarn start`: Start the development server
- `yarn test`: To run all tests
- `yarn lint`: Run ESLint on all files
- `yarn eslint [file-path]`: Lint specific file(s)
- `yarn eslint [file-path] --fix`: Auto-fix lint issues in specific file(s)

## Naming Conventions
- **Naming**: Use camelCase for variable and function names (e.g., `isFetchingData`, `handleUserInput`).
- **Components Naming**: Use PascalCase for component names (e.g., `UserProfile`, `ChatScreen`).
- **File Naming**: Directory and File names should be lowercase and hyphenated (e.g., `user-profile`, `chat-screen`).

## Code Style Guidelines
- **Code Style**: Write concise, type-safe TypeScript code
- **Structure**: Use functional components and hooks over class components, Ensure components are modular, reusable, and maintainable
- **Formatting**: Uses Prettier with single quotes, no semi, 120 char width
- **Types**: TypeScript with strict mode, explicit return types on functions
- **Components**: Use functional components with React FC typing
- **State Management**: Use Zustand for global state management, React hooks for component state
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Error Handling**: Custom error classes, try/catch blocks in services
- **Paths**: Use absolute imports with `@/` alias (`import X from '@/components/Y'`)
- **Organization**: Organize files by feature, grouping related components, hooks, and styles.
- **Audience**: This is a mobile application, so ensure all components are mobile friendly and responsive and support both iOS and Android platforms and ensure that the app is optimized for both platforms.

## TypeScript Usage
- **Use**: Use TypeScript for all components, favoring interfaces for props and state.
- **Config**: Enable strict typing in `tsconfig.json`.
- **Any**: Avoid using `any`; strive for precise types.
- **FC**: Utilize `React.FC` for defining functional components with props.

## Performance Optimization
- **Computations**: Minimize `useEffect`, `useState`, and heavy computations inside render methods.
- **Memo**: Use `React.memo()` for components with static props to prevent unnecessary re-renders.
- **Flatlists**: Optimize FlatLists with props like `removeClippedSubviews`, `maxToRenderPerBatch`, and `windowSize`.
- **Layout**: Use `getItemLayout` for FlatLists when items have a consistent size to improve performance.
- **Naming**: Avoid anonymous functions in `renderItem` or event handlers to prevent re-renders.

## Best Practices
- **UI**: Use consistent styling leveraging `gluestack-ui`. If there isn't a Gluestack component in the `components/ui` directory for the component you are trying to use consistently style it either through `StyleSheet.create()` or Styled Components.
- **React Native**: Follow React Native's threading model to ensure smooth UI performance.
- **Navigation**: Use React Navigation for handling navigation and deep linking with best practices.
- **Testing**: Create and use Jest to test to validate all generated components
- **Testing**: Generate tests for all components, services and logic generated. Ensure tests run without errors and fix any issues.
- **Translations**: The app is multi-lingual, so ensure all text is wrapped in `t()` from `react-i18next` for translations with the dictionary files stored in `src/translations`.
- **UI Modes**: Ensure support for dark mode and light mode.
- **Accessibility**: Ensure the app is accessible, following WCAG guidelines for mobile applications.
- **Performance**: Make sure the app is optimized for performance, especially for low-end devices.
- **Error Handling**: Handle errors gracefully and provide user feedback.
- **Offline Support**: Implement proper offline support.
- **User Friendly**: Ensure the user interface is intuitive and user-friendly and works seamlessly across different devices and screen sizes.

## Frameworks and Tools
- **Package Manager**: Use `yarn` as the package manager.
- **Secure Storage**: Use Expo's secure store for sensitive data
- **Forms**: Use `react-hook-form` for form handling
- **Data Fetching**: Use `react-query` for data fetching
- **Internationalization**: Use `react-i18next` for internationalization
- **Local Storage**: Use `react-native-mmkv` for local storage
- **API Requests**: Use `axios` for API requests
- **Mapping**: Use `@rnmapbox/maps` for maps, mapping or vehicle navigation
- **Icons**: Use `lucide-react-native` for icons and use those components directly in the markup and don't use the gluestack-ui icon component
- **Conditionals**: Use ? : for conditional rendering and not &&

## Common Lint Requirements
- Use parentheses in arrow function parameters: `(param) =>`
- Properly format ternary operators: `(condition ? x : y)`
- Use useCallback for functions in components
- Avoid unused variables and imports
- Follow JSDoc format for comments with proper spacing

## Spacing Rules
- No trailing commas after the last parameter in function definitions
- Add trailing commas for objects and arrays with items on multiple lines
- One space after the colon in object properties: `{ prop: value }`
- Add a blank line between distinct logical sections of code
- No blank line between related statements (variable declarations)
- Include a space after comment markers: `// Comment` (not `//Comment`)
- Add a space after if/for/while keywords: `if (condition)` (not `if(condition)`)
- No extra empty lines at the end of blocks
- Keep consistent indentation (2 spaces)
