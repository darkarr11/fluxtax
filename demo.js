/* "How blabbing works" demo: a scripted, self-playing walkthrough in a modal.
   Pure animation on a copy of one paragraph. Nothing is read from or written to Firestore. */
(function () {
  /* A page can swap in its own example by setting window.FT_DEMO before this script loads */
  var C = window.FT_DEMO || {};
  var SENTENCE = C.sentence || 'Used and secondhand goods are never taxed.';
  var PARA_BEFORE = C.before || 'The tax applies to new goods and services. ';
  var PARA_AFTER = C.after || ' You decide what you buy, so you decide what you pay.';
  var BLAB1 = C.blab1 || 'So if I buy my neighbor’s truck, I pay no tax at all?';
  var PHRASE = C.phrase || 'my neighbor’s truck';
  var BLAB2 = C.blab2 || 'Right. It was taxed once when it was sold new. After that, it’s free and clear.';

  var modal = document.createElement('div');
  modal.className = 'ft-demo';
  modal.innerHTML =
    '<div class="ft-demo-card" role="dialog" aria-label="How blabbing works">' +
      '<div class="ft-demo-head"><span>How blabbing works</span><button type="button" class="ft-close" aria-label="Close">&times;</button></div>' +
      '<div class="ft-demo-stage">' +
        '<p class="ft-demo-para">' + PARA_BEFORE + '<span class="ft-demo-sweep s1">' + SENTENCE + '</span>' + PARA_AFTER + '</p>' +
        '<div class="ft-demo-thread"></div>' +
        '<button type="button" class="ft-demo-fakebtn">💬 Blab on this</button>' +
        '<div class="ft-demo-cursor"><div class="ft-tip"></div></div>' +
      '</div>' +
      '<div class="ft-demo-foot"><span class="ft-demo-note">Example only. Names and comments are made up.</span>' +
        '<span><button type="button" class="ft-demo-replay">Replay</button> <button type="button" class="ft-demo-try">Try it yourself</button></span></div>' +
    '</div>';
  document.body.appendChild(modal);

  var card = modal.querySelector('.ft-demo-card');
  var stage = modal.querySelector('.ft-demo-stage');
  var tip = modal.querySelector('.ft-tip');
  var SLOW = 1.6;  /* stretch every pause; raise to slow the demo down */
  var thread = modal.querySelector('.ft-demo-thread');
  var cursor = modal.querySelector('.ft-demo-cursor');
  var fakeBtn = modal.querySelector('.ft-demo-fakebtn');
  var timers = [], run = 0;

  function wait(ms, id) { return new Promise(function (res) { timers.push(setTimeout(function () { if (id === run) res(); }, ms * SLOW)); }); }
  function stop() { timers.forEach(clearTimeout); timers = []; run++; }
  function pos(el, dx, dy) {
    var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left + (dx || 0), y: r.top - s.top + (dy || 0) };
  }
  var cur = { x: 0, y: 0 };
  /* Keep the instruction box beside the cursor, flipping left/up near the stage edges */
  function placeTip() {
    var W = stage.clientWidth, H = stage.clientHeight;
    tip.classList.toggle('flip-x', cur.x + 24 + tip.offsetWidth > W - 8);
    tip.classList.toggle('flip-y', cur.y + 26 + tip.offsetHeight > H - 8);
  }
  function moveCursor(p) { cur = p; cursor.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)'; placeTip(); }
  function click() { cursor.classList.add('click'); timers.push(setTimeout(function () { cursor.classList.remove('click'); }, 250)); }
  /* Instruction box rides with the cursor */
  function say(t) {
    tip.classList.remove('show');
    tip.innerHTML = t;
    placeTip();
    void tip.offsetWidth; tip.classList.add('show');
  }
  function typeInto(el, text, id) {
    var i = 0;
    return new Promise(function (res) {
      (function step() {
        if (id !== run) return;
        el.textContent = text.slice(0, ++i);
        if (i < text.length) timers.push(setTimeout(step, 45)); else res();
      })();
    });
  }
  function blabCard(name, stance, stanceClass, quote) {
    var d = document.createElement('div');
    d.className = 'ft-blab ft-demo-blab';
    d.innerHTML = (quote ? '<div class="ft-onquote">on “' + quote + '”</div>' : '') +
      '<div class="ft-meta"><strong>' + name + '</strong> ' + (stance ? '<span class="ft-stance ' + stanceClass + '">' + stance + '</span>' : '') + ' <span class="ft-when">just now</span></div>' +
      '<div class="ft-body"></div>';
    return d;
  }
  function showBtnAt(p) { fakeBtn.style.left = p.x + 'px'; fakeBtn.style.top = p.y + 'px'; fakeBtn.classList.add('show'); }

  async function play() {
    stop(); var id = run;
    thread.innerHTML = ''; fakeBtn.classList.remove('show');
    var s1 = modal.querySelector('.s1'); s1.className = 'ft-demo-sweep s1';
    modal.querySelectorAll('.ft-demo-badge').forEach(function (b) { b.remove(); });
    cursor.style.transition = 'none'; moveCursor({ x: stage.clientWidth - 40, y: stage.clientHeight - 30 });
    await wait(50, id); cursor.style.transition = '';

    tip.className = 'ft-tip';
    await wait(300, id);
    say('<span class="ft-step">1</span> Highlight the section you want to comment on.');
    await wait(700, id);
    moveCursor(pos(s1, 0, 6)); await wait(800, id);
    s1.classList.add('sweeping'); moveCursor(pos(s1, s1.getBoundingClientRect().width > stage.clientWidth * 0.6 ? stage.clientWidth * 0.55 : s1.getBoundingClientRect().width, 26));
    await wait(1300, id);
    showBtnAt(pos(s1, 0, s1.getBoundingClientRect().height + 52));
    await wait(500, id);
    moveCursor(pos(fakeBtn, 40, 14)); await wait(700, id); click(); await wait(300, id);
    fakeBtn.classList.remove('show');

    var b1 = blabCard(C.name1 || 'Example: Sam', 'Question', 'ft-question');
    thread.appendChild(b1);
    say('<span class="ft-step">2</span> Leave your comment.');
    await wait(900, id);
    moveCursor(pos(b1.querySelector('.ft-body'), -6, b1.querySelector('.ft-body').offsetHeight));
    await wait(700, id);
    await typeInto(b1.querySelector('.ft-body'), BLAB1, id);
    await wait(500, id);
    s1.classList.add('done');
    var badge = document.createElement('span'); badge.className = 'ft-badge ft-demo-badge'; badge.setAttribute('data-count', '1'); s1.after(badge);
    await wait(1500, id);

    say('<span class="ft-step">3</span> Someone else can respond to your comment, or a section of your comment.');
    var body1 = b1.querySelector('.ft-body');
    var i = BLAB1.indexOf(PHRASE);
    body1.innerHTML = BLAB1.slice(0, i) + '<span class="ft-demo-sweep s2">' + PHRASE + '</span>' + BLAB1.slice(i + PHRASE.length);
    var s2 = body1.querySelector('.s2');
    await wait(600, id);
    moveCursor(pos(s2, 0, 6)); await wait(800, id);
    s2.classList.add('sweeping'); moveCursor(pos(s2, s2.getBoundingClientRect().width, 26));
    await wait(1100, id);
    showBtnAt(pos(s2, 0, 34));
    await wait(500, id);
    moveCursor(pos(fakeBtn, 40, 14)); await wait(700, id); click(); await wait(300, id);
    fakeBtn.classList.remove('show');

    var b2 = blabCard(C.name2 || 'Example: Jess', '', '', PHRASE);
    b2.style.marginLeft = '14px';
    thread.appendChild(b2);
    moveCursor(pos(b2.querySelector('.ft-body'), -6, b2.querySelector('.ft-body').offsetHeight));
    await wait(700, id);
    await typeInto(b2.querySelector('.ft-body'), BLAB2, id);
    s2.classList.add('done');
    var badge2 = document.createElement('span'); badge2.className = 'ft-badge ft-demo-badge'; badge2.setAttribute('data-count', '1'); s2.after(badge2);
    await wait(900, id);
    moveCursor({ x: stage.clientWidth - 40, y: stage.clientHeight - 30 });
    say('<span class="ft-step">\u2713</span> That\u2019s it. Click any highlight to read the discussion.');
  }

  function open() { modal.classList.add('open'); play(); }
  function close() { stop(); modal.classList.remove('open'); }
  modal.querySelector('.ft-close').addEventListener('click', close);
  modal.querySelector('.ft-demo-try').addEventListener('click', close);
  modal.querySelector('.ft-demo-replay').addEventListener('click', play);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  document.querySelectorAll('[data-demo]').forEach(function (b) { b.addEventListener('click', open); });
})();
