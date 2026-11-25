(() => {
  // DOM Elements
  const openingScene = document.getElementById("opening-scene");
  const askScene = document.getElementById("ask-scene");
  const yesScene = document.getElementById("yes-scene");

  const peepBoxWrapper = document.getElementById("peep-box-wrapper");
  const boxLid = document.getElementById("box-lid");
  const mascotSpeech = document.getElementById("mascot-speech");
  const boxLabel = document.getElementById("box-label");
  const liftHint = document.getElementById("lift-hint");
  const motionBtn = document.getElementById("motion-btn");
  const enterBtn = document.getElementById("enter-btn");
  const mainCharacter = document.getElementById("main-character");

  const headBase = document.getElementById("head-base");
  const leftEyeTrack = document.getElementById("left-eye-track");
  const rightEyeTrack = document.getElementById("right-eye-track");
  const leftBrow = document.getElementById("left-brow");
  const rightBrow = document.getElementById("right-brow");
  const nose = document.getElementById("nose");
  const mouth = document.getElementById("mouth");
  const auroraOuter = document.getElementById("aurora-outer");
  const auroraInner = document.getElementById("aurora-inner");

  const yesBtn = document.getElementById("yes-btn");
  const noBtn = document.getElementById("no-btn");
  const noReaction = document.getElementById("no-reaction");
  const noCaption = document.getElementById("no-caption");
  const askSubheading = document.getElementById("ask-subheading");

  const goldenPass = document.getElementById("golden-pass");
  const downloadPassBtn = document.getElementById("download-pass-btn");
  const moreConfettiBtn = document.getElementById("more-confetti-btn");
  const replayBtn = document.getElementById("replay-btn");

  const emojiLayer = document.getElementById("emoji-particles");
  const canvas = document.getElementById("fx-canvas");
  const ctx = canvas.getContext("2d");

  let peekInterval = null;
  let peekCloseTimer = null;
  let isDraggingLid = false;
  let dragStartY = 0;
  let dragDeltaY = 0;
  let boxOpened = false;
  let hasEnteredAsk = false;
  let motionActive = false;
  let lastShakeTime = 0;
  let noCount = 0;
  let confettiPieces = [];
  let confettiAnimId = null;

  const isTouchDevice =
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  // =========================================================================
  // CANVAS RESIZE (Retina DPR-aware for crisp confetti on iPhone 17)
  // =========================================================================
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // =========================================================================
  // PIXEL BUILDER 6-AXIS CURSOR & PHONE TILT TRACKING
  // =========================================================================
  let trackingRaf = null;
  function applyCharacterPose(rawX, rawY) {
    const moveX = Math.max(-1.5, Math.min(1.5, rawX));
    const moveY = Math.max(-1.5, Math.min(1.5, rawY));

    if (trackingRaf) cancelAnimationFrame(trackingRaf);
    trackingRaf = requestAnimationFrame(() => {
      if (headBase) {
        headBase.style.transform = `translate(${moveX * 26}px, ${moveY * 22}px) rotate(${moveX * 8}deg)`;
      }
      if (leftEyeTrack) {
        leftEyeTrack.style.transform = `translate(${moveX * 24}px, ${moveY * 24}px)`;
      }
      if (rightEyeTrack) {
        rightEyeTrack.style.transform = `translate(${moveX * 24}px, ${moveY * 24}px)`;
      }
      if (leftBrow) {
        leftBrow.style.transform = `rotate(${-12 + moveX * 20}deg)`;
      }
      if (rightBrow) {
        rightBrow.style.transform = `rotate(${12 + moveX * 20}deg)`;
      }
      if (nose) {
        nose.style.transform = `rotate(${moveX * 12}deg) translateY(${moveY * 6}px)`;
      }
      if (mouth) {
        mouth.style.transform = `translateX(${moveX * 8}px) translateY(${moveY * 4}px)`;
      }
      if (auroraOuter) {
        auroraOuter.style.transform = `translate(${moveX * -20}px, ${moveY * -20}px)`;
      }
      if (auroraInner) {
        auroraInner.style.transform = `translate(${moveX * 20}px, ${moveY * 20}px)`;
      }
    });
  }

  function updateCharacterTracking(clientX, clientY) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    applyCharacterPose((clientX - centerX) / centerX, (clientY - centerY) / centerY);
  }

  window.addEventListener("mousemove", (e) => {
    updateCharacterTracking(e.clientX, e.clientY);
  });

  window.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches && e.touches[0]) {
        updateCharacterTracking(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches && e.touches[0]) {
        updateCharacterTracking(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: true }
  );

  document.addEventListener("mouseleave", () => {
    if (headBase) headBase.style.transform = "translate(0, 0) rotate(0deg)";
    if (leftEyeTrack) leftEyeTrack.style.transform = "translate(0, 0)";
    if (rightEyeTrack) rightEyeTrack.style.transform = "translate(0, 0)";
    if (leftBrow) leftBrow.style.transform = "rotate(-12deg)";
    if (rightBrow) rightBrow.style.transform = "rotate(12deg)";
    if (nose) nose.style.transform = "rotate(0deg) translateY(0)";
    if (mouth) mouth.style.transform = "translate(0, 0)";
  });

  // =========================================================================
  // FLYING EMOJI PARTICLES (HEARTS / BROKEN HEARTS / CELEBRATION)
  // =========================================================================
  function spawnEmojiBurst(emojis, count = 28) {
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.className = "floating-emoji";
      span.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const startX = Math.random() * window.innerWidth;
      const startY = window.innerHeight * (0.3 + Math.random() * 0.6);
      const dx = (Math.random() - 0.5) * 420;
      const dy = -(140 + Math.random() * 420);
      const rot = (Math.random() - 0.5) * 70;
      const dur = 1.9 + Math.random() * 1.5;
      const size = 1.35 + Math.random() * 1.55;

      span.style.left = `${startX}px`;
      span.style.top = `${startY}px`;
      span.style.fontSize = `${size}rem`;
      span.style.setProperty("--dx", `${dx}px`);
      span.style.setProperty("--dy", `${dy}px`);
      span.style.setProperty("--rot", `${rot}deg`);
      span.style.setProperty("--dur", `${dur}s`);
      span.style.animationDelay = `${Math.random() * 0.35}s`;

      emojiLayer.appendChild(span);
      setTimeout(() => span.remove(), (dur + 0.5) * 1000);
    }
  }

  // =========================================================================
  // CONFETTI CANNON ENGINE
  // =========================================================================
  const CONFETTI_COLORS = [
    "#ff1e7a",
    "#ff66a3",
    "#ffb3d1",
    "#ffffff",
    "#ffd700",
    "#ffe875",
    "#d81b60",
    "#ff85c0",
  ];

  function launchConfetti(burstCount = 180) {
    for (let i = 0; i < burstCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      const speed = 6 + Math.random() * 13;
      const fromSide = i % 3 === 0 ? 0.15 : i % 3 === 1 ? 0.85 : 0.5;
      confettiPieces.push({
        x: window.innerWidth * fromSide + (Math.random() - 0.5) * 120,
        y: window.innerHeight * 0.72 + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
        vy: Math.sin(angle) * speed - Math.random() * 5,
        w: 7 + Math.random() * 8,
        h: 5 + Math.random() * 7,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        gravity: 0.22 + Math.random() * 0.1,
        drag: 0.985,
        shape: Math.random() > 0.75 ? "circle" : "rect",
        alpha: 1,
      });
    }

    if (!confettiAnimId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    ctx.clearRect(0, 0, viewW, viewH);

    for (let i = confettiPieces.length - 1; i >= 0; i--) {
      const p = confettiPieces[i];
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;

      if (p.y > viewH + 40) {
        confettiPieces.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    if (confettiPieces.length > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimId = null;
      ctx.clearRect(0, 0, viewW, viewH);
    }
  }

  // =========================================================================
  // STAGE TRANSITIONS & 2-SECOND PEEK-A-BOO + LIFT / SHAKE TO OPEN
  // =========================================================================
  function triggerMascotJiggle() {
    if (!mainCharacter) return;
    mainCharacter.classList.remove("mascot-jiggle");
    void mainCharacter.offsetWidth;
    mainCharacter.classList.add("mascot-jiggle");
    spawnEmojiBurst(["💖", "✨", "🌸"], 10);
  }

  function stopPeekLoop() {
    clearInterval(peekInterval);
    clearTimeout(peekCloseTimer);
    peekInterval = null;
    peekCloseTimer = null;
  }

  function runPeekPulse() {
    if (boxOpened || isDraggingLid) return;
    peepBoxWrapper.classList.remove("state-closed");
    peepBoxWrapper.classList.add("state-peeping");
    boxLabel.innerHTML = `<span class="pulse-dot"></span><span>BABAI'S MASCOT IS PEEPING 👀</span>`;

    clearTimeout(peekCloseTimer);
    peekCloseTimer = setTimeout(() => {
      if (boxOpened || isDraggingLid) return;
      peepBoxWrapper.classList.remove("state-peeping");
      peepBoxWrapper.classList.add("state-closed");
      boxLabel.innerHTML = `<span class="pulse-dot"></span><span>SOMEONE IS INSIDE...</span>`;
    }, 1250);
  }

  function startPeekLoop() {
    stopPeekLoop();
    setTimeout(() => {
      if (!boxOpened) runPeekPulse();
    }, 550);
    peekInterval = setInterval(runPeekPulse, 2000);
  }

  function openBox() {
    if (boxOpened) return;
    boxOpened = true;
    stopPeekLoop();

    if (boxLid) {
      boxLid.classList.remove("dragging");
      boxLid.style.transform = "";
    }
    mainCharacter.style.transform = "";

    peepBoxWrapper.classList.remove("state-closed", "state-peeping");
    peepBoxWrapper.classList.add("state-welcome");
    mascotSpeech.classList.remove("hidden");
    boxLabel.innerHTML = `<span class="pulse-dot"></span><span>PINK PROTOCOL READY 💖</span>`;
    liftHint.textContent = isTouchDevice
      ? "📱 SHAKE OR TILT PHONE TO MOVE MASCOT!"
      : "🖱️ MOVE MOUSE TO PLAY WITH MASCOT!";
    enterBtn.classList.remove("hidden");
    spawnEmojiBurst(["💖", "🌸", "✨", "💗"], 22);
  }

  function startOpeningSequence() {
    stopPeekLoop();
    boxOpened = false;
    hasEnteredAsk = false;

    openingScene.classList.remove("hidden");
    openingScene.setAttribute("aria-hidden", "false");
    askScene.classList.add("hidden");
    askScene.setAttribute("aria-hidden", "true");
    yesScene.classList.add("hidden");
    yesScene.setAttribute("aria-hidden", "true");

    peepBoxWrapper.classList.remove("state-welcome", "state-peeping");
    peepBoxWrapper.classList.add("state-closed");
    if (boxLid) {
      boxLid.classList.remove("dragging");
      boxLid.style.transform = "";
    }
    mainCharacter.style.transform = "";

    mascotSpeech.classList.add("hidden");
    enterBtn.classList.add("hidden");
    boxLabel.innerHTML = `<span class="pulse-dot"></span><span>SOMEONE IS INSIDE...</span>`;

    if (isTouchDevice) {
      liftHint.textContent = "📱 LIFT THE LID UP OR SHAKE YOUR PHONE!";
      if ("DeviceMotionEvent" in window) {
        motionBtn.classList.remove("hidden");
        if (motionActive) {
          motionBtn.textContent = "📱 SHAKE & TILT ACTIVE! 💖";
          motionBtn.classList.add("active");
        }
      }
    } else {
      liftHint.textContent = "🖱️ USE MOUSE TO LIFT THE LID UP!";
      motionBtn.classList.add("hidden");
    }

    startPeekLoop();
  }

  // Interactive Mouse & Touch Drag-Up on Box Lid
  if (boxLid) {
    boxLid.addEventListener("pointerdown", (e) => {
      if (boxOpened) return;
      isDraggingLid = true;
      dragStartY = e.clientY;
      dragDeltaY = 0;
      clearTimeout(peekCloseTimer);
      boxLid.classList.add("dragging");
      boxLid.setPointerCapture(e.pointerId);
    });

    boxLid.addEventListener("pointermove", (e) => {
      if (!isDraggingLid || boxOpened) return;
      dragDeltaY = Math.min(0, e.clientY - dragStartY);
      const clampedLift = Math.max(-170, dragDeltaY);
      boxLid.style.transform = `translateY(${clampedLift}px) rotate(${(clampedLift * 0.05).toFixed(1)}deg)`;

      const progress = Math.min(1, Math.abs(clampedLift) / 65);
      const charY = 225 - progress * 155;
      mainCharacter.style.transform = `scale(0.82) translateY(${charY.toFixed(1)}px)`;

      if (dragDeltaY <= -58) {
        isDraggingLid = false;
        openBox();
      }
    });

    const endLidDrag = () => {
      if (!isDraggingLid) return;
      isDraggingLid = false;
      boxLid.classList.remove("dragging");
      boxLid.style.transform = "";
      mainCharacter.style.transform = "";

      if (Math.abs(dragDeltaY) < 8) {
        // Simple click or tap on lid also lifts it open!
        openBox();
      }
    };

    boxLid.addEventListener("pointerup", endLidDrag);
    boxLid.addEventListener("pointercancel", endLidDrag);
    boxLid.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openBox();
      }
    });
  }

  // Phone Shake & Tilt Motion Listeners (iPhone 17 / iOS 13+ + Android)
  function attachPhoneSensors() {
    if (motionActive) return;
    motionActive = true;
    motionBtn.textContent = "📱 SHAKE & TILT ACTIVE! 💖";
    motionBtn.classList.add("active");

    window.addEventListener("deviceorientation", (e) => {
      if (e.gamma === null && e.beta === null) return;
      const gx = (e.gamma || 0) / 28; // Left-right tilt
      const by = ((e.beta || 45) - 45) / 28; // Forward-back tilt around 45deg hold
      applyCharacterPose(gx, by);
    });

    let lastMag = null;
    window.addEventListener("devicemotion", (e) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      if (lastMag !== null) {
        const delta = Math.abs(mag - lastMag);
        const now = Date.now();
        if (delta > 12.5 && now - lastShakeTime > 650) {
          lastShakeTime = now;
          if (!boxOpened) {
            openBox();
          }
          triggerMascotJiggle();
        }
      }
      lastMag = mag;
    });
  }

  async function enablePhoneMotion() {
    try {
      if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function"
      ) {
        const res = await DeviceMotionEvent.requestPermission();
        if (res !== "granted") {
          motionBtn.textContent = "⚠️ ALLOW MOTION IN SAFARI TO SHAKE";
          return;
        }
      }
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        await DeviceOrientationEvent.requestPermission().catch(() => {});
      }
      attachPhoneSensors();
      spawnEmojiBurst(["📱", "✨", "💖"], 12);
    } catch {
      attachPhoneSensors();
    }
  }

  if (motionBtn) {
    motionBtn.addEventListener("click", enablePhoneMotion);
  }

  // Auto-attach on devices that don't gate DeviceMotion behind requestPermission
  if (
    isTouchDevice &&
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission !== "function"
  ) {
    attachPhoneSensors();
  }

  function goToAskScene() {
    if (hasEnteredAsk) return;
    hasEnteredAsk = true;
    stopPeekLoop();

    openingScene.classList.add("hidden");
    askScene.classList.remove("hidden");
    askScene.setAttribute("aria-hidden", "false");
    spawnEmojiBurst(["💋", "💖", "✨"], 14);
  }

  enterBtn.addEventListener("click", goToAskScene);
  mainCharacter.addEventListener("click", () => {
    if (!boxOpened) {
      openBox();
      return;
    }
    triggerMascotJiggle();
  });

  // =========================================================================
  // STAGE 2: NO / YES INTERACTIONS
  // =========================================================================
  const NO_CAPTIONS = [
    "Wait... why no? Please talk to me 🥺💖",
    "Ouch!! My heart is breakinggg 💔😿",
    "Babaiiii look at the sad bear 😭💔",
    "Pretty please with 1000 kisses? 🥺💘",
    "I'm not giving up until you say YES! 💗✨",
  ];

  noBtn.addEventListener("click", () => {
    noCount += 1;

    // Show sad crying bear meme every time NO is clicked (re-trigger shake)
    noReaction.classList.remove("hidden");
    noReaction.style.animation = "none";
    // Force reflow so animation replays each click
    void noReaction.offsetWidth;
    noReaction.style.animation = "sadShake 0.45s ease";

    const capIdx = Math.min(noCount - 1, NO_CAPTIONS.length - 1);
    noCaption.textContent = NO_CAPTIONS[capIdx];

    if (noCount === 1) {
      // First click: hearts flying around
      askSubheading.textContent = "Aww wait, look at all these hearts for you 💖";
      spawnEmojiBurst(["💖", "💗", "💕", "💓", "💘"], 32);
    } else {
      // Second click & onwards: broken hearts flying around
      askSubheading.textContent = "Nooo my poor heart is breaking 💔😭";
      spawnEmojiBurst(["💔", "🥀", "💔", "😿"], 36);
    }

    // Increase YES option size every time NO is clicked (clamped cleanly for iPhone)
    const isNarrow = window.innerWidth <= 480;
    const newFontRem = Math.min(1.25 + noCount * (isNarrow ? 0.28 : 0.42), isNarrow ? 2.4 : 4.1);
    const newPadY = Math.min(14 + noCount * (isNarrow ? 4 : 6), isNarrow ? 26 : 36);
    const newPadX = Math.min(36 + noCount * (isNarrow ? 8 : 14), isNarrow ? 54 : 92);
    yesBtn.style.fontSize = `${newFontRem}rem`;
    yesBtn.style.padding = `${newPadY}px ${newPadX}px`;
  });

  yesBtn.addEventListener("click", () => {
    askScene.classList.add("hidden");
    yesScene.classList.remove("hidden");
    yesScene.setAttribute("aria-hidden", "false");

    // Confetti & flying celebration!
    launchConfetti(220);
    setTimeout(() => launchConfetti(140), 450);
    spawnEmojiBurst(["💖", "🎉", "✨", "💛", "👑", "💃", "💕"], 42);
  });

  // =========================================================================
  // STAGE 3: 3D HOLOGRAPHIC PASS TILT (MOUSE + TOUCH) + PNG EXPORT + REPLAY
  // =========================================================================
  function tiltPass(clientX, clientY) {
    if (!goldenPass) return;
    const rect = goldenPass.getBoundingClientRect();
    const rx = ((clientY - rect.top) / rect.height - 0.5) * -14;
    const ry = ((clientX - rect.left) / rect.width - 0.5) * 14;
    goldenPass.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }

  function resetPassTilt() {
    if (goldenPass) goldenPass.style.transform = "rotateX(0deg) rotateY(0deg)";
  }

  if (goldenPass) {
    goldenPass.addEventListener("mousemove", (e) => tiltPass(e.clientX, e.clientY));
    goldenPass.addEventListener("mouseleave", resetPassTilt);
    goldenPass.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches && e.touches[0]) tiltPass(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    goldenPass.addEventListener("touchend", resetPassTilt, { passive: true });
  }

  moreConfettiBtn.addEventListener("click", () => {
    launchConfetti(170);
    spawnEmojiBurst(["💖", "✨", "💛", "🎉", "🌸"], 28);
  });

  replayBtn.addEventListener("click", () => {
    noCount = 0;
    noReaction.classList.add("hidden");
    yesBtn.style.fontSize = "";
    yesBtn.style.padding = "";
    askSubheading.textContent = "Pretty please with extra pink sparkles? 🥺💗";
    startOpeningSequence();
  });

  // Render high-res downloadable Golden Pass PNG via Canvas
  downloadPassBtn.addEventListener("click", () => {
    const c = document.createElement("canvas");
    c.width = 1400;
    c.height = 880;
    const g = c.getContext("2d");

    // Soft pink outer backdrop
    g.fillStyle = "#ffd6e8";
    g.fillRect(0, 0, c.width, c.height);

    // Metallic Gold Card Gradient
    const cardX = 70, cardY = 60, cardW = 1260, cardH = 760, r = 42;
    const grad = g.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    grad.addColorStop(0, "#fff6c4");
    grad.addColorStop(0.28, "#f9d667");
    grad.addColorStop(0.55, "#e5a92b");
    grad.addColorStop(0.78, "#fff0a8");
    grad.addColorStop(1, "#cc8b18");

    g.save();
    g.beginPath();
    g.roundRect(cardX, cardY, cardW, cardH, r);
    g.fillStyle = grad;
    g.shadowColor = "rgba(136, 14, 79, 0.35)";
    g.shadowBlur = 40;
    g.shadowOffsetY = 18;
    g.fill();
    g.restore();

    // Outer & Inner Borders
    g.strokeStyle = "#6b4300";
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(cardX, cardY, cardW, cardH, r);
    g.stroke();

    g.strokeStyle = "#8c5a00";
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(cardX + 26, cardY + 26, cardW - 52, cardH - 52, 28);
    g.stroke();

    g.setLineDash([12, 10]);
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(cardX + 42, cardY + 42, cardW - 84, cardH - 84, 20);
    g.stroke();
    g.setLineDash([]);

    // Text
    g.textAlign = "center";
    g.fillStyle = "#704500";
    g.font = "bold 24px 'Courier New', monospace";
    g.fillText("★ OFFICIAL 24*7 VIP PASS  //  NO. 0001 ★", 700, 155);

    g.fillStyle = "#543300";
    g.font = "800 84px Georgia, serif";
    g.fillText("GOLDEN PASS", 700, 260);

    g.fillStyle = "#d81b60";
    g.font = "bold 34px sans-serif";
    g.fillText("♥", 700, 315);

    g.fillStyle = "#7a4e00";
    g.font = "bold 24px 'Courier New', monospace";
    g.fillText("PROUDLY PRESENTED TO", 700, 375);

    g.fillStyle = "#3d2400";
    g.font = "800 68px Georgia, serif";
    g.fillText("ANANDI SINHA", 700, 455);

    // Message Box
    g.fillStyle = "rgba(255, 248, 224, 0.72)";
    g.beginPath();
    g.roundRect(170, 500, 1060, 145, 24);
    g.fill();
    g.strokeStyle = "#8c5a00";
    g.lineWidth = 2.5;
    g.stroke();

    g.fillStyle = "#4a2e00";
    g.font = "bold 30px sans-serif";
    g.fillText("INDRAYUDH BANDYOPADHYAY IS AT YOUR SERVICE 24*7", 700, 560);

    g.fillStyle = "#d81b60";
    g.font = "bold 28px sans-serif";
    g.fillText("THANK YOU FOR SAYING YOU WILL TALK TO HIM 💖", 700, 614);

    // Signature & Seal
    g.textAlign = "left";
    g.fillStyle = "#4a2e00";
    g.font = "italic 34px Georgia, serif";
    g.fillText("Indrayudh Bandyopadhyay", 150, 725);
    g.font = "bold 18px 'Courier New', monospace";
    g.fillStyle = "#7a4e00";
    g.fillText("AT YOUR SERVICE ALWAYS", 150, 755);

    g.beginPath();
    g.arc(1160, 715, 58, 0, Math.PI * 2);
    g.fillStyle = "#d81b60";
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = "#fff3b0";
    g.stroke();
    g.textAlign = "center";
    g.fillStyle = "#fff8d6";
    g.font = "bold 26px sans-serif";
    g.fillText("24*7", 1160, 712);
    g.font = "bold 16px sans-serif";
    g.fillText("♥ VIP ♥", 1160, 738);

    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "Golden-Pass-Anandi-Sinha.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Golden Pass for Anandi Sinha",
          });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "Golden-Pass-Anandi-Sinha.png";
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  });

  // Start opening scene on load!
  startOpeningSequence();
})();
