import { auth, db } from './firebase_config.js';

const startBtn = document.getElementById('startBtn');
const drawBtn = document.getElementById('drawBtn');
const endBtn = document.getElementById('endSessionBtn');
const card = document.getElementById('card');
const video = document.getElementById('video');
const canvas = document.getElementById('output');
const toast = document.getElementById('toast');
const diceCounter = document.getElementById('diceCounter');
const canvasCtx = canvas.getContext('2d');

let totalReps = 0, repGoal = 0, currentReps = 0, dice = 0, stream = null;
let pose = null;
let camera = null;
let currentExercise = '';
let repInProgress = false;
let wakeLock = null;

const exercises = {
  Arms: ["Push-ups", "Plank Up-Downs", "Tricep Dips", "Shoulder Taps"],
  Legs: ["Squats", "Lunges", "Glute Bridges", "Calf Raises"],
  Core: ["Crunches", "Plank", "Russian Twists", "Leg Raises"],
  Cardio: ["Jumping Jacks", "High Knees", "Burpees", "Mountain Climbers"]
};

const descriptions = {
  "Push-ups": "Maintain a straight line from shoulders to heels.",
  "Plank Up-Downs": "Move from elbow to push-up position repeatedly.",
  "Tricep Dips": "Lower body until elbows reach 90° using a surface.",
  "Shoulder Taps": "Tap alternate shoulders keeping core tight.",
  "Squats": "Keep chest up and push hips back.",
  "Lunges": "Step forward and lower knee near floor.",
  "Glute Bridges": "Lift hips high, squeeze glutes.",
  "Calf Raises": "Lift heels and squeeze calves.",
  "Crunches": "Lift shoulders toward ceiling.",
  "Plank": "Hold still; engage abs.",
  "Russian Twists": "Twist torso side to side.",
  "Leg Raises": "Lift legs slowly, keep core tight.",
  "Jumping Jacks": "Full arm extension and rhythm.",
  "High Knees": "Bring knees to waist level quickly.",
  "Burpees": "Drop, push-up, and jump explosively.",
  "Mountain Climbers": "Alternate knees toward chest quickly."
};

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32]
];

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released');
      });
      console.log('Wake Lock active');
    }
  } catch (err) {
    console.error('Wake Lock error:', err);
  }
}

function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null;
    });
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 2000);
}

function drawCard() {
  const suits = ['♥', '♦', '♣', '♠'];
  const groups = ['Arms', 'Legs', 'Core', 'Cardio'];
  const randGroup = groups[Math.floor(Math.random() * groups.length)];
  currentExercise = exercises[randGroup][Math.floor(Math.random() * 4)];
  repGoal = Math.floor(Math.random() * 13) + 2;
  currentReps = 0;
  repInProgress = false;
  
  card.innerHTML = `<div id='card-suit'>${suits[Math.floor(Math.random() * 4)]} ${randGroup}</div>
  <div id='card-exercise'>${currentExercise}</div>
  <div id='card-reps'>Reps: ${repGoal}</div>
  <div id='card-progress'>Progress: ${currentReps} / ${repGoal}</div>
  <div id='card-desc'>${descriptions[currentExercise]}</div>`;
  showToast(`New card: ${currentExercise}!`);
}

function drawSkeleton(landmarks) {
  const width = canvas.width;
  const height = canvas.height;
  
  canvasCtx.strokeStyle = '#00ff00';
  canvasCtx.lineWidth = 3;
  canvasCtx.lineCap = 'round';
  
  POSE_CONNECTIONS.forEach(([i, j]) => {
    const start = landmarks[i];
    const end = landmarks[j];
    if (start && end) {
      canvasCtx.beginPath();
      canvasCtx.moveTo(start.x * width, start.y * height);
      canvasCtx.lineTo(end.x * width, end.y * height);
      canvasCtx.stroke();
    }
  });
  
  canvasCtx.fillStyle = '#ff2e2e';
  landmarks.forEach(landmark => {
    if (landmark) {
      canvasCtx.beginPath();
      canvasCtx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI);
      canvasCtx.fill();
    }
  });
}

