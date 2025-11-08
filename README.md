# Homekeep

A React Native Expo application for home management and maintenance tracking.

## Features

- **Home Screen**: Welcome page with navigation to other screens
- **About Screen**: Information about the Homekeep app and its features
- **Settings Screen**: User preferences and account settings

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dandmcd/homekeep.git
cd homekeep
```

2. Install dependencies:
```bash
npm install
```

### Running the App

Start the Expo development server:
```bash
npm start
```

Run on specific platforms:
```bash
npm run android  # Android
npm run ios      # iOS (requires macOS)
npm run web      # Web browser
```

## Project Structure

```
homekeep/
├── screens/           # App screens
│   ├── HomeScreen.js
│   ├── AboutScreen.js
│   └── SettingsScreen.js
├── assets/           # Images and other assets
├── App.js            # Main app component with navigation
├── app.json          # Expo configuration
└── package.json      # Project dependencies
```

## Technologies Used

- React Native
- Expo SDK 54
- React Navigation
- React Native Screens
- React Native Safe Area Context

## License

This project is open source and available under the MIT License.
