```javascript
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

const pieceCtx = pieceCanvas.map(c=>c.getContext("2d"));

let score = 0;
let best = Number(localStorage.getItem("bestScore")||0);

document.getElementById("best").textContent = best;

const COLORS = [
    "#6FD96F",
    "#5FC5FF",
    "#FFB74D",
    "#F46C6C",
    "#B388FF",
    "#FFD54F",
    "#4DD0E1"
];

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

class Piece {
    constructor(shape){
        this.shape = JSON.parse(JSON.stringify(shape));
        this.color = COLORS[Math.floor(Math.random()*COLORS.length)];
    }
}

const board = [];
for(let y=0;y<BOARD_SIZE;y++){
    board[y]=[];
    for(let x=0;x<BOARD_SIZE;x++){
        board[y][x]=null;
    }
}

// [버그 2 해결] 사용된 블록 자리를 유지하기 위해 null 허용 구조의 배열로 유지
let tray = [null, null, null];
let selectedPiece = -1;

function randomShape(){
    return SHAPES[Math.floor(Math.random()*SHAPES.length)];
}

// [버그 2 해결] 3개의 블록 슬롯이 모두 비었을(null) 때만 한꺼번에 리필하도록 변경
function refillTray(){
    const isAllEmpty = tray.every(p => p === null);
    if (isAllEmpty) {
        tray = [];
        while(tray.length < 3){
            tray.push(new Piece(balancedShape()));
        }
        spawnAnimation = 0;
    }
    drawTray();
}

function drawTray(){
    for(let i=0;i<3;i++){
        const c = pieceCanvas[i];
        const g = pieceCtx[i];

        g.clearRect(0, 0, c.width, c.height);

        // 드래그 중인 블록은 트레이에서 보이지 않게 처리해 "직접 집어 올린" 느낌을 줍니다.
        if(!tray[i] || (dragging && selectedPiece === i)) continue;

        const p = tray[i];
        const cell = 24;
        const rows = p.shape.length;
        const cols = p.shape[0].length;

        const ox = (c.width-cols*cell)/2;
        const oy = (c.height-rows*cell)/2;

        for(let y=0;y<rows;y++){
            for(let x=0;x<cols;x++){
                if(!p.shape[y][x]) continue;

                g.fillStyle=p.color;
                roundRectCanvas(
                    g,
                    ox+x*cell,
                    oy+y*cell,
                    cell-2,
                    cell-2,
                    6
                );
                g.fill();
            }
        }
    }
}

function roundRectCanvas(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x+r,y);
    g.arcTo(x+w, y, x+w, y+h, r);
    g.arcTo(x+w, y+h, x, y+h, r);
    g.arcTo(x, y+h, x, y, r);
    g.arcTo(x, y, x+w, y, r);
    g.closePath();
}

function drawBoard(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(let y=0;y<BOARD_SIZE;y++){
        for(let x=0;x<BOARD_SIZE;x++){
            const px = x*CELL_SIZE;
            const py = y*CELL_SIZE;

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
}

function updateScore(add){
    score += add;
    document.getElementById("score").textContent=score;

    if(score>best){
        best=score;
        localStorage.setItem("bestScore", best);
        document.getElementById("best").textContent=best;
    }
}

// 구 버전의 클릭 방식 대신 드래그 앤 드롭 전용 핸들러를 사용하므로 기존 c.onclick은 초기화합니다.
pieceCanvas.forEach((c, index)=>{
    c.draggable = false;
});

drawBoard();
// 초기화 시 비어 있는 트레이 채우기
tray = [];
refillTray();

function canPlace(piece, gx, gy){
    if (!piece) return false;
    for(let y=0;y<piece.shape.length;y++){
        for(let x=0;x<piece.shape[y].length;x++){
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

function placePiece(piece,gx,gy){
    if(!canPlace(piece,gx,gy)) return false;

    for(let y=0;y<piece.shape.length;y++){
        for(let x=0;x<piece.shape[y].length;x++){
            if(!piece.shape[y][x]) continue;
            board[gy+y][gx+x] = piece.color;
        }
    }

    updateScore(5);
    clearLines();
    return true;
}

function clearLines(){
    let rows=[];
    let cols=[];

    for(let y=0;y<BOARD_SIZE;y++){
        let ok=true;
        for(let x=0;x<BOARD_SIZE;x++){
            if(!board[y][x]){ ok=false; break; }
        }
        if(ok) rows.push(y);
    }

    for(let x=0;x<BOARD_SIZE;x++){
        let ok=true;
        for(let y=0;y<BOARD_SIZE;y++){
            if(!board[y][x]){ ok=false; break; }
        }
        if(ok) cols.push(x);
    }

    if(rows.length===0 && cols.length===0){
        return;
    }

    rows.forEach(y=>{
        for(let x=0;x<BOARD_SIZE;x++){ board[y][x]=null; }
    });

    cols.forEach(x=>{
        for(let y=0;y<BOARD_SIZE;y++){ board[y][x]=null; }
    });

    updateScore((rows.length+cols.length)*80);
}

// [버그 2 해결] 트레이에 빈 공간(null)이 있을 수 있으므로 예외 처리 추가
function existsPossibleMove(){
    for(const piece of tray){
        if (!piece) continue; // 이미 사용한 슬롯은 건너뜀
        for(let y=0;y<BOARD_SIZE;y++){
            for(let x=0;x<BOARD_SIZE;x++){
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
    panel.style.opacity=0;
    panel.style.transition="opacity .25s";
    requestAnimationFrame(()=>{
        panel.style.opacity=1;
    });
}

// --- 드래그 조작 제어부 최적화 (버그 1, 3, 4 완벽 해결) ---

let dragging = false;
let hoverX = -1;
let hoverY = -1;
let dragX = 0; // 드래그 중인 피스가 그려질 메인 보드 상의 X 좌표
let dragY = 0; // 드래그 중인 피스가 그려질 메인 보드 상의 Y 좌표

// 손가락 터치(또는 마우스) 위치 정보를 받아 가로축 중앙 및 세로 오프셋을 정교하게 계산합니다.
function updateDragCoordinates(clientX, clientY) {
    if (selectedPiece === -1) return;
    const piece = tray[selectedPiece];
    if (!piece) return;

    const rect = canvas.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;

    const cols = piece.shape[0].length;
    const rows = piece.shape.length;

    // [버그 3 해결] 1x1, 1x3 등 블록 모양에 상관없이 가로 중앙에 손가락이 정확히 위치
    dragX = touchX - (cols * CELL_SIZE) / 2;

    // [버그 4 해결] 손가락이 블록을 가리지 않도록, 블록 세로 하단부에서 약 45px 아래에 손가락을 배치
    dragY = touchY - (rows * CELL_SIZE) - 45;

    // 계산된 블록의 좌상단 시작점을 기준으로 그리드 인덱스 계산
    hoverX = Math.round(dragX / CELL_SIZE);
    hoverY = Math.round(dragY / CELL_SIZE);
}

function handleDragStart(index, clientX, clientY) {
    if (!tray[index] || dragging) return;
    selectedPiece = index;
    dragging = true;

    updateDragCoordinates(clientX, clientY);
    drawTray(); // 선택된 트레이 블록 숨김 효과 적용을 위해 리드로우
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
            // [버그 2 해결] 사용된 블록을 삭제하지 않고 빈 칸(null) 처리
            tray[selectedPiece] = null;
            placed = true;

            // 모든 슬롯을 사용했는지 확인 후 리필 처리
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

    // 만약 안 맞는 공간이어서 원래 자리에 복귀하는 경우 복원 렌더링
    if (!placed) {
        drawTray();
    }

    dragging = false;
    selectedPiece = -1;
    hoverX = -1;
    hoverY = -1;
    drawBoard();
}

// [버그 1 해결] 하단 블록에 손가락을 대거나 마우스를 누르는 순간 즉시 드래그 상태로 변환
pieceCanvas.forEach((c, index) => {
    // 터치 디바이스 전용
    c.addEventListener("touchstart", (e) => {
        if (e.touches.length > 0) {
            const t = e.touches[0];
            handleDragStart(index, t.clientX, t.clientY);
        }
        e.preventDefault();
    }, { passive: false });

    // PC/마우스 환경용 지원
    c.addEventListener("mousedown", (e) => {
        handleDragStart(index, e.clientX, e.clientY);
        e.preventDefault();
    });
});

// 전역 윈도우 스케일에서의 연속 트래킹을 통한 매끄러운 경험 제공
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

// 캔버스의 구 버전 마우스/터치 리스너들로 인한 더블 배치 충돌 방지를 위해 기존 이벤트 흐름 제어 제거
// (대신 위 윈도우 기반 드래그 시스템에서 완벽하게 처리)

function drawGhost(){
    if(selectedPiece===-1 || hoverX<0 || hoverY<0) return;

    const piece = tray[selectedPiece];
    if(!piece) return;

    const ok = canPlace(piece, hoverX, hoverY);

    ctx.save();
    ctx.globalAlpha = ok ? .35 : .18;
    ctx.fillStyle = ok ? piece.color : "#ff4444";

    for(let y=0;y<piece.shape.length;y++){
        for(let x=0;x<piece.shape[y].length;x++){
            if(!piece.shape[y][x]) continue;

            roundRectCanvas(
                ctx,
                (hoverX+x)*CELL_SIZE+2,
                (hoverY+y)*CELL_SIZE+2,
                CELL_SIZE-GAP,
                CELL_SIZE-GAP,
                10
            );
            ctx.fill();
        }
    }
    ctx.restore();
}

// 드래그 중인 블록을 손가락/마우스 위치에 선명하게 그려주는 렌더러 함수
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

const oldDrawBoard = drawBoard;
drawBoard = function(){
    oldDrawBoard();
    drawGhost();         // 고스트 프리뷰 타일
    drawDraggingPiece(); // 손가락 밑에 직접 따라오는 실체 블록
};

let combo = 0;
let effects = [];

function Effect(x,y,color){
    this.x=x;
    this.y=y;
    this.color=color;
    this.life=1;
}

function addEffect(x,y,color){
    effects.push(new Effect(x,y,color));
}

const oldClearLines = clearLines;
clearLines = function(){
    let rows=[];
    let cols=[];

    for(let y=0;y<BOARD_SIZE;y++){
        let ok=true;
        for(let x=0;x<BOARD_SIZE;x++){
            if(!board[y][x]){ ok=false; break; }
        }
        if(ok) rows.push(y);
    }

    for(let x=0;x<BOARD_SIZE;x++){
        let ok=true;
        for(let y=0;y<BOARD_SIZE;y++){
            if(!board[y][x]){ ok=false; break; }
        }
        if(ok) cols.push(x);
    }

    if(rows.length===0 && cols.length===0){
        combo=0;
        return;
    }

    combo++;

    rows.forEach(y=>{
        for(let x=0;x<BOARD_SIZE;x++){
            addEffect(x, y, board[y][x]);
            board[y][x]=null;
        }
    });

    cols.forEach(x=>{
        for(let y=0;y<BOARD_SIZE;y++){
            addEffect(x, y, board[y][x]);
            board[y][x]=null;
        }
    });

    updateScore((rows.length+cols.length)*100*combo);
}

function drawEffects(){
    for(let i=effects.length-1;i>=0;i--){
        const e=effects[i];
        e.life-=0.04;
        if(e.life<=0){
            effects.splice(i,1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha=e.life;
        ctx.fillStyle=e.color;
        roundRectCanvas(
            ctx,
            e.x*CELL_SIZE+8-(1-e.life)*10,
            e.y*CELL_SIZE+8-(1-e.life)*10,
            CELL_SIZE-16+(1-e.life)*20,
            CELL_SIZE-16+(1-e.life)*20,
            12
        );
        ctx.fill();
        ctx.restore();
    }
}

let popups=[];
function addPopup(text){
    popups.push({
        text,
        y:40,
        alpha:1
    });
}

const oldUpdateScore=updateScore;
updateScore=function(add){
    oldUpdateScore(add);
    if(combo>1){
        addPopup(combo+" COMBO!");
    }
};

function drawPopup(){
    ctx.save();
    ctx.textAlign="center";
    ctx.font="bold 34px Arial";
    for(let i=popups.length-1;i>=0;i--){
        const p=popups[i];
        p.y-=0.5;
        p.alpha-=0.01;
        if(p.alpha<=0){
            popups.splice(i,1);
            continue;
        }
        ctx.globalAlpha=p.alpha;
        ctx.fillStyle="#ffffff";
        ctx.fillText(p.text, canvas.width/2, p.y);
    }
    ctx.restore();
}

function loop(){
    drawBoard();
    drawEffects();
    drawPopup();
    requestAnimationFrame(loop);
}
loop();

let spawnAnimation = 1;
function animateTray(){
    spawnAnimation += 0.08;
    if(spawnAnimation>1) spawnAnimation=1;

    pieceCanvas.forEach(c=>{
        c.style.transform = "scale("+spawnAnimation+")";
        c.style.opacity = spawnAnimation;
    });
}

const oldRefillTray = refillTray;
refillTray = function(){
    const isAllEmpty = tray.length === 0 || tray.every(p => p === null);
    if (isAllEmpty) {
        tray = [];
        while(tray.length<3){
            tray.push(new Piece(balancedShape()));
        }
        spawnAnimation = 0;
    }
    drawTray();
}

function balancedShape(){
    const pool=[];
    SHAPES.forEach(shape=>{
        let count=0;
        for(const r of shape)
            for(const c of r)
                if(c) count++;

        let weight=6-count;
        if(weight<1) weight=1;
        for(let i=0;i<weight;i++)
            pool.push(shape);
    });
    return JSON.parse(
        JSON.stringify(
            pool[Math.floor(Math.random()*pool.length)]
        )
    );
}

const oldGameOver = gameOver;
gameOver=function(){
    const panel=document.getElementById("gameOver");
    panel.classList.remove("hidden");
    panel.style.opacity=0;
    panel.style.transition="opacity .25s";
    requestAnimationFrame(()=>{
        panel.style.opacity=1;
    });
}

document.getElementById("restart").onclick=()=>{
    score=0;
    document.getElementById("score").textContent=0;
    combo=0;
    effects.length=0;
    popups.length=0;
    tray = [null, null, null];
    selectedPiece=-1;
    hoverX=-1;
    hoverY=-1;

    for(let y=0;y<BOARD_SIZE;y++){
        for(let x=0;x<BOARD_SIZE;x++){
            board[y][x]=null;
        }
    }

    document.getElementById("gameOver").classList.add("hidden");
    refillTray();
    drawBoard();
};

setInterval(animateTray, 16);

// 게임 최초 기동
tray = [];
refillTray();
drawBoard();

```
