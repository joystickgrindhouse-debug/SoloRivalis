# Rivalis - Solo Mode

## Overview
Rivalis Solo Mode is a fitness tracking web application that uses MediaPipe Pose detection to automatically count exercise reps. The app presents workout cards with random exercises and tracks user progress using camera-based pose detection.

## Current State
- **Status**: Fully functional fitness tracker with pose detection
- **Last Updated**: October 17, 2025
- **Type**: Static web application with Firebase integration

## Features
- Camera-based pose detection using MediaPipe
- Automatic rep counting for multiple exercise types
- Random workout card generation with 4 categories (Arms, Legs, Core, Cardio)
- Real-time visual feedback with pose skeleton overlay
- Dice reward system (1 dice per 30 reps)
- Firebase authentication and Firestore integration ready

## Project Architecture

### Frontend Structure
- `index.html` - Main HTML structure
- `solo_style.css` - Styling with red/black gaming theme
- `solo_script.js` - Main game logic and MediaPipe integration
- `firebase_config.js` - Firebase configuration
- `assets/Solo.png` - Background image

### Key Technologies
- MediaPipe Pose Detection (CDN-based)
- Firebase (Auth & Firestore)
- Vanilla JavaScript (ES6 modules)
- Python HTTP server for static file serving

### Server Configuration
- **Host**: 0.0.0.0 (allows Replit proxy)
- **Port**: 5000
- **Cache Control**: Disabled for development
- **CORS**: Enabled

## Exercise Categories
1. **Arms**: Push-ups, Plank Up-Downs, Tricep Dips, Shoulder Taps
2. **Legs**: Squats, Lunges, Glute Bridges, Calf Raises
3. **Core**: Crunches, Plank, Russian Twists, Leg Raises
4. **Cardio**: Jumping Jacks, High Knees, Burpees, Mountain Climbers

## Camera & Permissions
- Camera permissions are requested each session when "Start Workout" is clicked
- MediaPipe Pose model runs locally in browser
- Real-time pose skeleton overlay on video feed
- Automatic rep detection based on joint movements

## Deployment Notes
- Uses Python HTTP server with proper cache headers
- Configured for Replit's webview proxy
- All static assets served from root directory
