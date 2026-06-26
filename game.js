// ============================================================================
// 1. 게임 전역 설정 및 변수 선언 (Temporal Dead Zone 에러 완전 방지)
// ============================================================================
const BOARD_SIZE = 8;
const CELL_SIZE = 60;
const GAP = 4;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

canvas.width = BOARD_SIZE * CELL_SIZE;
canvas.height = BOARD_SIZE * CELL_SIZE;

const pieceCanvas = [
    document.getElementById("piece0"),
    document.getElementById("piece1"),
    document.getElementById("piece2")
];

const pieceCtx = pieceCanvas.map(c => c.getContext("2d"));

// 게임 점수 및 콤보 상태 변수
let score = 0;
let best = Number(localStorage.getItem("bestScore") || 0);
let combo = 0;
let spawnAnimation = 1; // 변수를 맨 위로 올림

// UI 초기 설정
document.getElementById("best").textContent = best;

// 드래그 상태 관리 변수
let dragging = false;
let selectedPiece = -1;
let hoverX = -1;
let hoverY = -1;
let dragX = 0; 
let dragY = 0; 

// 블록 색상 정보
const COLORS = [
    "#6FD96F",
    "#5FC5FF",
    "#FFB74D",
    "#F46C6C",
    "#B388FF",
    "#FFD54F",
    "#4DD0E1"
];

// 블록 모양 배열 정보
const SHAPES = [
    [[1]],
    [[1,1]],
    [[1],[1]],
    [[1,1,1]],
    [[1],[1],[1]],
    [[1,1,1,1]],
    [[1],[1],[1],[1]],
    [[1,1],[1,1]],
    [[1,0],[1,1]],
    [[0,1],[1,1]],
    [[1,1],[1,0]],
    [[1,1],[0,1]],
    [[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1]],
    [[0,0,1],[1,1,1]],
    [[1,1,1],[1,0,0]],
    [[1,1,1],[0,0,1]],
    [[1,1,0],[0,1,1]],
    [[0,1,1],[1,1,0]]
];

// 게임 보드 판 배열 데이터 구조
const board = [];
for(let y=0; y<BOARD_SIZE; y++){
    board[y] = [];
    for(let x=0; x<BOARD_SIZE; x++){
        board[y][x] = null;
    }
}

// 하단 블록 저장용 트레이
let tray = [null, null, null];

// 시각 효과 배열
let effects = [];
let popups = [];

