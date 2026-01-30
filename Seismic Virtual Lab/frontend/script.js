
// ================= STREAMING GRAPH VARIABLES =================
let displacementTimer = null;
let driftTimer = null;

// ================= SPECTRAL GRAPH VARIABLE =================
let spectralChart = null;




/* =========================
   BACKGROUND BUBBLE MIST
========================= */

document.addEventListener("DOMContentLoaded", () => {

    const runBtn = document.getElementById("runBtn");

    runBtn.addEventListener("click", () => {

        const mass = document.getElementById("mass").value;
        const stiffness = document.getElementById("stiffness").value;
        const damping = document.getElementById("damping").value;
        let floors = parseInt(document.getElementById("floors").value);

        // ✅ limit floors to 15
        if (floors > 15) {
        alert("Maximum 15 floors allowed!");
        floors = 15;
        document.getElementById("floors").value = 15;
        }


        console.log("Inputs:", mass, stiffness, damping, floors);

        fetch("http://127.0.0.1:5000/simulate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mass: mass,
                stiffness: stiffness,
                damping: damping,
                floors: floors
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Simulation Result:", data);

            // ✅ Correct graphs
            drawDisplacementGraph(data.time, data.displacement);
            drawDriftGraph(data.time, data.drift);

            // ================= BUILDING ANIMATION CALL =================
            drawBuildingAnimation(data.displacement, data.status);


// 🔴🟢 Change building color based on safety
const floors = document.querySelectorAll(".floor");

floors.forEach(floor => {
    if (data.status === "UNSAFE") {
        floor.style.background = "#ff4c4c"; // red
    } else {
        floor.style.background = "#00ffd5"; // blue
    }
});


            // mode shape//
            drawModeShape(data.mode_shapes);

            // ✅ Earthquake input graph (backend se)
           drawGroundMotionGraph(data.time, data.ground_motion);





// show frequencies
const freqBox = document.getElementById("frequencyBox");
freqBox.innerHTML = "";

data.frequencies.forEach((f,i)=>{
    freqBox.innerHTML += `<p>Mode ${i+1}: ${f.toFixed(2)} Hz</p>`;
         
    // spectral response//
        drawSpectralResponse(
        data.spectral_displacement,
        data.spectral_velocity,
        data.spectral_acceleration
    );

    


});


            // 🔥 FIX: calculate max drift here
            const maxDrift = data.max_drift;

            const driftLimit = 0.08;   // ✅ SAFE threshold tuned

            // ✅ SAFE / UNSAFE from backend
            document.getElementById("maxDriftValue").innerText = data.max_drift;

            const statusEl = document.getElementById("safetyStatus");

            if (maxDrift > driftLimit) {
                statusEl.innerText = "UNSAFE";
                statusEl.className = "unsafe";
            } else {
                statusEl.innerText = "SAFE";
                statusEl.className = "safe";
            }
        })
        .catch(error => {
            console.error("Fetch error:", error);
        });

    });

});


