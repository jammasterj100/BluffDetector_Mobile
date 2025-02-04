let smoothedConfidence = 50; // Start at a neutral confidence level
let lastBox = null; // Stores the last detected face box for smoother tracking

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

async function startFaceAPI() {
    const loadingBar = document.getElementById("loading-bar");

    // Load models
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    loadingBar.style.width = "50%";

    await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    loadingBar.style.width = "100%";

    setTimeout(() => {
        document.getElementById("loading-container").style.display = "none";
    }, 500);

    startVideo();
}

function startVideo() {
    const video = document.getElementById('video');

    const constraints = {
        video: {
            facingMode: "user", // Use front-facing camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
            video.play();
            video.onloadedmetadata = () => {
                setupCanvas();
                detectBluffing();
            };
        })
        .catch(err => {
            console.error("Camera error:", err);
            alert("Camera access is blocked. Please enable it in Safari settings.");
        });
}

function setupCanvas() {
    const video = document.getElementById('video');
    let canvas = document.getElementById('faceCanvas');

    // If the canvas doesn't exist, create it
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = "faceCanvas";
        document.body.appendChild(canvas);
    }

    const context = canvas.getContext('2d');

    // Set the canvas size dynamically to match video
    canvas.style.position = "absolute";
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.left = video.offsetLeft + "px";
    canvas.style.top = video.offsetTop + "px";

    return context;
}

async function detectBluffing() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('faceCanvas');
    const context = canvas.getContext('2d');

    setInterval(async () => {
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        if (detections) {
            context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

            // **Fix: Scale face box properly to match video dimensions**
            const box = detections.detection.box;
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;

            // Adjusting face box to be more stable and centered
            let x = box.x * scaleX;
            let y = box.y * scaleY;
            let width = box.width * scaleX * 0.9; // Shrink slightly for a better fit
            let height = box.height * scaleY * 0.9;

            // **Smooth box movement to prevent jitter**
            if (lastBox) {
                x = lerp(lastBox.x, x, 0.3);
                y = lerp(lastBox.y, y, 0.3);
                width = lerp(lastBox.width, width, 0.3);
                height = lerp(lastBox.height, height, 0.3);
            }

            lastBox = { x, y, width, height }; // Store last position for smooth tracking

            // Adjust stroke color based on bluffing detection
            context.strokeStyle = 'green';
            context.lineWidth = 3;

            // **Analyze emotions to determine bluffing probability**
            const expressions = detections.expressions;
            let label = "Not Bluffing";
            let color = "green";

            const bluffingScore =
                (expressions.angry || 0) * 1.2 +
                (expressions.surprised || 0) * 1.2 +
                (expressions.fearful || 0) * 1.5 +
                (expressions.disgusted || 0) * 1.1;

            let targetConfidence = Math.min((bluffingScore * 100).toFixed(0), 100);
            smoothedConfidence = lerp(smoothedConfidence, targetConfidence, 0.2); // Smoother transition

            let displayConfidence = Math.round(smoothedConfidence);

            if (bluffingScore > 0.1) {
                label = `Bluffing ${displayConfidence}%`;
                color = "red";
                context.strokeStyle = 'red';
            } else {
                label = `Not Bluffing ${100 - displayConfidence}%`;
            }

            // **Fix: Keep face box neatly around the face and smooth movements**
            context.strokeRect(x, y, width, height);

            // Draw label above face box
            context.fillStyle = color;
            context.font = "18px Arial";
            context.fillRect(x, y - 30, width, 30); // Background for text
            context.fillStyle = "white";
            context.fillText(label, x + 5, y - 10);
        }
    }, 200);
}

// **Fix: Ensure canvas resizes when screen size changes**
window.addEventListener("resize", () => {
    setupCanvas();
});

// Start
startFaceAPI();
