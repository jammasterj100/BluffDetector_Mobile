let smoothedConfidence = 50; // Start at a neutral confidence level

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

async function startFaceAPI() {
    const loadingBar = document.getElementById("loading-bar");

    // Load the tinyFaceDetector model (50% progress)
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    loadingBar.style.width = "50%";

    // Load the faceExpression model (100% progress)
    await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    loadingBar.style.width = "100%";

    // Hide the loading bar once models are loaded
    setTimeout(() => {
        document.getElementById("loading-container").style.display = "none";
    }, 500);

    startVideo();
}

function startVideo() {
    const video = document.getElementById('video');

    const constraints = {
        video: {
            facingMode: "user", // Ensure front-facing camera
            width: { ideal: 1280 }, // Adjust for mobile performance
            height: { ideal: 720 }
        },
        audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
            video.play();
        })
        .catch(err => {
            console.error("Camera error:", err);
            alert("Camera access is blocked. Please enable it in Safari settings.");
        });
}

async function detectBluffing() {
    const video = document.getElementById('video');
    const canvas = document.createElement('canvas'); // Create a canvas for drawing
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    canvas.style.position = "absolute";
    canvas.style.top = video.offsetTop + "px";
    canvas.style.left = video.offsetLeft + "px";
    canvas.width = video.width;
    canvas.height = video.height;

    setInterval(async () => {
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        if (detections) {
            context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

            // Get the face box
            const box = detections.detection.box;
            context.strokeStyle = 'green'; // Default to green
            context.lineWidth = 3;

            // Analyze emotions
            const expressions = detections.expressions;
            let label = "Not Bluffing";
            let color = "green"; // Default to green

            // Bluffing Detection with Smoother Confidence Changes
            const bluffingScore =
                (expressions.angry || 0) * 1.2 +   // Increased weight for "angry"
                (expressions.surprised || 0) * 1.2 +  // Increased weight for "surprised"
                (expressions.fearful || 0) * 1.5 + // Fearful is more significant
                (expressions.disgusted || 0) * 1.1; // Include "disgusted"

            let targetConfidence = Math.min((bluffingScore * 100).toFixed(0), 100); // Confidence percentage (0-100)

            // Smooth transition of confidence
            smoothedConfidence = lerp(smoothedConfidence, targetConfidence, 0.15); // Adjust 0.15 to control speed of transition

            let displayConfidence = Math.round(smoothedConfidence);

            if (bluffingScore > 0.1) { // Lower threshold for higher sensitivity
                label = `Bluffing ${displayConfidence}%`; // Show confidence percentage
                color = "red"; // Change to red for bluffing
                context.strokeStyle = 'red'; // Box color changes
            } else {
                label = `Not Bluffing ${100 - displayConfidence}%`; // Opposite confidence
            }

            // Draw the box
            context.strokeRect(box.x, box.y, box.width, box.height);

            // Add the label above the box
            context.fillStyle = color;
            context.font = "20px Arial";
            context.fillRect(box.x, box.y - 25, box.width, 25); // Label background
            context.fillStyle = "white";
            context.fillText(label, box.x + 5, box.y - 5); // Label text
        }
    }, 200); // Runs every 200ms for smoother updates
}

window.addEventListener("resize", () => {
    const video = document.getElementById('video');
    video.style.width = window.innerWidth + "px";
    video.style.height = window.innerHeight + "px";
});

// Start everything
startFaceAPI().then(detectBluffing);