// ================= BACKGROUND BUBBLES =================
const canvas = document.getElementById("mistCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let bubbles = [];

class Bubble {
    constructor() { this.reset(); }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 150;
        this.radius = Math.random() * 7 + 4;
        this.speed = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 3.0 + 0.9;
    }

    update() {
        this.y -= this.speed;
        if (this.y < -20) this.reset();
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,255,255,${this.alpha})`;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

for (let i = 0; i < 120; i++) bubbles.push(new Bubble());

function animateMist() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bubbles.forEach(b => { b.update(); b.draw(); });
    requestAnimationFrame(animateMist);
}
animateMist();


// ================= CURSOR MIST =================
const cursorMist = document.getElementById("cursorMist");
let mouseX = 0, mouseY = 0, cx = 0, cy = 0;

document.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function animateCursor() {
    cx += (mouseX - cx) * 0.2;
    cy += (mouseY - cy) * 0.2;
    cursorMist.style.left = cx + "px";
    cursorMist.style.top  = cy + "px";
    requestAnimationFrame(animateCursor);
}
animateCursor();


// ================= DISPLACEMENT GRAPH =================
let displacementChart = null;

/* 
   FIX: Only plot FIRST FLOOR displacement
   (time vs displacement)
*/
function drawDisplacementGraph(time, displacement) {

    const ctx = document.getElementById("responseChart").getContext("2d");

    if (displacementChart) displacementChart.destroy();
    if (displacementTimer) clearInterval(displacementTimer); // ✅ ADD

    const roundedTime = time.map(t => t.toFixed(2));

    let index = 0; // ✅ ADD

    displacementChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Floor 1 Displacement vs Time",
                data: [],
                borderColor: "#00f5ff",
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: "rgba(255,255,255,0.2)", lineWidth: 0.8 },
                    ticks: { color: "#ffffff" }
                },
                y: {
                    grid: { color: "rgba(255,255,255,0.2)", lineWidth: 0.8 },
                    ticks: {
                         color: "#ffffff",
                         callback: function(value) {
                             return value.toFixed(4); // ✅ remove E notation
                         }
                    }
                }
            }
        }      

    });

    // ================= STREAMING ANIMATION =================
    displacementTimer = setInterval(() => {

        if (index >= roundedTime.length) {
            clearInterval(displacementTimer);
            return;
        }

        displacementChart.data.labels.push(roundedTime[index]);
        displacementChart.data.datasets[0].data.push(displacement[0][index]);

        displacementChart.update();
        index++;

    }, 45); // speed (lower = faster, higher = slower)
}



// ================= DRIFT GRAPH =================
let driftChartInstance = null;

function drawDriftGraph(time, drift) {

    if (driftChartInstance) driftChartInstance.destroy();
    if (driftTimer) clearInterval(driftTimer); // ✅ ADD

    // 🔥 FIX: round time values to 2 decimals (clean x-axis)
    const roundedTime = time.map(t => t.toFixed(2));
    let index = 0; // ✅ ADD

    const datasets = drift.map((floorData, i) => ({
        label: `Drift ${i+2}-${i+1}`,
        data: floorData,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3
    }));

    driftChartInstance = new Chart(
        document.getElementById("driftChart"),
        {
            type: "line",
            data: { 
                labels: roundedTime,   // ✅ CLEAN X-AXIS HERE
                datasets 
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    x: {
                        grid: {
                           color: "rgba(255,255,255,0.2)",   // ✅ brighter grid
                           lineWidth: 0.8
                        },
                        ticks: {
                            color: "#ffffff"
                        }
                    },
                    y: {
                       grid: {
                           color: "rgba(255,255,255,0.2)",
                           lineWidth: 0.8
                        },
                        ticks: {
                            color: "#ffffff",
                            callback: function(value) {
                                return value.toFixed(4); // ✅ remove E notation
                            }    
                        }
                    }
                
                },

                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            boxWidth: 12,
                            font: { size: 10 }
                        }
                    }
                }
            }

});

// ================= STREAMING ANIMATION =================
    driftTimer = setInterval(() => {

        if (index >= roundedTime.length) {
            clearInterval(driftTimer);
            return;
        }

        driftChartInstance.data.labels.push(roundedTime[index]);

        datasets.forEach((ds, i) => {
            ds.data.push(drift[i][index]);
        });

        driftChartInstance.update();
        index++;

    },50);
}


// ================= MODE SHAPE GRAPH =================
let modeChart = null;

function drawModeShape(modeShapes) {

    const ctx = document.getElementById("modeShapeChart").getContext("2d");

    if (modeChart) modeChart.destroy();

    const firstMode = modeShapes.map(floor => floor[0]);

    modeChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: firstMode.map((v,i)=>`Floor ${i+1}`),
            datasets: [{
                label: "Mode Shape 1",
                data: firstMode,
                borderColor: "#ffcc00",
                borderWidth: 2,
                pointRadius: 4,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { ticks: { color: "white" }},
                y: { ticks: { color: "white" }}
            }
        }
    });
}

// ================= EARTHQUAKE INPUT GRAPH =================
// This function only draws graph, does not affect backend

// ================= EARTHQUAKE INPUT GRAPH =================
let groundChart = null;

function drawGroundMotionGraph(time, groundMotion) {

    const ctx = document.getElementById("groundChart").getContext("2d");

    if (groundChart) groundChart.destroy();

    const roundedTime = time.map(t => t.toFixed(2));

    groundChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: roundedTime,
            datasets: [{
                label: "Ground Acceleration (m/s²)",
                data: groundMotion,
                borderColor: "#ffcc00",
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: "#fff" }},
                y: { ticks: { color: "#fff" }}
            }
        }
    });
}


// ================= SPECTRAL RESPONSE GRAPH =================
function drawSpectralResponse(sd, sv, sa) {

    const ctx = document.getElementById("spectralChart").getContext("2d");

    if (spectralChart) spectralChart.destroy();

    // Floors as X-axis
    const floors = sd.map((_, i) => "Floor " + (i + 1));

    spectralChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: floors,
            datasets: [
                {
                    label: "Spectral Displacement (Sd)",
                    data: sd,
                    borderColor: "#00f5ff",
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.3
                },
                {
                    label: "Spectral Velocity (Sv)",
                    data: sv,
                    borderColor: "#ffcc00",
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.3
                },
                {
                    label: "Spectral Acceleration (Sa)",
                    data: sa,
                    borderColor: "#ff4c4c",
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Floor Number"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Spectral Value"
                    }
                }
            }
        }
    });
}


// ================= BUILDING ANIMATION (FINAL HACKATHON READY VERSION) =================
let buildingTimer = null;

function drawBuildingAnimation(displacement, status) {

    const container = document.getElementById("buildingContainer");

    if (!container) {
        console.error("buildingContainer not found");
        return;
    }

    container.innerHTML = "";

    const floors = displacement.length;
    const steps = displacement[0].length;

    let floorDivs = [];

    const MAX_SHIFT = 15;     // realistic sway limit (px)
    const SCALE = 10000;      // scale backend displacement
    const SPEED = 1;          // animation speed control

    // ================= CREATE FLOORS =================
    for (let i = 0; i < floors; i++) {
        const floor = document.createElement("div");
        floor.className = "floor";

        // 🎨 color by safety
        floor.style.background = (status === "UNSAFE") ? "#ff4c4c" : "#00ffd5";

        // vertical stacking
        floor.style.position = "absolute";
        floor.style.bottom = `${i * 20}px`;

        // center horizontally
        floor.style.left = "50%";
        floor.style.transform = "translateX(-50%)";

        floor.style.transition = "transform 0.06s linear";

        container.appendChild(floor);
        floorDivs.push(floor);
    }

    let frame = 0;

    if (buildingTimer) cancelAnimationFrame(buildingTimer);

    // ================= SMOOTH PHYSICS-LIKE LOOP =================
    function animate() {

        for (let f = 0; f < floors; f++) {

            let raw = displacement[f][frame];

            // top floors move more (mode shape idea)
            let heightFactor = (f + 1) / floors;

            let move = raw * SCALE * heightFactor;

            // clamp motion
            if (move > MAX_SHIFT) move = MAX_SHIFT;
            if (move < -MAX_SHIFT) move = -MAX_SHIFT;

            floorDivs[f].style.transform =
                `translateX(calc(-50% + ${move}px))`;
        }

        frame += SPEED;
        if (frame >= steps) frame = 0;

        buildingTimer = requestAnimationFrame(animate);
    }

    animate();
}










