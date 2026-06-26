
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

// 상태 제어용 전역 변수들
let tray = [null, null, null];
let selectedPiece = -1;
let dragging = false;
let hoverX = -1;
let hoverY = -1;
let dragX = 0; 
let dragY = 0;
let spawnAnimation = 1;

// 밸런스형 블록 랜덤 생성 알고리즘
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

// 세 슬롯이 모두 비었을(null) 때만 일괄 리필
function refillTray(){
    const isAllEmpty = tray.every(p => p === null);
    if (isAllEmpty) {
        tray = [];
        while(tray.length < 3){
            tray.push(new Piece(balancedShape()));
        }
        spawnAnimation = 0; // 리필 시 애니메이션 연출 활성화
    }
    drawTray();
}

// 하단 블록 3개 영역 그리기
function drawTray(){
    for(let i=0;i<3;i++){
        const c = pieceCanvas[i];
        const g = pieceCtx[i];

        g.clearRect(0, 0, c.width, c.height);

        // 드래그 중인 블록은 이 자리에 그리지 않고 감춰서 자연스럽게 공중에 뜬 연출 구현
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

// 둥근 모서리 사각형 그리기 도구
function roundRectCanvas(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x+r,y);
    g.arcTo(x+w, y, x+w, y+h, r);
    g.arcTo(x+w, y+h, x, y+h, r);
    g.arcTo(x, y+h, x, y, r);
    g.arcTo(x, y, x+w, y, r);
    g.closePath();
}

// 메인 게임판 그리기 (고스트 가이드라인 및 드래그 중인 블록을 순서대로 병합 렌더링)
function drawBoard(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 기본 격자 및 이미 놓인 블록 그리기
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

    // 2. 고스트 프리뷰 표시
    drawGhost();

    // 3. 드래그 중인 블록 실체 표시
    drawDraggingPiece();
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

pieceCanvas.forEach((c)=>{
    c.draggable = false;
});

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

// 게임 오버 판단 시 빈 칸(null) 요소 무시하도록 수정
function existsPossibleMove(){
    for(const piece of tray){
        if (!piece) continue; 
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

// --- 드래그 조작 연산 오프셋 로직 (움직임 싱크 및 비율 보정 적용) ---

function updateDragCoordinates(clientX, clientY) {
    if (selectedPiece === -1) return;
    const piece = tray[selectedPiece];
    if (!piece) return;

    const rect = canvas.getBoundingClientRect();
    
    // [보정] 화면 크기와 캔버스 내부 해상도 간의 비율 계산 (스케일 인자)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 터치 입력 좌표를 캔버스 해상도에 일대일로 맵핑시킴 (움직임 불일치 및 가로축 틀어짐 원천 차단)
    const touchX = (clientX - rect.left) * scaleX;
    const touchY = (clientY - rect.top) * scaleY;

    const cols = piece.shape[0].length;
    const rows = piece.shape.length;

    // [가로 중앙 맞춤] 모든 형태의 블록이 손가락 수평 중앙에 완벽히 오도록 연산
    dragX = touchX - (cols * CELL_SIZE) / 2;

    // [세로 가림 방지] 블록 높이만큼 띄우고 추가 안전 오프셋(45px) 적용
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
            // 조각 사용 완료 시 완전히 없애는 게 아니라 빈 슬롯(null)으로 지정
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

    // [상태 리셋] 드래그가 취소되었거나 끝났음을 '그리기 전에' 먼저 명시적으로 선언합니다.
    dragging = false;
    selectedPiece = -1;
    hoverX = -1;
    hoverY = -1;

    // 상태 리셋이 완료된 뒤 트레이와 화면을 새로 그려야 취소된 블록이 원래 위치에 정상 복귀됩니다.
    drawTray();
    drawBoard();
}

// 블록 클릭/대기 모션 없이 터치 대자마자 즉시 드래그 발동
pieceCanvas.forEach((c, index) => {
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

// 고스트 가이드라인 그리기
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

// 드래그 중인 피스 그리기
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

// --- 이펙트 및 스코어 연출 로직 ---

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

const oldUpdateScore = updateScore;
updateScore = function(add){
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

// 60FPS 메인 루프 실행
function loop(){
    drawBoard();
    drawEffects();
    drawPopup();
    requestAnimationFrame(loop);
}
loop();

// 생성 연출 트레이 애니메이션
function animateTray(){
    spawnAnimation += 0.08;
    if(spawnAnimation>1) spawnAnimation=1;

    pieceCanvas.forEach(c=>{
        c.style.transform = "scale("+spawnAnimation+")";
        c.style.opacity = spawnAnimation;
    });
}
setInterval(animateTray, 16);

// 리스타트 핸들러
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

// ---------------------
// 게임 최초 구동 설정
// ---------------------
tray = [null, null, null];
refillTray();
drawBoard();