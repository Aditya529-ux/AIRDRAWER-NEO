<div align="center">
  <img src="./src/assets/hero.png" alt="AirDrawer Neo Banner" width="100%" />

  <h1>🌌 AIRDRAWER NEO</h1>
  <p><strong>A Next-Generation AI Spatial Interface & Air Drawing Experience</strong></p>

  <p>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" /></a>
    <a href="https://mediapipe.dev/"><img src="https://img.shields.io/badge/MediaPipe-00A2D3?style=for-the-badge&logo=google&logoColor=white" alt="MediaPipe" /></a>
    <a href="https://www.framer.com/motion/"><img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" /></a>
  </p>
</div>

---

## 📖 About The Project

**AIRDRAWER NEO** is a high-performance, real-time AI air drawing web application that utilizes advanced hand tracking to create a "Minority Report" style spatial interface. 

It breaks the boundaries of traditional 2D interfaces by allowing you to draw directly in the air with your dominant hand and seamlessly manipulate your creations in real-time with your non-dominant hand using intuitive spatial gestures.

## ✨ Key Features

*   **✋ Dual-Hand Spatial Interaction**: 
    *   **Dominant Hand (Right)**: Handles high-precision drawing, selective erasing, and canvas clearing.
    *   **Secondary Hand (Left)**: Dedicated to spatial transformations (Move, Scale, Rotate) of existing strokes.
*   **📐 Non-Destructive Transforms**: Strokes retain their original coordinate data. All manipulations (TX, TY, Scale, Rotation) are applied at render time via matrix-based mathematical transformations.
*   **🕶️ Minimalist Glassmorphism UI**: A premium, aesthetic interface with a real-time HUD (Heads Up Display) and visual feedback guides for an immersive experience.
*   **⚡ High Performance Rendering**: Native WebGL-based rendering engine optimized for 60FPS fluid interactions.
*   **🌀 Physics-Based Interaction**: Enjoy smooth inertia on stroke movement and snap-to-angle (45°) features for rotation, providing a tactile feel to virtual objects.
*   **🔒 Privacy-First Processing**: All hand-tracking and AI processing happens entirely locally in your browser. No video data is ever sent to a server.
*   **📖 Interactive Gesture Guide**: Built-in interactive manual explaining every movement contextually.

## 🛠️ Tech Stack

*   **Frontend Framework**: React 19 + Vite
*   **AI Hand Tracking**: Google MediaPipe (`@mediapipe/hands`)
*   **Animations & Physics**: Framer Motion
*   **Icons & Visuals**: Lucide React (with custom inline SVG fallbacks for brand icons)
*   **Styling**: Vanilla CSS with Modern Glassmorphism & Neon Aesthetics
*   **Rendering**: WebGL / Canvas API

## 🎮 Gesture Manual

### ✍️ Drawing Hand (Right Hand)

| Gesture | Action | Description |
| :---: | :--- | :--- |
| ☝️ **Index Up** | **Draw** | Start drawing a continuous stroke in the air. |
| 🤏 **Pinch** | **Selective Eraser** | Erase specific strokes that intersect with your fingertip path. |
| ✊ **Fist** | **Clear Canvas** | Instantly clear the entire canvas. |

### 🖐️ Control Hand (Left Hand)

| Gesture | Action | Visual Feedback |
| :---: | :--- | :--- |
| ✌️ **Two Fingers** | **Move** | Displays a blue crosshair + glow on the nearest stroke. |
| 🤏 **Pinch & Spread** | **Scale** | Shows concentric rings + a real-time percentage (%) label. |
| 🤚 **Open Palm** | **Rotate** | Reveals an orange arc with snap points for precise rotation. |

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v16+) and npm installed.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Aditya529-ux/AIRDRAWER-NEO.git
    cd AIRDRAWER-NEO
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

4.  **Experience it:**
    Open your browser and navigate to the local server address provided by Vite (usually `http://localhost:5173`). 
    > **Note:** You must grant camera permissions for the AI hand tracking to function.

## 📂 Project Structure

```text
AIRDRAWER-NEO/
├── public/                 # Static assets (favicons, etc.)
├── src/
│   ├── assets/             # Images and global styling
│   ├── components/         # React components (UI, Canvas, CameraView, ControlPanel)
│   ├── modules/            # Core logic engines (GestureEngine, DrawingEngine, etc.)
│   ├── App.jsx             # Main application container
│   ├── index.css           # Global CSS variables and utility classes
│   └── main.jsx            # React entry point
├── package.json            # Project dependencies and scripts
└── vite.config.js          # Vite configuration
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <i>Built with passion for AI, Spatial Computing, and next-generation UI/UX.</i>
</div>
