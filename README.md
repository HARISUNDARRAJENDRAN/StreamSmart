
# StreamSmart - AI-Powered YouTube Learning Platform

StreamSmart is a Next.js application designed to transform your YouTube viewing into a structured and effective learning experience. It leverages AI to help you curate playlists, visualize concepts with mind maps, test your understanding with quizzes, and more.

## Key Features

*   **AI-Powered Playlist Creation**:
    *   Generate playlists based on learning goals or video titles.
    *   Get AI video recommendations.

*   **Interactive Mind Maps**:
    *   Visualize playlist topics with AI-generated mind maps using ReactFlow.
    *   View mind maps in fullscreen and download them as SVG.

*   **Engaging AI Quizzes**:
    *   Test your knowledge with quizzes generated from playlist content.
    *   Customize quizzes by difficulty (easy, medium, hard) and number of questions.

*   **YouTube Video Player**:
    *   Integrated player for watching videos within your playlists.

*   **AI Chatbot**:
    *   Ask questions about your playlist content and get AI-assisted answers.

*   **Progress Tracking**:
    *   UI to track overall learning progress, completed videos, and time spent (simulates data from localStorage).
    *   Manually mark videos as complete/incomplete.

*   **User Authentication (Mock)**:
    *   Basic login page flow.

*   **Profile Settings**:
    *   Page to manage mock user profile information (name, phone, bio).

*   **Modern UI/UX**:
    *   Built with Next.js, Tailwind CSS, and ShadCN UI components.
    *   Theming support (currently black and purple/violet).

## Technologies Used

*   **Frontend**:
    *   [Next.js](https://nextjs.org/) (App Router, Server Components)
    *   [React](https://reactjs.org/)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   [ShadCN UI](https://ui.shadcn.com/) (Component Library)
    *   [ReactFlow](https://reactflow.dev/) (For Mind Maps)
    *   [Lucide React](https://lucide.dev/) (Icons)
    *   [Recharts](https://recharts.org/) (For Charts)

*   **AI Integration**:
    *   Google Gemini Models (e.g., `gemini-2.0-flash`)

*   **Form Handling & Validation**:
    *   [React Hook Form](https://react-hook-form.com/)
    *   [Zod](https://zod.dev/)

*   **State Management**:
    *   React Context API, `useState`, `useEffect`

*   **Local Storage**: For persisting user-created playlists and progress (for prototyping).

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/HARISUNDARRAJENDRAN/StreamSmart.git
    cd StreamSmart
    ```

2.  **Install NPM packages:**
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root of your project and add your YouTube Data API v3 key:
    ```env
    YOUTUBE_API_KEY=YOUR_ACTUAL_YOUTUBE_API_KEY_HERE
    ```
    *   You can obtain a YouTube Data API key from the [Google Cloud Console](https://console.cloud.google.com/). Make sure the "YouTube Data API v3" is enabled for your project.

4.  **Run the Next.js Development Server:**
    In another terminal window, run:
    ```bash
    npm run dev
    ```
    This will start the Next.js application, typically on `http://localhost:9002` (as per your `package.json`).

Open [http://localhost:9002](http://localhost:9002) (or your configured port) in your browser to see the application. You should be redirected to the landing page.

## Project Structure (Simplified)

```
StreamSmart/
├── src/
│   ├── ai/                 # Genkit AI flows and configuration
│   ├── app/                # Next.js App Router (pages, layouts)
│   │   ├── (app)/          # Authenticated app routes (dashboard, playlists, etc.)
│   │   ├── (auth)/         # Auth routes (login)
│   │   ├── landing/        # Landing page
│   │   ├── globals.css     # Global styles
│   │   └── layout.tsx      # Root layout
│   ├── components/         # UI components (ShadCN, custom)
│   │   ├── auth/
│   │   ├── layout/
│   │   ├── playlists/
│   │   ├── profile/
│   │   └── ui/             # ShadCN UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── services/           # External API services (e.g., YouTube)
│   └── types/              # TypeScript type definitions
├── .env                    # Environment variables (GITIGNORED - create manually)
├── .gitignore
├── components.json         # ShadCN UI configuration
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Contact

Hari Sundar Rajendran
*   Email: [hsundar080506@gmail.com](mailto:hsundar080506@gmail.com)
*   LinkedIn: [https://www.linkedin.com/in/hari-sundar-237570286/](https://www.linkedin.com/in/hari-sundar-237570286/)

---

This README provides a good starting point. Feel free to expand on it as your project evolves!
# StreamSmart
