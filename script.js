const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const toolbar = document.getElementById("toolbar");

const toolSelect = document.getElementById("tool");
const colorPicker = document.getElementById("color");
const thicknessInput = document.getElementById("thickness");
const lineStyleSelect = document.getElementById("line-style");
const snapIndicator = document.getElementById("snap-indicator");

// Add new tools to toolbar
toolSelect.innerHTML += `
    <option value="measure">Measure</option>
    <option value="angle">Measure Angle</option>
    <option value="compass">Compass</option>
`;

canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - toolbar.offsetHeight - 20;

const GRID_SPACING = 10;
canvas.height = Math.floor(canvas.height / GRID_SPACING) * GRID_SPACING;

let currentTool = 'dot';
let currentColor = '#000';
let currentThickness = 4;
let currentLineStyle = 'solid';
let snapToGrid = true;
let points = [];
let lines = [];
let measurements = [];
let angles = [];
let arcs = [];
let isDrawingLine = false;
let isMeasuring = false;
let isDrawingAngle = false;
let isDrawingCompass = false;
let startPoint = null;
let midPoint = null;
let currentPoint = null;
let isDragging = false;

const xyLineY = Math.round(canvas.height / (2 * GRID_SPACING)) * GRID_SPACING;

// Calculate angle between three points in degrees
function calculateAngle(point1, point2, point3) {
    const angle1 = Math.atan2(point1.y - point2.y, point1.x - point2.x);
    const angle2 = Math.atan2(point3.y - point2.y, point3.x - point2.x);
    let angle = (angle2 - angle1) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
}

// Draw arc with compass
function drawArc(center, radius, startAngle, endAngle, counterclockwise = false) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, startAngle, endAngle, counterclockwise);
    ctx.stroke();
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.setLineDash([]);
    
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#ddd';

    for (let x = 0; x <= canvas.width; x += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.lineWidth = currentThickness;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, xyLineY);
    ctx.lineTo(canvas.width, xyLineY);
    ctx.stroke();
    
    ctx.restore();
}