function detectRep(landmarks) {
  if (!landmarks || landmarks.length === 0) return;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];

  if (currentExercise === 'Squats') {
    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const kneeFlexion = avgKneeY - avgHipY;
    
    if (kneeFlexion > 0.15 && !repInProgress) {
      repInProgress = true;
    } else if (kneeFlexion < 0.05 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'Lunges') {
    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const kneeFlexion = avgKneeY - avgHipY;
    
    if (kneeFlexion > 0.18 && !repInProgress) {
      repInProgress = true;
    } else if (kneeFlexion < 0.08 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'Push-ups') {
    const avgElbowY = (leftElbow.y + rightElbow.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const elbowFlexion = avgElbowY - avgShoulderY;
    
    if (elbowFlexion > 0.12 && !repInProgress) {
      repInProgress = true;
    } else if (elbowFlexion < 0.03 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'Jumping Jacks') {
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    if (avgWristY < avgShoulderY - 0.05 && !repInProgress) {
      repInProgress = true;
    } else if (avgWristY > avgShoulderY + 0.15 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'High Knees') {
    const maxKneeY = Math.max(leftKnee.y, rightKnee.y);
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const kneeRaise = avgHipY - maxKneeY;
    
    if (kneeRaise > 0.15 && !repInProgress) {
      repInProgress = true;
    } else if (kneeRaise < 0.05 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'Crunches') {
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const crunchDistance = avgHipY - avgShoulderY;
    
    if (crunchDistance < 0.25 && !repInProgress) {
      repInProgress = true;
    } else if (crunchDistance > 0.35 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'Glute Bridges') {
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipLift = avgShoulderY - avgHipY;
    
    if (hipLift < -0.1 && !repInProgress) {
      repInProgress = true;
    } else if (hipLift > 0.05 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'Russian Twists') {
    const leftShoulderX = leftShoulder.x;
    const rightShoulderX = rightShoulder.x;
    const shoulderRotation = Math.abs(leftShoulderX - rightShoulderX);
    
    if (shoulderRotation < 0.15 && !repInProgress) {
      repInProgress = true;
    } else if (shoulderRotation > 0.25 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else if (currentExercise === 'Mountain Climbers' || currentExercise === 'Burpees') {
    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const kneeToHip = avgHipY - avgKneeY;
    
    if (kneeToHip < 0.1 && !repInProgress) {
      repInProgress = true;
    } else if (kneeToHip > 0.25 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  } else {
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const armMovement = avgShoulderY - avgWristY;
    
    if (armMovement < -0.1 && !repInProgress) {
      repInProgress = true;
    } else if (armMovement > 0.1 && repInProgress) {
      repInProgress = false;
      incrementRep();
    }
  }
}

function incrementRep() {
  if (currentReps >= repGoal) return;
  
  currentReps++;
  totalReps++;
  card.querySelector('#card-progress').textContent = `Progress: ${currentReps} / ${repGoal}`;
  
  if (currentReps >= repGoal) {
    showToast('Card complete!');
    if (totalReps % 30 === 0) {
      dice++;
      diceCounter.textContent = `🎲 Dice: ${dice}`;
      showToast('🎲 +1 Dice!');
    }
    setTimeout(drawCard, 1500);
  }
}

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (results.poseLandmarks) {
    drawSkeleton(results.poseLandmarks);
    detectRep(results.poseLandmarks);
  }
  
  canvasCtx.restore();
}

async function startWorkout() {
  try {
    await requestWakeLock();
    
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 640, 
        height: 480,
        facingMode: 'user'
      } 
    });
    
    video.srcObject = stream;
    
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
    
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    pose.onResults(onResults);
    
    camera = new Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
      width: videoWidth,
      height: videoHeight
    });
    
    await camera.start();
    
    drawBtn.classList.remove('hidden');
    endBtn.classList.remove('hidden');
    startBtn.classList.add('hidden');
    drawCard();
    showToast('Camera active — pose detection ready!');
  } catch (e) {
    console.error('Camera error:', e);
    showToast('Camera access denied. Please allow camera permissions.');
  }
}

function endSession() {
  releaseWakeLock();
  
  if (camera) {
    camera.stop();
    camera = null;
  }
  
  if (pose) {
    pose.close();
    pose = null;
  }
  
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawBtn.classList.add('hidden');
  endBtn.classList.add('hidden');
  startBtn.classList.remove('hidden');
  showToast('Session ended!');
}

document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

startBtn.onclick = startWorkout;
drawBtn.onclick = () => {
  if (currentReps >= repGoal) {
    drawCard();
  }
};
endBtn.onclick = endSession;
