const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 화면 크기에 맞게 캔버스 해상도 동적 조절
function resizeCanvas() {
    const size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.55);
    canvas.width = size;
    canvas.height = size + 160; // 게임판(정사각형) + 하단 블록 영역(160px)
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 게임 설정
const GRID_SIZE = 8; 
const CELL_SIZE = canvas.width / GRID_SIZE;
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
let score = 0;

// 블록 모양 후보들 (Block Blast 스타일)
const BLOCK_TEMPLATES = [
    [[1]], // 1x1
    [[1, 1, 1]], // 1x3 가로
    [[1], [1], [1]], // 3x1 세로
    [[1, 1], [1, 1]], // 2x2 네모
    [[1, 1, 1], [0, 1, 0]], // T자
    [[1, 0], [1, 0], [1, 1]], // L자
    [[1, 1], [0, 1], [0, 1]]
];

// 색상 테이블
const COLORS = {
    gridBg: '#1e2530',
    gridLine: '#2a3444',
    block: '#ff9f43',
    placed: '#48dbfb'
};

// 하단 선택용 블록 3개 저장소
let bottomBlocks = [null, null, null];

// 드래그 상태 관리 변수
let isDragging = false;
let draggedIndex = null;
let dragX = 0; // 현재 블록이 그려질 X 위치
let dragY = 0; // 현재 블록이 그려질 Y 위치

// 랜덤 블록 생성기
function getRandomBlock() {
    const template = BLOCK_TEMPLATES[Math.floor(Math.random() * BLOCK_TEMPLATES.length)];
    return {
        shape: template,
        color: COLORS.block,
        width: template[0].length * (CELL_SIZE * 0.6), // 하단 표시용 축소 크기
        height: template.length * (CELL_SIZE * 0.6)
    };
}

// [2번 해결] 하단 블록 3개를 새로 채우는 함수
function generateThreeBlocks() {
    for (let i = 0; i < 3; i++) {
        bottomBlocks[i] = getRandomBlock();
    }
}

// 초기 블록 생성
generateThreeBlocks();

// 하단 블록들의 화면상 렌더링 위치(히트박스) 계산 함수
function getBottomBlockRect(index) {
    const slotWidth = canvas.width / 3;
    const block = bottomBlocks[index];
    if (!block) return null;

    // 하단 영역 중앙에 배치되도록 정렬 계산
    const x = slotWidth * index + (slotWidth - block.width) / 2;
    const y = canvas.width + (160 - block.height) / 2;
    return { x, y, width: block.width, height: block.height };
}

// --- 터치 이벤트 핸들러 (모바일 제어 핵심) ---

// [1번 해결] 터치하자마자 노란 테두리 단계 없이 즉시 드래그 시작
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    for (let i = 0; i < 3; i++) {
        const blockRect = getBottomBlockRect(i);
        if (!blockRect) continue;

        // 손가락이 하단 블록 범위 안으로 들어왔는지 체크
        if (touchX >= blockRect.x && touchX <= blockRect.x + blockRect.width &&
            touchY >= blockRect.y && touchY <= blockRect.y + blockRect.height) {
            
            isDragging = true;
            draggedIndex = i;
            
            // 즉시 드래그 좌표 업데이트 작동
            updateDragPosition(touchX, touchY);
            break;
        }
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (!isDragging || draggedIndex === null) return;
    e.preventDefault(); // 모바일 브라우저 스크롤 방지

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    updateDragPosition(touchX, touchY);
});

// [3, 4번 해결] 손가락 위치에 맞춰 블록 오프셋 정밀 조정 함수
function updateDragPosition(touchX, touchY) {
    const block = bottomBlocks[draggedIndex];
    if (!block) return;

    // 원래 게임판 크기(CELL_SIZE) 기준으로 실제 드래그할 블록 크기 계산
    const realW = block.shape[0].length * CELL_SIZE;
    const realH = block.shape.length * CELL_SIZE;

    // [3번 고정] 손가락이 무조건 블록의 가로 정중앙에 위치하도록 설정
    dragX = touchX - (realW / 2);

    // [4번 고정] 손가락이 블록을 가리지 않게 블록 하단보다 45px 아래에 손가락이 오도록 띄움
    dragY = touchY - realH - 45;
}

