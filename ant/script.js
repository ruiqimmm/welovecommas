let x = 500, y = 500;
let speed = 2;
let keys = {};

let bodyTime = 0;
let legTime = 0;
let facingLeft = false;

// 自动乱爬方向与速度
let autoAngle = Math.random() * Math.PI * 2;
let autoSpeed = 1.2;
let autoChangeCounter = 0;
let isLeftStep = true;

const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 1000;
const ANT_SIZE = 60;

const ant = document.getElementById("ant");
const world = document.getElementById("world");
const canvas = document.getElementById("trailCanvas");
const ctx = canvas.getContext("2d");

canvas.width = WORLD_WIDTH;
canvas.height = WORLD_HEIGHT;

let trail = [];
let lastTrailX = x + ANT_SIZE / 2;
let lastTrailY = y + 40;

// 建议 CSS 里加：#ant, #ant * { pointer-events:none; }

document.addEventListener("keydown", e => {
    keys[e.key] = true;
});
document.addEventListener("keyup", e => {
    keys[e.key] = false;
});

// 蚂蚁和 form 的矩形碰撞
function antIntersectsForm(formElement) {
    const rect = formElement.getBoundingClientRect();
    const antRect = ant.getBoundingClientRect();

    return !(
        antRect.right < rect.left ||
        antRect.left > rect.right ||
        antRect.bottom < rect.top ||
        antRect.top > rect.bottom
    );
}

function loop() {
    // --- 移动蚂蚁 ---
    let isMoving = false;
    let hasKeyInput = false;

    // 手动控制
    if (keys["ArrowUp"]) {
        y -= speed;
        hasKeyInput = true;
    }
    if (keys["ArrowDown"]) {
        y += speed;
        hasKeyInput = true;
    }
    if (keys["ArrowLeft"]) {
        x -= speed;
        facingLeft = true;
        hasKeyInput = true;
    }
    if (keys["ArrowRight"]) {
        x += speed;
        facingLeft = false;
        hasKeyInput = true;
    }

    // 没有按键 → 自动乱爬
    if (!hasKeyInput) {
        autoChangeCounter++;
        if (autoChangeCounter > 120) {
            autoChangeCounter = 0;
            autoAngle += (Math.random() - 0.5) * 0.8;
        }

        x += Math.cos(autoAngle) * autoSpeed;
        y += Math.sin(autoAngle) * autoSpeed;

        facingLeft = Math.cos(autoAngle) < 0;
        isMoving = true;
    } else {
        isMoving = true;
    }

    // 保持在 world 里
    x = Math.max(0, Math.min(WORLD_WIDTH - ANT_SIZE, x));
    y = Math.max(0, Math.min(WORLD_HEIGHT - ANT_SIZE, y));

    // 碰到边界就反弹自动方向
    if (x <= 0 || x >= WORLD_WIDTH - ANT_SIZE) {
        autoAngle = Math.PI - autoAngle;
    }
    if (y <= 0 || y >= WORLD_HEIGHT - ANT_SIZE) {
        autoAngle = -autoAngle;
    }

    // 更新蚂蚁位置
    ant.style.left = x + "px";
    ant.style.top = y + "px";

    // --- world & 身体轻微晃动 ---
    bodyTime += 0.05;

    const worldShake = Math.sin(bodyTime * 0.3) * 1;
    world.style.transform = `translate(${worldShake}px, 0px)`;

    const wobble = Math.sin(bodyTime * 0.5) * 3;
    const bob = Math.sin(bodyTime * 1.2) * 2;
    const flip = facingLeft ? 1 : -1;

    ant.style.transform =
        `scaleX(${flip}) translateY(${bob}px) rotate(${wobble}deg)`;

    // --- 腿动画（只在移动时） ---
    const rotateLeg = (groupId, angle) => {
        const leg = document.getElementById(groupId);
        if (!leg) return;
        leg.setAttribute("transform", `rotate(${angle} 150 75)`);
    };

    if (isMoving) {
        legTime += 0.3;

        const angle1 = Math.sin(legTime + 0) * 18;
        const angle2 = Math.sin(legTime + Math.PI / 2) * 15;
        const angle3 = Math.sin(legTime + Math.PI) * 18;

        rotateLeg("legGroup1", angle1);
        rotateLeg("legGroup2", angle2);
        rotateLeg("legGroup3", angle3);
    } else {
        rotateLeg("legGroup1", 0);
        rotateLeg("legGroup2", 0);
        rotateLeg("legGroup3", 0);
    }

    // --- 左右脚交替脚印 ---
    const baseX = x + ANT_SIZE / 2;
    const baseY = y + 40;

    const dxTrail = baseX - lastTrailX;
    const dyTrail = baseY - lastTrailY;
    const dist = Math.sqrt(dxTrail * dxTrail + dyTrail * dyTrail);

    if (dist >= 8 && isMoving) {
        const sideOffset = 6;
        const stepX = isLeftStep ? baseX - sideOffset : baseX + sideOffset;
        const stepY = baseY;

        trail.push({ x: stepX, y: stepY, alpha: 1 });

        lastTrailX = baseX;
        lastTrailY = baseY;
        isLeftStep = !isLeftStep;
    }

    // 画脚印
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    trail.forEach(p => {
        p.alpha -= 0.01;
        if (p.alpha > 0) {
            ctx.fillStyle = `rgba(0,0,0,${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    trail = trail.filter(p => p.alpha > 0);

    // --- 蚂蚁踩到 form → 触发表单 ---
    document.querySelectorAll(".map-form").forEach(form => {
        const inputs = form.querySelectorAll("input");
        if (inputs.length === 0) return;

        if (antIntersectsForm(form)) {
            if (!form._triggeredByAnt) {
                inputs.forEach(input => {
                    if (input.type === "checkbox") {
                        input.checked = !input.checked;
                    }
                    if (input.type === "radio") {
                        const radios = Array.from(inputs).filter(i => i.type === "radio");

                        if (radios.length > 0) {
                            // 取得目前选中的（避免连踩同一个）
                            const current = radios.find(r => r.checked);

                            // 从所有选项中随机选一个不是 current 的
                            let choices = radios.filter(r => r !== current);

                            // 如果都相同（或第一次），直接用全部选项
                            if (choices.length === 0) choices = radios;

                            // 随机挑一个
                            const pick = choices[Math.floor(Math.random() * choices.length)];

                            pick.checked = true;
                        }
                    }

                    if (input.type === "text") {
                        input.focus();
                    }
                });
                form._triggeredByAnt = true;
            }
        } else {
            form._triggeredByAnt = false;
        }
    });

    requestAnimationFrame(loop);
}

loop();
