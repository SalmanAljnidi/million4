/* مسابقة القسمة - نسخة تعليمية مستوحاة من برامج المسابقات
   - أسئلة قسمة فقط
   - المقسوم عليه: ١–١٠
   - الناتج: رقم واحد (١–٩)
   - تدرّج من السهل إلى الصعب
   - وسائل مساعدة: ٥٠:٥٠، سؤال الجمهور، اتصال بصديق (مرة واحدة)
   - PWA: يعمل أوفلاين عبر service worker
   ملاحظة: الأصوات هنا أصلية مُولَّدة (WebAudio) وليست من أي برنامج.
*/

(() => {
  "use strict";

  const Q_TOTAL = 15;

  // Arabic digits
  const toArabicDigits = (x) => {
    const map = {'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩'};
    return String(x).replace(/[0-9]/g, d => map[d]);
  };

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // DOM helpers
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Screens
  const screenIntro = $("#screenIntro");
  const screenGame  = $("#screenGame");
  const screenEnd   = $("#screenEnd");

  // Intro
  const playerName = $("#playerName");
  const difficulty = $("#difficulty");
  const btnStart = $("#btnStart");
  const btnHow = $("#btnHow");

  // Game UI
  const whoName = $("#whoName");
  const progress = $("#progress");
  const totalQ = $("#totalQ");
  const qNo = $("#qNo");
  const questionText = $("#questionText");
  const ansBtns = $$(".ans");
  const ansTexts = [$("#a0"), $("#a1"), $("#a2"), $("#a3")];
  const btnNext = $("#btnNext");
  const btnWalk = $("#btnWalk");

  // Ladder
  const ladderList = $("#ladderList");
  const miniLadder = $("#miniLadder");

  // Toast
  const toast = $("#toast");

  // Lifelines
  const ll5050 = $("#ll5050");
  const llAudience = $("#llAudience");
  const llPhone = $("#llPhone");

  // Dialogs
  const dlgHow = $("#dlgHow");
  const dlgAudience = $("#dlgAudience");
  const dlgPhone = $("#dlgPhone");

  const audA = $("#audA"), audB = $("#audB"), audC = $("#audC"), audD = $("#audD");
  const audATxt = $("#audATxt"), audBTxt = $("#audBTxt"), audCTxt = $("#audCTxt"), audDTxt = $("#audDTxt");
  const phoneMsg = $("#phoneMsg");

  // End
  const endTitle = $("#endTitle");
  const endMsg = $("#endMsg");
  const btnRestart = $("#btnRestart");
  const btnHome = $("#btnHome");

  // Top
  const btnSound = $("#btnSound");
  const btnInstall = $("#btnInstall");

  // Timer
  const timerFill = $("#timerFill");
  const timerTxt = $("#timerTxt");

  // Basic integrity check (prevents silent failure)
  const required = [
    screenIntro, screenGame, screenEnd,
    btnStart, btnNext, btnWalk,
    questionText, timerFill, timerTxt,
    ll5050, llAudience, llPhone,
    ladderList
  ];
  if (required.some(el => !el)) {
    console.error("Missing DOM elements. Check index.html ids.");
    return;
  }

  totalQ.textContent = toArabicDigits(Q_TOTAL);

  const setToast = (msg) => { toast.textContent = msg; };

  const showScreen = (which) => {
    [screenIntro, screenGame, screenEnd].forEach(s => s.classList.remove("active"));
    which.classList.add("active");
    window.scrollTo({top:0, behavior:"smooth"});
  };

  // --- Audio (simple, clean, no background) ---
  let soundEnabled = true;
  let audioCtx = null;

  const ensureAudio = async () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
  };

  const beep = async ({freq=440, dur=0.12, type="sine", vol=0.05, slideTo=null}) => {
    if (!soundEnabled) return;
    await ensureAudio();
    const t0 = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  };

  const chord = async (notes, dur=0.22, vol=0.045, type="triangle") => {
    if (!soundEnabled) return;
    await ensureAudio();
    const t0 = audioCtx.currentTime;
    const out = audioCtx.createGain();
    out.gain.value = 0.9;
    out.connect(audioCtx.destination);
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(out);
      o.start(t0 + i*0.003);
      o.stop(t0 + dur + 0.04);
    });
  };

  const sfx = {
    start: () => chord([196, 247, 294], 0.28, 0.055, "triangle"),
    select: () => beep({freq: 520, dur: 0.07, type:"square", vol:0.03, slideTo: 680}),
    lock: async () => { await chord([262, 330, 392], 0.20, 0.06, "sine"); await beep({freq: 880, dur:0.05, type:"sine", vol:0.018}); },
    correct: async () => { await chord([330, 415, 494], 0.26, 0.07, "triangle"); await beep({freq: 990, dur:0.06, type:"sine", vol:0.02, slideTo: 1200}); },
    wrong: async () => { await chord([220, 208, 196], 0.30, 0.06, "sawtooth"); await beep({freq: 140, dur:0.18, type:"sawtooth", vol:0.055, slideTo: 90}); },
    lifeline: () => chord([294, 370, 440], 0.22, 0.05, "triangle"),
    tick: () => beep({freq: 980, dur: 0.03, type:"sine", vol:0.012}),
    hurry: () => beep({freq: 740, dur: 0.05, type:"square", vol:0.020, slideTo: 520}),
  };

  // PWA install
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall) btnInstall.hidden = false;
  });
  if (btnInstall) {
    btnInstall.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      await ensureAudio();
      deferredPrompt.prompt();
      deferredPrompt = null;
      btnInstall.hidden = true;
    });
  }

  // Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
    });
  }

  // Game state
  let state = {
    name: "متسابق",
    step: 0,                  // answered correct count
    current: null,             // current question object
    phase: "idle",             // idle | choosing | revealed
    lockedIdx: null,
    allowPick: true,
    used: { fifty:false, audience:false, phone:false },
    timerSec: 30,
    timerLeft: 30,
    timerId: null,
  };

  const difficultyToTimer = (mode) => (mode === "calm" ? 40 : (mode === "fast" ? 22 : 30));

  // Question generator (easy -> hard)
  // Stages:
  //  0-4  : divisor 1-3, quotient 1-4
  //  5-9  : divisor 4-6, quotient 2-7
  //  10-14: divisor 7-10, quotient 3-9 + closer distractors
  const makeQuestion = () => {
    const idx = state.step; // 0..14
    let dMin=1, dMax=3, qMin=1, qMax=4;
    if (idx >= 5 && idx < 10) { dMin=4; dMax=6; qMin=2; qMax=7; }
    if (idx >= 10) { dMin=7; dMax=10; qMin=3; qMax=9; }

    const randInt = (a,b) => a + Math.floor(Math.random()*(b-a+1));
    const divisor = randInt(dMin, dMax);
    const quotient = randInt(qMin, qMax);
    const dividend = divisor * quotient;

    const correct = quotient;
    const options = new Set([correct]);

    const addDistractor = () => {
      if (idx >= 10) {
        const deltas = shuffle([-2,-1,1,2]);
        for (const d of deltas) {
          const w = correct + d;
          if (w >= 1 && w <= 9 && !options.has(w)) return w;
        }
      }
      let w = randInt(1,9);
      if (w === correct) w = (w % 9) + 1;
      return w;
    };

    while (options.size < 4) options.add(addDistractor());
    const arr = shuffle(Array.from(options));
    const correctIdx = arr.indexOf(correct);

    return { dividend, divisor, correct, options: arr, correctIdx };
  };

  const renderMiniLadder = () => {
    miniLadder.innerHTML = "";
    for (let n = Q_TOTAL; n >= 1; n--) {
      const li = document.createElement("li");
      li.className = "litem";
      li.innerHTML = `<span>${toArabicDigits(n)}</span><span>${n===1 ? "النهائي" : ""}</span>`;
      miniLadder.appendChild(li);
    }
  };

  const renderLadder = () => {
    ladderList.innerHTML = "";
    for (let n = Q_TOTAL; n >= 1; n--) {
      const li = document.createElement("li");
      li.className = "litem";
      const mark = (n === (state.step + 1)) ? "▶" : "";
      li.innerHTML = `<span>${toArabicDigits(n)}</span><span>${mark}</span>`;
      if (n === (state.step + 1)) li.classList.add("active");
      if (n <= state.step) li.classList.add("done");
      ladderList.appendChild(li);
    }
  };

  const resetAnswerUI = () => {
    ansBtns.forEach(b => {
      b.classList.remove("selected","correct","wrong","disabled","hide");
      b.disabled = false;
    });
    btnNext.disabled = true;
  };

  const startTimer = () => {
    stopTimer();
    state.timerLeft = state.timerSec;
    timerTxt.textContent = toArabicDigits(state.timerLeft);
    timerFill.style.width = "100%";

    state.timerId = setInterval(() => {
      state.timerLeft -= 1;
      if (state.timerLeft < 0) state.timerLeft = 0;

      timerTxt.textContent = toArabicDigits(state.timerLeft);
      const pct = (state.timerLeft / state.timerSec) * 100;
      timerFill.style.width = pct + "%";

      if (state.timerLeft <= 10) sfx.hurry();
      else if (state.timerLeft <= 20) sfx.tick();

      if (state.timerLeft === 0) {
        stopTimer();
        onTimeout();
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  };

  const onTimeout = async () => {
    state.phase = "revealed";
    state.allowPick = false;
    ansBtns.forEach(b => b.disabled = true);
    setToast("انتهى الوقت!");
    await sfx.wrong();
    reveal(false, true);
  };

  const loadQuestion = () => {
    state.current = makeQuestion();
    state.phase = "choosing";
    state.lockedIdx = null;
    state.allowPick = true;

    resetAnswerUI();
    renderLadder();

    whoName.textContent = state.name;
    progress.textContent = toArabicDigits(state.step);
    qNo.textContent = toArabicDigits(state.step + 1);

    questionText.textContent = `كم ناتج: ${toArabicDigits(state.current.dividend)} ÷ ${toArabicDigits(state.current.divisor)} ؟`;
    ansTexts.forEach((el, i) => el.textContent = toArabicDigits(state.current.options[i]));

    setToast("اختر إجابتك…");
    btnNext.textContent = "تثبيت";
    startTimer();
  };

  const endGame = (title, message) => {
    stopTimer();
    endTitle.textContent = title;
    endMsg.textContent = message;
    showScreen(screenEnd);
  };

  const reveal = async (isCorrect, timeout=false) => {
    stopTimer();

    const correctIdx = state.current.correctIdx;

    ansBtns.forEach((b, i) => {
      b.classList.add("disabled");
      b.disabled = true;
      if (i === correctIdx) b.classList.add("correct");
    });

    if (state.lockedIdx !== null && state.lockedIdx !== correctIdx) {
      ansBtns[state.lockedIdx].classList.add("wrong");
    }

    if (isCorrect) {
      await sfx.correct();
      state.step += 1;
      progress.textContent = toArabicDigits(state.step);
      renderLadder();

      if (state.step >= Q_TOTAL) {
        endGame("مبروك! 🏆", `يا ${state.name}… أجبت على جميع الأسئلة!`);
        return;
      }

      setToast("إجابة صحيحة! اضغط (التالي).");
      state.phase = "revealed";
      btnNext.textContent = "التالي";
      btnNext.disabled = false;
    } else {
      const reason = timeout ? "انتهى الوقت" : "إجابة غير صحيحة";
      endGame("انتهت الجولة", `يا ${state.name}… ${reason}. وصلت إلى السؤال رقم ${toArabicDigits(state.step)} من ${toArabicDigits(Q_TOTAL)}.`);
    }
  };

  // Lifelines helpers
  const markUsed = (btn) => { btn.classList.add("used"); btn.disabled = true; };

  const use5050 = async () => {
    if (state.used.fifty || state.phase !== "choosing") return;
    state.used.fifty = true;
    markUsed(ll5050);
    await sfx.lifeline();

    const correct = state.current.correctIdx;
    const wrongs = [0,1,2,3].filter(i => i !== correct);
    shuffle(wrongs);
    wrongs.slice(0,2).forEach(i => {
      ansBtns[i].classList.add("hide");
      ansBtns[i].disabled = true;
    });

    setToast("تم تفعيل ٥٠:٥٠.");
  };

  const useAudience = async () => {
    if (state.used.audience || state.phase !== "choosing") return;
    state.used.audience = true;
    markUsed(llAudience);
    await sfx.lifeline();

    const c = state.current.correctIdx;

    // Determine remaining visible options (if 50:50 used)
    const visible = [0,1,2,3].filter(i => !ansBtns[i].classList.contains("hide"));
    const stage = state.step; // 0..14
    const baseCorrect = stage < 5 ? 72 : (stage < 10 ? 65 : 58);
    let remaining = 100 - baseCorrect;

    const vals = [0,0,0,0];
    vals[c] = baseCorrect;

    const others = visible.filter(i => i !== c);
    // distribute remaining among visible wrong options
    shuffle(others);
    const parts = others.map((_,i) => (i === others.length-1 ? remaining : Math.floor(remaining / others.length)));
    // fix distribution to sum
    let sumParts = parts.reduce((a,b)=>a+b,0);
    if (sumParts !== remaining) parts[parts.length-1] += (remaining - sumParts);

    others.forEach((idx, k) => vals[idx] = parts[k] || 0);

    // If some options hidden, keep their bars at 0
    const bars = [audA,audB,audC,audD];
    const txts = [audATxt,audBTxt,audCTxt,audDTxt];
    bars.forEach((b,i)=> { b.style.width = "0%"; });
    txts.forEach((t)=> { t.textContent = "٠٪"; });

    dlgAudience.showModal();
    requestAnimationFrame(() => {
      vals.forEach((v,i) => {
        bars[i].style.width = v + "%";
        txts[i].textContent = toArabicDigits(v) + "٪";
      });
    });

    setToast("ظهر توزيع أصوات الجمهور.");
  };

  const usePhone = async () => {
    if (state.used.phone || state.phase !== "choosing") return;
    state.used.phone = true;
    markUsed(llPhone);
    await sfx.lifeline();

    const c = state.current.correctIdx;
    const letters = ["أ","ب","ج","د"];

    const stage = state.step;
    const acc = stage < 5 ? 0.85 : (stage < 10 ? 0.75 : 0.65);
    const pickCorrect = Math.random() < acc;
    const pick = pickCorrect ? c : shuffle([0,1,2,3].filter(i => i !== c))[0];

    phoneMsg.textContent = pickCorrect
      ? `أنا شبه متأكد أن الإجابة الصحيحة هي (${letters[pick]}).`
      : `لست متأكدًا… لكن أميل للخيار (${letters[pick]}).`;

    dlgPhone.showModal();
    setToast("تم الاتصال بصديق.");
  };

  // Answer picking
  const onPick = async (idx) => {
    if (!state.allowPick || state.phase !== "choosing") return;
    if (ansBtns[idx].classList.contains("hide")) return;

    ansBtns.forEach(b => b.classList.remove("selected"));
    ansBtns[idx].classList.add("selected");
    state.lockedIdx = idx;
    btnNext.disabled = false;
    await sfx.select();
    setToast("اضغط (تثبيت) لقفل الإجابة.");
  };

  const lockAnswer = async () => {
    if (state.phase !== "choosing" || state.lockedIdx === null) return;

    state.allowPick = false;
    state.phase = "locking";
    ansBtns.forEach(b => b.disabled = true);
    btnNext.disabled = true;

    setToast("تم تثبيت الإجابة…");
    await sfx.lock();

    // suspense
    await new Promise(res => setTimeout(res, 850));

    const correct = (state.lockedIdx === state.current.correctIdx);
    await reveal(correct, false);
  };

  const nextOrLock = () => {
    if (state.phase === "choosing") {
      lockAnswer();
    } else if (state.phase === "revealed") {
      loadQuestion();
    }
  };

  const walkAway = async () => {
    stopTimer();
    await beep({freq: 300, dur: 0.10, type:"triangle", vol:0.04, slideTo: 220});
    endGame("انسحبت من المسابقة", `أحسنت يا ${state.name}. وصلت إلى السؤال رقم ${toArabicDigits(state.step)} من ${toArabicDigits(Q_TOTAL)}.`);
  };

  // Init ladders
  renderMiniLadder();
  renderLadder();

  // Events
  btnHow.addEventListener("click", async () => { await ensureAudio(); dlgHow.showModal(); });

  btnStart.addEventListener("click", async () => {
    await ensureAudio();

    state.name = (playerName.value || "").trim() || "متسابق";
    state.timerSec = difficultyToTimer(difficulty.value);

    state.step = 0;
    state.used = {fifty:false, audience:false, phone:false};
    [ll5050,llAudience,llPhone].forEach(b => { b.classList.remove("used"); b.disabled = false; });

    await sfx.start();
    showScreen(screenGame);
    loadQuestion();
  });

  ansBtns.forEach(btn => btn.addEventListener("click", () => onPick(Number(btn.dataset.idx))));
  btnNext.addEventListener("click", nextOrLock);
  btnWalk.addEventListener("click", walkAway);

  ll5050.addEventListener("click", use5050);
  llAudience.addEventListener("click", useAudience);
  llPhone.addEventListener("click", usePhone);

  btnRestart.addEventListener("click", async () => {
    await ensureAudio();
    state.step = 0;
    state.used = {fifty:false, audience:false, phone:false};
    [ll5050,llAudience,llPhone].forEach(b => { b.classList.remove("used"); b.disabled = false; });
    await sfx.start();
    showScreen(screenGame);
    loadQuestion();
  });

  btnHome.addEventListener("click", () => { stopTimer(); showScreen(screenIntro); });

  btnSound.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;
    btnSound.textContent = soundEnabled ? "🔊" : "🔇";
    btnSound.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
    if (soundEnabled) await ensureAudio();
    setToast(soundEnabled ? "تم تشغيل الصوت." : "تم كتم الصوت.");
  });

  // Unlock audio on first gesture
  window.addEventListener("pointerdown", () => { if (soundEnabled) ensureAudio(); }, {once:true});
})();
