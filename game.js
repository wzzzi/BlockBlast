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

[[1,0,0],
 [1,1,1]],

[[0,0,1],
 [1,1,1]],

[[1,1,1],
 [1,0,0]],

[[1,1,1],
 [0,0,1]],

[[1,1,0],
 [0,1,1]],

[[0,1,1],
 [1,1,0]]

];

class Piece{

    constructor(shape){

        this.shape = JSON.parse(JSON.stringify(shape));

        this.color =
            COLORS[
                Math.floor(
                    Math.random()*COLORS.length
                )
            ];

    }

}

const board = [];

for(let y=0;y<BOARD_SIZE;y++){

    board[y]=[];

    for(let x=0;x<BOARD_SIZE;x++){

        board[y][x]=null;

    }

}

let tray=[];

let selectedPiece = -1;

function randomShape(){

    return SHAPES[
        Math.floor(
            Math.random()*SHAPES.length
        )
    ];

}

function refillTray(){

    while(tray.length<3){

        tray.push(
            new Piece(
                randomShape()
            )
        );

    }

    drawTray();

}

function drawTray(){

    for(let i=0;i<3;i++){

        const c = pieceCanvas[i];
        const g = pieceCtx[i];

        g.clearRect(
            0,
            0,
            c.width,
            c.height
        );

        if(!tray[i]) continue;

        const p = tray[i];

        const cell = 24;

        const rows = p.shape.length;
        const cols = p.shape[0].length;

        const ox =
            (c.width-cols*cell)/2;

        const oy =
            (c.height-rows*cell)/2;

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

function roundRectCanvas(
    g,
    x,
    y,
    w,
    h,
    r
){

    g.beginPath();

    g.moveTo(x+r,y);

    g.arcTo(
        x+w,
        y,
        x+w,
        y+h,
        r
    );

    g.arcTo(
        x+w,
        y+h,
        x,
        y+h,
        r
    );

    g.arcTo(
        x,
        y+h,
        x,
        y,
        r
    );

    g.arcTo(
        x,
        y,
        x+w,
        y,
        r
    );

    g.closePath();

}

function drawBoard(){

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    for(let y=0;y<BOARD_SIZE;y++){

        for(let x=0;x<BOARD_SIZE;x++){

            const px =
                x*CELL_SIZE;

            const py =
                y*CELL_SIZE;

            ctx.fillStyle =
                "#DFC092";

            if(board[y][x]){

                ctx.fillStyle =
                    board[y][x];

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

    document.getElementById(
        "score"
    ).textContent=score;

    if(score>best){

        best=score;

        localStorage.setItem(
            "bestScore",
            best
        );

        document.getElementById(
            "best"
        ).textContent=best;

    }

}

pieceCanvas.forEach((c,index)=>{

    c.onclick=()=>{

        selectedPiece=index;

        document
            .querySelectorAll(".piece")
            .forEach(e=>
                e.classList.remove(
                    "selected"
                )
            );

        c.classList.add(
            "selected"
        );

    };

});

drawBoard();
refillTray();

function canPlace(piece, gx, gy){

    for(let y=0;y<piece.shape.length;y++){

        for(let x=0;x<piece.shape[y].length;x++){

            if(!piece.shape[y][x]) continue;

            let bx = gx + x;
            let by = gy + y;

            if(
                bx < 0 ||
                by < 0 ||
                bx >= BOARD_SIZE ||
                by >= BOARD_SIZE
            ){
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

    if(!canPlace(piece,gx,gy))
        return false;

    for(let y=0;y<piece.shape.length;y++){

        for(let x=0;x<piece.shape[y].length;x++){

            if(!piece.shape[y][x])
                continue;

            board[
                gy+y
            ][
                gx+x
            ] = piece.color;

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

            if(!board[y][x]){

                ok=false;
                break;

            }

        }

        if(ok)
            rows.push(y);

    }

    for(let x=0;x<BOARD_SIZE;x++){

        let ok=true;

        for(let y=0;y<BOARD_SIZE;y++){

            if(!board[y][x]){

                ok=false;
                break;

            }

        }

        if(ok)
            cols.push(x);

    }

    if(
        rows.length===0 &&
        cols.length===0
    ){
        return;
    }

    rows.forEach(y=>{

        for(let x=0;x<BOARD_SIZE;x++){

            board[y][x]=null;

        }

    });

    cols.forEach(x=>{

        for(let y=0;y<BOARD_SIZE;y++){

            board[y][x]=null;

        }

    });

    updateScore(
        (rows.length+cols.length)*80
    );

}

canvas.addEventListener(
    "click",
    e=>{

        if(selectedPiece===-1)
            return;

        const rect=
            canvas.getBoundingClientRect();

        const gx=Math.floor(
            (e.clientX-rect.left)/
            CELL_SIZE
        );

        const gy=Math.floor(
            (e.clientY-rect.top)/
            CELL_SIZE
        );

        const piece=
            tray[selectedPiece];

        if(!piece)
            return;

        if(
            placePiece(
                piece,
                gx,
                gy
            )
        ){

            tray.splice(
                selectedPiece,
                1
            );

            selectedPiece=-1;

            document
                .querySelectorAll(".piece")
                .forEach(e=>
                    e.classList.remove(
                        "selected"
                    )
                );

            refillTray();

            drawBoard();

            drawTray();

            if(
                !existsPossibleMove()
            ){

                gameOver();

            }

        }

    }
);

function existsPossibleMove(){

    for(const piece of tray){

        for(let y=0;y<BOARD_SIZE;y++){

            for(let x=0;x<BOARD_SIZE;x++){

                if(
                    canPlace(
                        piece,
                        x,
                        y
                    )
                ){

                    return true;

                }

            }

        }

    }

    return false;

}

function gameOver(){

    document
        .getElementById(
            "gameOver"
        )
        .classList
        .remove("hidden");

}

document
.getElementById(
    "restart"
)
.onclick=()=>{

    location.reload();

};

let dragging = false;

let hoverX = -1;

let hoverY = -1;

function screenToGrid(clientX, clientY){

    const rect = canvas.getBoundingClientRect();

    return {

        x: Math.floor(

            (clientX - rect.left) / CELL_SIZE

        ),

        y: Math.floor(

            (clientY - rect.top) / CELL_SIZE

        )

    };

}

function drawGhost(){

    if(

        selectedPiece===-1 ||

        hoverX<0 ||

        hoverY<0

    ) return;

    const piece = tray[selectedPiece];

    if(!piece) return;

    const ok = canPlace(

        piece,

        hoverX,

        hoverY

    );

    ctx.save();

    ctx.globalAlpha = ok ? .35 : .18;

    ctx.fillStyle = ok

        ? piece.color

        : "#ff4444";

    for(let y=0;y<piece.shape.length;y++){

        for(let x=0;x<piece.shape[y].length;x++){

            if(!piece.shape[y][x])

                continue;

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

const oldDrawBoard = drawBoard;

drawBoard = function(){

    oldDrawBoard();

    drawGhost();

};

canvas.addEventListener(

    "mousemove",

    e=>{

        if(selectedPiece===-1)

            return;

        const g = screenToGrid(

            e.clientX,

            e.clientY

        );

        hoverX = g.x;

        hoverY = g.y;

        drawBoard();

    }

);

canvas.addEventListener(

    "mouseleave",

    ()=>{

        hoverX = -1;

        hoverY = -1;

        drawBoard();

    }

);

canvas.addEventListener(

    "touchstart",

    e=>{

        if(selectedPiece===-1)

            return;

        dragging = true;

        const t = e.touches[0];

        const g = screenToGrid(

            t.clientX,

            t.clientY

        );

        hoverX = g.x;

        hoverY = g.y;

        drawBoard();

        e.preventDefault();

    },

    {passive:false}

);

canvas.addEventListener(

    "touchmove",

    e=>{

        if(

            !dragging ||

            selectedPiece===-1

        ) return;

        const t = e.touches[0];

        const g = screenToGrid(

            t.clientX,

            t.clientY

        );

        hoverX = g.x;

        hoverY = g.y;

        drawBoard();

        e.preventDefault();

    },

    {passive:false}

);

canvas.addEventListener(

    "touchend",

    ()=>{

        dragging=false;

        if(selectedPiece===-1)

            return;

        const piece = tray[selectedPiece];

        if(

            hoverX>=0 &&

            hoverY>=0 &&

            placePiece(

                piece,

                hoverX,

                hoverY

            )

        ){

            tray.splice(

                selectedPiece,

                1

            );

            selectedPiece=-1;

            document

                .querySelectorAll(".piece")

                .forEach(e=>

                    e.classList.remove(

                        "selected"

                    )

                );

            refillTray();

            drawTray();

            if(

                !existsPossibleMove()

            ){

                gameOver();

            }

        }

        hoverX=-1;

        hoverY=-1;

        drawBoard();

    },

    {passive:false}

);

pieceCanvas.forEach((c,i)=>{

    c.draggable=false;

    c.addEventListener(

        "dblclick",

        ()=>{

            selectedPiece=i;

            document

                .querySelectorAll(".piece")

                .forEach(e=>

                    e.classList.remove(

                        "selected"

                    )

                );

            c.classList.add(

                "selected"

            );

        }

    );

});

let combo = 0;

let effects = [];

function Effect(x,y,color){

    this.x=x;

    this.y=y;

    this.color=color;

    this.life=1;

}

function addEffect(x,y,color){

    effects.push(

        new Effect(x,y,color)

    );

}

const oldClearLines = clearLines;

clearLines = function(){

    let rows=[];

    let cols=[];

    for(let y=0;y<BOARD_SIZE;y++){

        let ok=true;

        for(let x=0;x<BOARD_SIZE;x++){

            if(!board[y][x]){

                ok=false;

                break;

            }

        }

        if(ok) rows.push(y);

    }

    for(let x=0;x<BOARD_SIZE;x++){

        let ok=true;

        for(let y=0;y<BOARD_SIZE;y++){

            if(!board[y][x]){

                ok=false;

                break;

            }

        }

        if(ok) cols.push(x);

    }

    if(

        rows.length===0 &&

        cols.length===0

    ){

        combo=0;

        return;

    }

    combo++;

    rows.forEach(y=>{

        for(let x=0;x<BOARD_SIZE;x++){

            addEffect(

                x,

                y,

                board[y][x]

            );

            board[y][x]=null;

        }

    });

    cols.forEach(x=>{

        for(let y=0;y<BOARD_SIZE;y++){

            addEffect(

                x,

                y,

                board[y][x]

            );

            board[y][x]=null;

        }

    });

    updateScore(

        (rows.length+cols.length)

        *100

        *combo

    );

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

            e.x*CELL_SIZE

            +8

            -(1-e.life)*10,

            e.y*CELL_SIZE

            +8

            -(1-e.life)*10,

            CELL_SIZE-16

            +(1-e.life)*20,

            CELL_SIZE-16

            +(1-e.life)*20,

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

        addPopup(

            combo+" COMBO!"

        );

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

        ctx.fillText(

            p.text,

            canvas.width/2,

            p.y

        );

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

    if(spawnAnimation>1)

        spawnAnimation=1;

    pieceCanvas.forEach(c=>{

        c.style.transform =

            "scale("+spawnAnimation+")";

        c.style.opacity =

            spawnAnimation;

    });

}

const oldRefillTray = refillTray;

refillTray = function(){

    while(tray.length<3){

        tray.push(

            new Piece(

                balancedShape()

            )

        );

    }

    spawnAnimation = 0;

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

        if(weight<1)

            weight=1;

        for(let i=0;i<weight;i++)

            pool.push(shape);

    });

    return JSON.parse(

        JSON.stringify(

            pool[

                Math.floor(

                    Math.random()*pool.length

                )

            ]

        )

    );

}

const oldGameOver = gameOver;

gameOver=function(){

    const panel=

        document.getElementById(

            "gameOver"

        );

    panel.classList.remove(

        "hidden"

    );

    panel.style.opacity=0;

    panel.style.transition=

        "opacity .25s";

    requestAnimationFrame(()=>{

        panel.style.opacity=1;

    });

}

document

.getElementById(

    "restart"

)

.onclick=()=>{

    score=0;

    document.getElementById(

        "score"

    ).textContent=0;

    combo=0;

    effects.length=0;

    popups.length=0;

    tray.length=0;

    selectedPiece=-1;

    hoverX=-1;

    hoverY=-1;

    for(let y=0;y<BOARD_SIZE;y++){

        for(let x=0;x<BOARD_SIZE;x++){

            board[y][x]=null;

        }

    }

    document

    .getElementById(

        "gameOver"

    )

    .classList

    .add("hidden");

    refillTray();

    drawBoard();

};

setInterval(

    animateTray,

    16

);

// ---------------------

// 게임 시작

// ---------------------

refillTray();

drawBoard();

// ============================================================================

// END