function drawShapes() {
    // Draw points
    points.forEach(point => {
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.thickness, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw lines
    lines.forEach(line => {
        ctx.save();
        ctx.lineWidth = line.thickness;
        ctx.strokeStyle = line.color;
        setLineStyle(line.style);
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        ctx.restore();
    });

    // Draw arcs
    arcs.forEach(arc => {
        ctx.save();
        ctx.lineWidth = arc.thickness;
        ctx.strokeStyle = arc.color;
        setLineStyle(arc.style);
        drawArc(arc.center, arc.radius, arc.startAngle, arc.endAngle);
        ctx.restore();
    });

    // Draw measurements
    measurements.forEach(m => {
        drawMeasurement(m.start, m.end, m.distance);
    });

    // Draw angles
    angles.forEach(angle => {
        drawAngleMeasurement(angle.point1, angle.point2, angle.point3, angle.angle);
    });
}

function drawAngleMeasurement(point1, point2, point3, angle) {
    ctx.save();
    
    // Draw angle lines
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff4444';
    
    ctx.beginPath();
    ctx.moveTo(point1.x, point1.y);
    ctx.lineTo(point2.x, point2.y);
    ctx.lineTo(point3.x, point3.y);
    ctx.stroke();

    // Draw angle arc
    const radius = 30;
    const startAngle = Math.atan2(point1.y - point2.y, point1.x - point2.x);
    const endAngle = Math.atan2(point3.y - point2.y, point3.x - point2.x);
    
    ctx.beginPath();
    ctx.arc(point2.x, point2.y, radius, startAngle, endAngle);
    ctx.stroke();

    // Draw angle label
    const midAngle = (startAngle + endAngle) / 2;
    const labelX = point2.x + (radius + 10) * Math.cos(midAngle);
    const labelY = point2.y + (radius + 10) * Math.sin(midAngle);
    
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.fillRect(labelX - 25, labelY - 10, 50, 20);
    
    ctx.fillStyle = '#ff4444';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(angle)}°`, labelX, labelY);
    
    ctx.restore();
}
// Draw the grid and XY line
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.setLineDash([]);
    
    // Draw grid lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#ddd';

    // Draw vertical grid lines
    for (let x = 0; x <= canvas.width; x += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= canvas.height; y += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw XY Line aligned to grid
    ctx.lineWidth = currentThickness;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, xyLineY);
    ctx.lineTo(canvas.width, xyLineY);
    ctx.stroke();
    
    ctx.restore();
}


function setLineStyle(style) {
    switch (style) {
        case 'dashed':
            ctx.setLineDash([10, 10]);
            break;
        case 'double-dashed':
            ctx.setLineDash([20, 5, 5, 5]);
            break;
        case 'dash-dot':
            ctx.setLineDash([15, 5, 5, 5, 5, 5]);
            break;
        default:
            ctx.setLineDash([]);
    }
}


// Calculate distance between two points in grid units
function calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    // Convert pixel distance to grid units (10 pixels = 1 grid unit)
    return Math.sqrt(dx * dx + dy * dy) / 10;
}

// Calculate distance from point to XY line in grid units
function calculateDistanceToXYLine(point) {
    return Math.abs(point.y - xyLineY) / GRID_SPACING;
}

// Draw measurement line and label
function drawMeasurement(start, end, distance) {
    ctx.save();
    
    // Draw measurement line
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw measurement label
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.fillRect(midX - 20, midY - 10, 40, 20);
    
    ctx.fillStyle = '#ff4444';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Round to 1 decimal place and remove trailing zero if it's a whole number
    const displayValue = distance.toFixed(1).replace(/\.0$/, '');
    ctx.fillText(displayValue, midX, midY);
    
    ctx.restore();
}

// Draw points and lines
function drawShapes() {
    // Draw points
    points.forEach(point => {
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.thickness, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw lines
    lines.forEach(line => {
        ctx.save();
        ctx.lineWidth = line.thickness;
        ctx.strokeStyle = line.color;
        setLineStyle(line.style);
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        ctx.restore();
    });

    // Draw measurements
    measurements.forEach(m => {
        drawMeasurement(m.start, m.end, m.distance);
    });
}

function addPoint(x, y) {
    points.push({ x, y, color: currentColor, thickness: currentThickness });
}

function addLine(start, end) {
    lines.push({ start, end, color: currentColor, thickness: currentThickness, style: currentLineStyle });
}


function addMeasurement(start, end) {
    let distance;
    if (end.toXYLine) {
        distance = calculateDistanceToXYLine(start);
        end = { x: start.x, y: xyLineY }; // Point on XY line
    } else {
        distance = calculateDistance(start, end);
    }
    measurements.push({ start, end, distance });
}

function snap(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
}

function getNearestPoint(x, y, threshold = 10) {
    for (const point of points) {
        const distance = calculateDistance(point, { x, y });
        if (distance < threshold) {
            return point;
        }
    }
    return null;
}

function drawPreview(x, y) {
    if (snapToGrid) {
        x = snap(x, 10);
        y = snap(y, 10);
    }

    ctx.save();
    
    const nearestPoint = getNearestPoint(x, y);
    const previewPoint = nearestPoint || { x, y };

    if (currentTool === 'dot') {
        ctx.setLineDash([]);
        ctx.fillStyle = currentColor;
        ctx.beginPath();
        ctx.arc(x, y, currentThickness, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (currentTool === 'line' && isDrawingLine && startPoint) {
        ctx.lineWidth = currentThickness;
        ctx.strokeStyle = currentColor;
        setLineStyle(currentLineStyle);
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    else if (currentTool === 'measure' && isMeasuring && startPoint) {
        const distance = calculateDistance(startPoint, previewPoint);
        drawMeasurement(startPoint, previewPoint, distance);

        if (!nearestPoint) {
            const distanceToXY = calculateDistanceToXYLine(previewPoint);
            drawMeasurement(previewPoint, { x: previewPoint.x, y: xyLineY }, distanceToXY);
        }
    }
    else if (currentTool === 'angle' && isDrawingAngle) {
        if (startPoint && !midPoint) {
            // Draw first line of angle
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#ff4444';
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        else if (startPoint && midPoint) {
            // Draw complete angle preview
            const angle = calculateAngle(startPoint, midPoint, previewPoint);
            drawAngleMeasurement(startPoint, midPoint, previewPoint, angle);
        }
    }
    else if (currentTool === 'compass' && isDrawingCompass) {
        if (startPoint) {
            const radius = calculateDistance(startPoint, previewPoint) * GRID_SPACING;
            ctx.save();
            ctx.lineWidth = currentThickness;
            ctx.strokeStyle = currentColor;
            setLineStyle(currentLineStyle);
            drawArc(startPoint, radius, 0, Math.PI * 2);
            ctx.restore();
        }
    }
    
    ctx.restore();
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (snapToGrid) {
        x = snap(x, 10);
        y = snap(y, 10);
    }

    const nearestPoint = getNearestPoint(x, y);
    const clickPoint = nearestPoint || { x, y };

    switch (currentTool) {
        case 'dot':
            addPoint(x, y);
            break;
        case 'line':
            if (!isDrawingLine) {
                startPoint = clickPoint;
                isDrawingLine = true;
            } else {
                addLine(startPoint, clickPoint);
                isDrawingLine = false;
                startPoint = null;
            }
            break;
        case 'measure':
            if (!isMeasuring) {
                startPoint = clickPoint;
                isMeasuring = true;
            } else {
                addMeasurement(startPoint, clickPoint);
                if (!nearestPoint) {
                    addMeasurement(clickPoint, { toXYLine: true });
                }
                isMeasuring = false;
                startPoint = null;
            }
            break;
        case 'angle':
            if (!isDrawingAngle) {
                startPoint = clickPoint;
                isDrawingAngle = true;
            } else if (!midPoint) {
                midPoint = clickPoint;
            } else {
                const angle = calculateAngle(startPoint, midPoint, clickPoint);
                angles.push({
                    point1: startPoint,
                    point2: midPoint,
                    point3: clickPoint,
                    angle: angle
                });
                isDrawingAngle = false;
                startPoint = null;
                midPoint = null;
            }
            break;
        case 'compass':
            if (!isDrawingCompass) {
                startPoint = clickPoint; // Center point
                isDrawingCompass = true;
            } else {
                const radius = calculateDistance(startPoint, clickPoint) * GRID_SPACING;
                arcs.push({
                    center: startPoint,
                    radius: radius,
                    startAngle: 0,
                    endAngle: Math.PI * 2,
                    color: currentColor,
                    thickness: currentThickness,
                    style: currentLineStyle
                });
                isDrawingCompass = false;
                startPoint = null;
            }
            break;
    }

    drawGrid();
    drawShapes();
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    drawGrid();
    drawShapes();
    drawPreview(x, y);
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
        snapToGrid = false;
        snapIndicator.textContent = "Snap to Grid: OFF";
    } else if (e.key === 'Escape') {
        // Cancel current operation
        isDrawingLine = false;
        isMeasuring = false;
        startPoint = null;
        drawGrid();
        drawShapes();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
        snapToGrid = true;
        snapIndicator.textContent = "Snap to Grid: ON";
    }
});

toolSelect.addEventListener('change', (e) => {
    currentTool = e.target.value;
    isDrawingLine = false;
    isMeasuring = false;
    isDrawingAngle = false;
    isDrawingCompass = false;
    startPoint = null;
    midPoint = null;
});

colorPicker.addEventListener('input', (e) => currentColor = e.target.value);
thicknessInput.addEventListener('input', (e) => currentThickness = parseInt(e.target.value));
lineStyleSelect.addEventListener('change', (e) => currentLineStyle = e.target.value);

// Initialize canvas
drawGrid();