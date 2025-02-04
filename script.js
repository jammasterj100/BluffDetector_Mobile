let smoothedConfidence = 50; // Start at a neutral confidence level

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
            facingMode: "user",
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
                setupCanvas(); // Ensure canvas is set up once video starts
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
    const canvas = document.createElement('canvas'); // Create canvas
    canvas.id = "faceCanvas";
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');

    // Position & size canvas properly
    canvas.style.position = "absolute";
    canvas.style.top = video.offsetTop + "px";
    canvas.style.left = video.offsetLeft + "px";
    canvas.width = video.videoWidth; 
    canvas.height = video.videoHeight;

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

            // Get face box
            const box = detections.detection.box;
            context.strokeStyle = 'green';
            context.lineWidth = 3;

            // Analyze emotions for bluffing
            const expressions = detections.expressions;
            let label = "Not Bluffing";
            let color = "green";

            const bluffingScore =
                (expressions.angry || 0) * 1.2 +  
                (expressions.surprised || 0) * 1.2 +  
                (expressions.fearful || 0) * 1.5 +  
                (expressions.disgusted || 0) * 1.1;  

            let targetConfidence = Math.min((bluffingScore * 100).toFixed(0), 100);
            smoothedConfidence = lerp(smoothedConfidence, targetConfidence, 0.15); // Smooth transition

            let displayConfidence = Math.round(smoothedConfidence);

            if (bluffingScore > 0.1) {
                label = `Bluffing ${displayConfidence}%`;
                color = "red";
                context.strokeStyle = 'red';
            } else {
                label = `Not Bluffing ${100 - displayConfidence}%`;
            }

            // Draw bounding box
            context.strokeRect(box.x, box.y, box.width, box.height);

            // Draw label above box
            context.fillStyle = color;
            context.font = "20px Arial";
            context.fillRect(box.x, box.y - 25, box.width, 25);
            context.fillStyle = "white";
            context.fillText(label, box.x + 5, box.y - 5);
        }
    }, 200);
}

// Resize canvas dynamically if window resizes
window.addEventListener("resize", () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('faceCanvas');
    if (canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }
});

// Start
startFaceAPI();