// ============================================================================
// 2. 클래스 선언
// ============================================================================
class Piece {
    constructor(shape){
        this.shape = JSON.parse(JSON.stringify(shape));
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
}

// ============================================================================
// 3. 헬퍼 및 유틸리티 함수 선언
// ============================================================================
function randomShape(){
    return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

function balancedShape(){
    const pool = [];
    SHAPES.forEach(shape => {
        let count = 0;
        for(const r of shape) {
            for(const c of r) {
                if(c) count++;
            }
        }
        let weight = 6 - count;
        if(weight < 1) weight = 1;
        for(let i=0; i<weight; i++) {
            pool.push(shape);
        }
    });
    return JSON.parse(
        JSON.stringify(
            pool[Math.floor(Math.random() * pool.length)]
        )
    );
}

function roundRectCanvas(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x+r, y);
    g.arcTo(x+w, y, x+w, y+h, r);
    g.arcTo(x+w, y+h, x, y+h, r);
    g.arcTo(x, y+h, x, y, r);
    g.arcTo(x, y, x+w, y, r);
    g.closePath();
}

function Effect(x, y, color){
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 1;
}

function addEffect(x, y, color){
    effects.push(new Effect(x, y, color));
}

function addPopup(text){
    popups.push({
        text,
        y: 40,
        alpha: 1
    });
}

// ============================================================================
// 4. 게임 핵심 비즈니스 로직 함수
// ============================================================================
function updateScore(add){
    score += add;
    document.getElementById("score").textContent = score;

    if(score > best){
        best = score;
        localStorage.setItem("bestScore", best);
        document.getElementById("best").textContent = best;
    }

    if(combo > 1){
        addPopup(combo + " COMBO!");
    }
}

function refillTray(){
    const isAllEmpty = tray.every(p => p === null);
    if (isAllEmpty) {
        tray = [];
        while(tray.length < 3){
            tray.push(new Piece(balancedShape()));
        }
        spawnAnimation = 0; // 페이드인 애니메이션 카운터 리셋
    }
    drawTray();
}

function canPlace(piece, gx, gy){
    if (!piece) return false;
    for(let y=0; y<piece.shape.length; y++){
        for(let x=0; x<piece.shape[y].length; x++){
            if(!piece.shape[y][x]) continue;

            let bx = gx + x;
            let by = gy + y;

            if(bx < 0 || by < 0 || bx >= BOARD_SIZE || by >= BOARD_SIZE){
                return false;
            }
            if(board[by][bx]){
                return false;
            }
        }
    }
    return true;
}

function placePiece(piece, gx, gy){
    if(!canPlace(piece, gx, gy)) return false;

    for(let y=0; y<piece.shape.length; y++){
        for(let x=0; x<piece.shape[y].length; x++){
            if(!piece.shape[y][x]) continue;
            board[gy+y][gx+x] = piece.color;
        }
    }

    updateScore(5);
    clearLines();
    return true;
}

function clearLines(){
    let rows = [];
    let cols = [];

    for(let y=0; y<BOARD_SIZE; y++){
        let ok = true;
        for(let x=0; x<BOARD_SIZE; x++){
            if(!board[y][x]){ ok = false; break; }
        }
        if(ok) rows.push(y);
    }

    for(let x=0; x<BOARD_SIZE; x++){
        let ok = true;
        for(let y=0; y<BOARD_SIZE; y++){
            if(!board[y][x]){ ok = false; break; }
        }
        if(ok) cols.push(x);
    }

    if(rows.length === 0 && cols.length === 0){
        combo = 0;
        return;
    }

    combo++;

    rows.forEach(y => {
        for(let x=0; x<BOARD_SIZE; x++){
            addEffect(x, y, board[y][x]);
            board[y][x] = null;
        }
    });

    cols.forEach(x => {
        for(let y=0; y<BOARD_SIZE; y++){
            addEffect(x, y, board[y][x]);
            board[y][x] = null;
        }
    });

    updateScore((rows.length + cols.length) * 100 * combo);
}

function existsPossibleMove(){
    for(const piece of tray){
        if (!piece) continue; 
        for(let y=0; y<BOARD_SIZE; y++){
            for(let x=0; x<BOARD_SIZE; x++){
                if(canPlace(piece, x, y)){
                    return true;
                }
            }
        }
    }
    return false;
}

function gameOver(){
    const panel = document.getElementById("gameOver");
    panel.classList.remove("hidden");
    panel.style.opacity = 0;
    panel.style.transition = "opacity .25s";
    requestAnimationFrame(() => {
        panel.style.opacity = 1;
    });
}

// ============================================================================
// 5. 그리기(Rendering) 함수
// ============================================================================
function drawBoard(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(let y=0; y<BOARD_SIZE; y++){
        for(let x=0; x<BOARD_SIZE; x++){
            const px = x * CELL_SIZE;
            const py = y * CELL_SIZE;

            ctx.fillStyle = "#DFC092";

            if(board[y][x]){
                ctx.fillStyle = board[y][x];
            }

            roundRectCanvas(
                ctx,
                px+2,
                py+2,
                CELL_SIZE-GAP,
                CELL_SIZE-GAP,
                10
            );
            ctx.fill();
        }
    }
    drawGhost();         
    drawDraggingPiece(); 
}

function drawTray(){
    for(let i=0; i<3; i++){
        const c = pieceCanvas[i];
        const g = pieceCtx[i];

        g.clearRect(0, 0, c.width, c.height);

        if(!tray[i] || (dragging && selectedPiece === i)) continue;

        const p = tray[i];
        const cell = 24;
        const rows = p.shape.length;
        const cols = p.shape[0].length;

        const ox = (c.width - cols * cell) / 2;
        const oy = (c.height - rows * cell) / 2;

        for(let y=0; y<rows; y++){
            for(let x=0; x<cols; x++){
                if(!p.shape[y][x]) continue;

                g.fillStyle = p.color;
                roundRectCanvas(
                    g,
                    ox + x * cell,
                    oy + y * cell,
                    cell - 2,
                    cell - 2,
                    6
                );
                g.fill();
            }
        }
    }
}

function drawGhost(){
    if(selectedPiece === -1 || hoverX < 0 || hoverY < 0) return;

    const piece = tray[selectedPiece];
    if(!piece) return;

    const ok = canPlace(piece, hoverX, hoverY);

    ctx.save();
    ctx.globalAlpha = ok ? .35 : .18;
    ctx.fillStyle = ok ? piece.color : "#ff4444";

    for(let y=0; y<piece.shape.length; y++){
        for(let x=0; x<piece.shape[y].length; x++){
            if(!piece.shape[y][x]) continue;

            roundRectCanvas(
                ctx,
                (hoverX + x) * CELL_SIZE + 2,
                (hoverY + y) * CELL_SIZE + 2,
                CELL_SIZE - GAP,
                CELL_SIZE - GAP,
                10
            );
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawDraggingPiece() {
    if (!dragging || selectedPiece === -1) return;
    const piece = tray[selectedPiece];
    if (!piece) return;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = piece.color;

    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (!piece.shape[y][x]) continue;

            roundRectCanvas(
                ctx,
                dragX + x * CELL_SIZE + 2,
                dragY + y * CELL_SIZE + 2,
                CELL_SIZE - GAP,
                CELL_SIZE - GAP,
                10
            );
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawEffects(){
    for(let i=effects.length-1; i>=0; i--){
        const e = effects[i];
        e.life -= 0.04;
        if(e.life <= 0){
            effects.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = e.life;
        ctx.fillStyle = e.color;
        roundRectCanvas(
            ctx,
            e.x * CELL_SIZE + 8 - (1 - e.life) * 10,
            e.y * CELL_SIZE + 8 - (1 - e.life) * 10,
            CELL_SIZE - 16 + (1 - e.life) * 20,
            CELL_SIZE - 16 + (1 - e.life) * 20,
            12
        );
        ctx.fill();
        ctx.restore();
    }
}

function drawPopup(){
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 34px Arial";
    for(let i=popups.length-1; i>=0; i--){
        const p = popups[i];
        p.y -= 0.5;
        p.alpha -= 0.01;
        if(p.alpha <= 0){
            popups.splice(i, 1);
            continue;
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(p.text, canvas.width / 2, p.y);
    }
    ctx.restore();
}

// ============================================================================
// 6. 드래그 조작 제어부 (마우스 및 터치 이벤트 처리)
// ============================================================================
function updateDragCoordinates(clientX, clientY) {
    if (selectedPiece === -1) return;
    const piece = tray[selectedPiece];
    if (!piece) return;

    const rect = canvas.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;

    const cols = piece.shape[0].length;
    const rows = piece.shape.length;

    // 손가락이 피스 중앙에 정확히 오도록 좌표 보정
    dragX = touchX - (cols * CELL_SIZE) / 2;

    // 손가락이 피스를 가리지 않도록 45px 오프셋 제공
    dragY = touchY - (rows * CELL_SIZE) - 45;

    hoverX = Math.round(dragX / CELL_SIZE);
    hoverY = Math.round(dragY / CELL_SIZE);
}

function handleDragStart(index, clientX, clientY) {
    if (!tray[index] || dragging) return;
    selectedPiece = index;
    dragging = true;

    updateDragCoordinates(clientX, clientY);
    drawTray(); 
    drawBoard();
}

function handleDragMove(clientX, clientY) {
    if (!dragging || selectedPiece === -1) return;
    updateDragCoordinates(clientX, clientY);
    drawBoard();
}

function handleDragEnd() {
    if (!dragging || selectedPiece === -1) return;

    const piece = tray[selectedPiece];
    let placed = false;

    if (piece && hoverX >= 0 && hoverY >= 0) {
        if (placePiece(piece, hoverX, hoverY)) {
            tray[selectedPiece] = null;
            placed = true;

            const isAllEmpty = tray.every(p => p === null);
            if (isAllEmpty) {
                tray = [];
                refillTray();
            } else {
                drawTray();
            }

            if (!existsPossibleMove()) {
                gameOver();
            }
        }
    }

    if (!placed) {
        drawTray();
    }

    dragging = false;
    selectedPiece = -1;
    hoverX = -1;
    hoverY = -1;
    drawBoard();
}

// 터치/마우스 이벤트 연결
pieceCanvas.forEach((c, index) => {
    c.draggable = false;

    c.addEventListener("touchstart", (e) => {
        if (e.touches.length > 0) {
            const t = e.touches[0];
            handleDragStart(index, t.clientX, t.clientY);
        }
        e.preventDefault();
    }, { passive: false });

    c.addEventListener("mousedown", (e) => {
        handleDragStart(index, e.clientX, e.clientY);
        e.preventDefault();
    });
});

window.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    if (e.touches.length > 0) {
        const t = e.touches[0];
        handleDragMove(t.clientX, t.clientY);
    }
    e.preventDefault();
}, { passive: false });

window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    handleDragMove(e.clientX, e.clientY);
});

window.addEventListener("touchend", (e) => {
    if (!dragging) return;
    handleDragEnd();
    e.preventDefault();
}, { passive: false });

window.addEventListener("mouseup", (e) => {
    if (!dragging) return;
    handleDragEnd();
});

// ============================================================================
// 7. 게임 메인 루프 및 초기 구동
// ============================================================================
function animateTray(){
    spawnAnimation += 0.08;
    if(spawnAnimation > 1) spawnAnimation = 1;

    pieceCanvas.forEach(c => {
        c.style.transform = "scale(" + spawnAnimation + ")";
        c.style.opacity = spawnAnimation;
    });
}

function loop(){
    drawBoard();
    drawEffects();
    drawPopup();
    requestAnimationFrame(loop);
}

// 리스타트 버튼 핸들러
document.getElementById("restart").onclick = () => {
    score = 0;
    document.getElementById("score").textContent = 0;
    combo = 0;
    effects.length = 0;
    popups.length = 0;
    tray = [null, null, null];
    selectedPiece = -1;
    hoverX = -1;
    hoverY = -1;

    for(let y=0; y<BOARD_SIZE; y++){
        for(let x=0; x<BOARD_SIZE; x++){
            board[y][x] = null;
        }
    }

    document.getElementById("gameOver").classList.add("hidden");
    refillTray();
    drawBoard();
};

// 메인 루프 및 이펙트 구동
loop();
setInterval(animateTray, 16);

// 게임 최초 실행 초기화 (순서 꼬임 방지)
tray = [];
refillTray();
drawBoard();