canvas.addEventListener('touchend', (e) => {
    if (!isDragging || draggedIndex === null) return;

    const block = bottomBlocks[draggedIndex];
    
    // 현재 드래그 위치를 기반으로 게임판(Grid)의 몇 번째 칸에 매칭되는지 계산
    const targetX = Math.round(dragX / CELL_SIZE);
    const targetY = Math.round(dragY / CELL_SIZE);

    // 블록 배치 가능 여부 검사
    if (canPlaceBlock(block.shape, targetX, targetY)) {
        placeBlock(block.shape, targetX, targetY);
        
        // [2번 해결] 쓴 블록 하나만 비우기(null)
        bottomBlocks[draggedIndex] = null;
        
        // 줄이 꽉 찼으면 지우기
        checkLines();

        // [2번 해결] 3개 슬롯이 전부 다 비었을 때만 새 블록 3개 리프레시
        if (bottomBlocks.every(b => b === null)) {
            generateThreeBlocks();
        }
    }

    // 드래그 리셋
    isDragging = false;
    draggedIndex = null;
});

// --- 게임 규칙 및 검사 로직 ---

function canPlaceBlock(shape, startX, startY) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 1) {
                const gridX = startX + c;
                const gridY = startY + r;
                
                // 보드판 범위를 벗어나거나 이미 블록이 차 있으면 안 됨
                if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return false;
                if (grid[gridY][gridX] !== 0) return false;
            }
        }
    }
    return true;
}

function placeBlock(shape, startX, startY) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 1) {
                grid[startY + r][startX + c] = 1;
                score += 10;
            }
        }
    }
}

function checkLines() {
    let rowsToRemove = [];
    let colsToRemove = [];

    // 가로줄 검사
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell === 1)) rowsToRemove.push(r);
    }

    // 세로줄 검사
    for (let c = 0; c < GRID_SIZE; c++) {
        let isColFull = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === 0) {
                isColFull = false;
                break;
            }
        }
        if (isColFull) colsToRemove.push(c);
    }

    // 블록 지우기 및 점수 가산
    rowsToRemove.forEach(r => grid[r].fill(0));
    colsToRemove.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) grid[r][c] = 0;
    });

    if (rowsToRemove.length > 0 || colsToRemove.length > 0) {
        score += (rowsToRemove.length + colsToRemove.length) * 100;
    }
}

// --- 화면 그리기 (Render) ---

function draw() {
    // 배경 클리어
    ctx.fillStyle = '#0f1319';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. 게임판 타일 격자 그리기
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            ctx.fillStyle = grid[r][c] === 1 ? COLORS.placed : COLORS.gridBg;
            ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }

    // 2. 하단 대기 블록 3개 그리기
    for (let i = 0; i < 3; i++) {
        const block = bottomBlocks[i];
        const rect = getBottomBlockRect(i);
        if (!block || !rect) continue;

        // 드래그 중인 블록은 이 위치에 그리 않고 스킵
        if (isDragging && draggedIndex === i) continue;

        const miniCell = (CELL_SIZE * 0.6);
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
                if (block.shape[r][c] === 1) {
                    ctx.fillStyle = block.color;
                    ctx.fillRect(rect.x + c * miniCell, rect.y + r * miniCell, miniCell - 1, miniCell - 1);
                }
            }
        }
    }

    // 3. 현재 손가락으로 드래그 중인 블록 그리기
    if (isDragging && draggedIndex !== null) {
        const block = bottomBlocks[draggedIndex];
        if (block) {
            for (let r = 0; r < block.shape.length; r++) {
                for (let c = 0; c < block.shape[r].length; c++) {
                    if (block.shape[r][c] === 1) {
                        ctx.fillStyle = block.color;
                        // 알파 효과를 주어 배치 포인트를 보기 쉽게 처리
                        ctx.globalAlpha = 0.8;
                        ctx.fillRect(dragX + c * CELL_SIZE, dragY + r * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
        }
    }

    // 점수 표시 영역
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`SCORE: ${score}`, 20, canvas.width + 30);

    requestAnimationFrame(draw);
}

// 게임 메인 루프 스타트
draw();
