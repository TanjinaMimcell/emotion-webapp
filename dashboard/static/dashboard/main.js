let privacy = false;
const privacyToggle = document.getElementById("privacyToggle");
privacyToggle.addEventListener("click", () => {
    privacy = !privacy;
    privacyToggle.textContent = privacy ? "Privacy 🔓" : "Privacy 🔒";
});

// Webcam setup
const video = document.getElementById("webcam");
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error("Error accessing webcam:", err));

// Stats & accuracy
let totalFaces = 0;
let correctPred = 0;
let faceAccuracy = {};
let emotionCount = {};

const totalFacesEl = document.getElementById("totalFaces");
const correctPredEl = document.getElementById("correctPred");
const accuracyEl = document.getElementById("accuracy");
const mostEmotionEl = document.getElementById("mostEmotion");
const logsTableBody = document.querySelector("#logsTable tbody");

// Canvas for overlay
const canvas = document.createElement("canvas");
canvas.style.position = "absolute";
canvas.style.left = video.offsetLeft + "px";
canvas.style.top = video.offsetTop + "px";
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

// Emotion colors & advice
const colors = { happy:"green", sad:"blue", angry:"red", fear:"purple", surprise:"orange", neutral:"gray", disgust:"brown" };
const adviceText = { happy:"Keep smiling 😄", sad:"Cheer up 🙂", angry:"Take a deep breath 🧘", fear:"Stay calm 😌", surprise:"Interesting 😲", neutral:"Stay balanced 😐", disgust:"Relax 😬" };

// Keyboard input
let currentActual = "neutral";
document.addEventListener("keydown", e => {
    const keyMap = { h:"happy", s:"sad", a:"angry", f:"fear", u:"surprise", n:"neutral", d:"disgust" };
    if(keyMap[e.key]) currentActual = keyMap[e.key];
});

// 🎯 Improved Chart.js Setup
const chartCtx = document.getElementById('accuracyChart').getContext('2d');
const accuracyChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Emotion Prediction Accuracy Over Time',
            data: [],
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderWidth: 3,
            tension: 0.4, // smooth curve
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#007bff',
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: true, labels: { color: '#333' } },
            title: {
                display: true,
                text: 'Emotion Prediction Accuracy Over Time',
                font: { size: 18, weight: 'bold' },
                color: '#333'
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Number of Tests', color: '#555' },
                grid: { color: '#e0e0e0' },
                ticks: { color: '#555' }
            },
            y: {
                title: { display: true, text: 'Accuracy (%)', color: '#555' },
                min: 0,
                max: 100,
                grid: { color: '#e0e0e0' },
                ticks: { color: '#555' }
            }
        }
    }
});

// ✅ Helper to update chart dynamically
function updateAccuracyChart(accuracyValue) {
    accuracyChart.data.labels.push(accuracyChart.data.labels.length + 1);
    accuracyChart.data.datasets[0].data.push(accuracyValue);
    accuracyChart.update();
}

// Capture frames every 2 sec
setInterval(() => {
    if(!video.srcObject) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(video,0,0,canvas.width,canvas.height);

    // ✅ Privacy Blur Mode
    if (privacy) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = "blur(15px)";
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
    }

    const dataURL = canvas.toDataURL("image/jpeg");

    fetch("/api/analyze/", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ frame: dataURL, actual: currentActual })
    })
    .then(res=>res.json())
    .then(data=>{
        data.faces.forEach(face=>{
            totalFaces += 1;

            if(!faceAccuracy[face.face_id]) faceAccuracy[face.face_id]={correct:0,total:0};
            faceAccuracy[face.face_id].total +=1;
            if(face.correct) faceAccuracy[face.face_id].correct +=1;
            const acc = (faceAccuracy[face.face_id].correct / faceAccuracy[face.face_id].total)*100;

            if(face.correct) correctPred +=1;

            totalFacesEl.textContent = totalFaces;
            correctPredEl.textContent = correctPred;
            accuracyEl.textContent = acc.toFixed(2)+"%";

            emotionCount[face.predicted]=(emotionCount[face.predicted]||0)+1;
            const mostEmotion = Object.keys(emotionCount).reduce((a,b)=>emotionCount[a]>emotionCount[b]?a:b);
            mostEmotionEl.textContent = mostEmotion;

            if(!privacy){
                const [x,y,w,h]=face.coords;
                ctx.strokeStyle = colors[face.predicted]||"white";
                ctx.lineWidth = 3;
                ctx.strokeRect(x,y,w,h);

                ctx.fillStyle = colors[face.predicted]||"white";
                ctx.font="18px Arial";
                ctx.fillText(face.predicted, x, y-5);

                ctx.fillStyle="yellow";
                ctx.fillText(adviceText[face.predicted]||"", x, y+h+20);
            }

            const row=document.createElement("tr");
            row.innerHTML=`
                <td>${face.face_id}</td>
                <td>${currentActual}</td>
                <td>${face.predicted}</td>
                <td>${face.correct}</td>
                <td>${acc.toFixed(2)}</td>
                <td>${new Date().toLocaleTimeString()}</td>
            `;
            logsTableBody.prepend(row);

            // 📈 Update Chart dynamically
            updateAccuracyChart(acc);
        });
    })
    .catch(err=>console.error(err));

}, 2000);
