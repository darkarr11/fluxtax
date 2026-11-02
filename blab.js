/* Blab layer for fluxtax.com pages (copied from montana2028.com).
   Readers highlight any passage and leave a take; takes are stored as
   Blabbertree blabs (same Firestore collection and anchor format as tree.html),
   so they show up on BT too. Page needs:
     <div id="policy" data-doc="fluxtax_<page>">  ...policy text...  </div>
     <div id="general-discussion"></div>   (optional: unanchored thread) */
(function () {
  var firebaseConfig = {
    apiKey: "AIzaSyDvCGA1ujiDw6HiSBeTe8chNPzgah3LcQ8",
    authDomain: "blabbertree-app.firebaseapp.com",
    projectId: "blabbertree-app",
    storageBucket: "blabbertree-app.firebasestorage.app",
    messagingSenderId: "955452596015",
    appId: "1:955452596015:web:cb21be43abff8c7a82cbda"
  };
  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var me = null;
  function isMember() { return !!(me && !me.isAnonymous); }
  firebase.auth().onAuthStateChanged(function (u) {
    me = u;
    if (!u) { firebase.auth().signInAnonymously().catch(function () {}); return; }
    renderAuthBar();
    if (typeof refresh === 'function') { if (general) general.innerHTML = ''; refresh(true); }
  });

  var policy = document.getElementById('policy');
  if (!policy) return;
  var DOC_KEY = policy.getAttribute('data-doc');
  var SECTION = 'policy', GENERAL = 'general';
  var STANCES = [['question', 'Question'], ['support', 'Agree'], ['oppose', 'Disagree'], ['context', 'Add info']];
  var blabs = [];

  /* ---------- helpers ---------- */
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function norm(s) { return s.replace(/[\n\r\t]+/g, ' ').replace(/ {2,}/g, ' '); }
  function newId() { return 'm28' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
  function when(ts) { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function stanceLabel(v) { for (var i = 0; i < STANCES.length; i++) if (STANCES[i][0] === v) return STANCES[i][1]; return ''; }
  function myName() { return isMember() ? (me.displayName || 'Member') : 'Anonymous'; }

  /* ---------- sign-in bar ---------- */
  function signIn() {
    firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function (e) {
      var bar = document.getElementById('m28-auth');
      if (bar && e && e.code !== 'auth/popup-closed-by-user') bar.insertAdjacentHTML('beforeend', '<div class="m28-auth-err">Sign-in didn\u2019t work. Try again in a moment.</div>');
    });
  }
  function renderAuthBar() {
    var bar = document.getElementById('m28-auth');
    if (!bar) return;
    bar.innerHTML = isMember()
      ? 'Posting as <strong>' + esc(myName()) + '</strong> \u2713 &middot; <button type="button" class="m28-link" data-signout>Sign out</button>'
      : 'Posting as <strong>Anonymous</strong>. <button type="button" class="m28-signin" data-signin>Sign in with Google</button> to show your name and edit your own posts.';
    var a = bar.querySelector('[data-signin]'); if (a) a.addEventListener('click', signIn);
    var b = bar.querySelector('[data-signout]'); if (b) b.addEventListener('click', function () { firebase.auth().signOut(); });
  }

  /* ---------- anchoring (same scheme as Blabbertree tree.html) ---------- */
  function anchorWithin(root, exact) {
    var full = norm(root.textContent), i = full.indexOf(exact);
    if (i === -1) return null;
    return { exact: exact, prefix: full.substring(Math.max(0, i - 30), i), suffix: full.substring(i + exact.length, i + exact.length + 30) };
  }

  /* Policy text -> {exact,prefix,suffix}. Text inside someone's comment ->
     BT's blab-text anchor {type:'blab-text', blabId, ...}, a blab on a blab. */
  function selectionAnchor() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    var exact = norm(sel.toString().trim());
    if (exact.length < 3) return null;
    if (policy.contains(r.startContainer) && policy.contains(r.endContainer)) return anchorWithin(policy, exact);
    var el = r.startContainer.nodeType === 3 ? r.startContainer.parentNode : r.startContainer;
    var body = el.closest && el.closest('.m28-body[data-blab-id]');
    if (!body || !body.contains(r.endContainer)) return null;
    var a = anchorWithin(body, exact);
    if (!a) return null;
    a.type = 'blab-text'; a.blabId = body.getAttribute('data-blab-id');
    return a;
  }

  function findRange(root, anchor) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], raw = '', n;
    while ((n = walker.nextNode())) {
      if (n.parentNode.closest('.m28-badge')) continue;
      nodes.push({ node: n, start: raw.length }); raw += n.textContent;
    }
    var nt = '', map = [];
    for (var k = 0; k < raw.length; k++) {
      var ch = /[\n\r\t]/.test(raw[k]) ? ' ' : raw[k];
      if (ch === ' ' && nt.length && nt[nt.length - 1] === ' ') continue;
      map.push(k); nt += ch;
    }
    var want = norm(anchor.exact), best = -1, pos = 0, idx;
    while ((idx = nt.indexOf(want, pos)) !== -1) {
      if (anchor.prefix && nt.substring(Math.max(0, idx - 30), idx).indexOf(norm(anchor.prefix).slice(-15)) !== -1) { best = idx; break; }
      if (best === -1) best = idx;
      pos = idx + 1;
    }
    if (best === -1) return null;
    var s = map[best], eN = best + want.length, e = eN < map.length ? map[eN] : raw.length;
    var sn = null, so = 0, en = null, eo = 0;
    for (var j = 0; j < nodes.length; j++) {
      var end = nodes[j].start + nodes[j].node.textContent.length;
      if (!sn && s < end) { sn = nodes[j].node; so = s - nodes[j].start; }
      if (e <= end) { en = nodes[j].node; eo = e - nodes[j].start; break; }
    }
    if (!sn || !en) return null;
    var range = document.createRange(); range.setStart(sn, so); range.setEnd(en, eo);
    return range;
  }

  function isPassage(b) { return b.anchor && b.anchor.exact && b.anchor.type !== 'blab-text' && !b.parentId; }
  function byId(id) { for (var i = 0; i < blabs.length; i++) if (blabs[i].id === id) return blabs[i]; return null; }
  /* Every blab in the thread for one policy passage: the roots plus all their replies */
  function threadFor(key) {
    var out = blabs.filter(function (b) { return b.sectionId === SECTION && isPassage(b) && b.anchor.exact === key; });
    var ids = {}; out.forEach(function (b) { ids[b.id] = 1; });
    var grew = true;
    while (grew) {
      grew = false;
      blabs.forEach(function (b) { if (b.parentId && ids[b.parentId] && !ids[b.id]) { ids[b.id] = 1; out.push(b); grew = true; } });
    }
    return out;
  }

  /* Highlight the passages inside comments that other people blabbed on */
  function markCommentText(container, list) {
    var groups = {};
    list.forEach(function (b) {
      if (!b.anchor || b.anchor.type !== 'blab-text') return;
      var k = b.anchor.blabId + '\u0000' + b.anchor.exact;
      (groups[k] = groups[k] || []).push(b);
    });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k], a = g[0].anchor;
      var body = container.querySelector('.m28-body[data-blab-id="' + CSS.escape(a.blabId) + '"]');
      if (!body) return;
      var range = findRange(body, a);
      if (!range || range.startContainer !== range.endContainer) return;
      var m = document.createElement('mark'); m.className = 'm28-hl';
      try { range.surroundContents(m); } catch (e) { return; }
      var badge = document.createElement('button');
      badge.type = 'button'; badge.className = 'm28-badge';
      badge.setAttribute('data-count', g.length); badge.setAttribute('aria-label', g.length + ' blabs');
      m.after(badge);
      function jump() {
        var target = container.querySelector('.m28-blab[data-id="' + CSS.escape(g[0].id) + '"]');
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.classList.add('m28-flash'); setTimeout(function () { target.classList.remove('m28-flash'); }, 1600); }
      }
      m.addEventListener('click', jump); badge.addEventListener('click', jump);
    });
  }

  /* ---------- highlights ---------- */
  function clearHighlights() {
    policy.querySelectorAll('.m28-badge').forEach(function (b) { b.remove(); });
    policy.querySelectorAll('mark.m28-hl').forEach(function (m) {
      var p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m);
    });
    policy.normalize();
  }

  function paintHighlights() {
    clearHighlights();
    var groups = {};
    blabs.forEach(function (b) { if (b.sectionId === SECTION && isPassage(b)) (groups[b.anchor.exact] = groups[b.anchor.exact] || []).push(b); });
    Object.keys(groups).forEach(function (key) {
      var range = findRange(policy, groups[key][0].anchor);
      if (!range) return;
      var marks = [];
      /* Wrap each text node in the range separately so highlights can span paragraphs */
      var walker = document.createTreeWalker(range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer, NodeFilter.SHOW_TEXT, null, false);
      var texts = [], t;
      while ((t = walker.nextNode())) if (range.intersectsNode(t)) texts.push(t);
      texts.forEach(function (node) {
        var st = node === range.startContainer ? range.startOffset : 0;
        var en = node === range.endContainer ? range.endOffset : node.textContent.length;
        if (en <= st) return;
        var target = node;
        if (en < target.textContent.length) target.splitText(en);
        if (st > 0) target = target.splitText(st);
        var m = document.createElement('mark'); m.className = 'm28-hl'; m.setAttribute('data-key', key);
        target.parentNode.insertBefore(m, target); m.appendChild(target);
        m.addEventListener('click', function (e) { e.stopPropagation(); openThread(key); });
        marks.push(m);
      });
      if (!marks.length) return;
      var total = threadFor(key).length;
      var badge = document.createElement('button');
      badge.className = 'm28-badge'; badge.type = 'button';
      badge.setAttribute('data-count', total); badge.setAttribute('aria-label', total + ' blabs'); badge.title = total + (total === 1 ? ' blab' : ' blabs');
      badge.addEventListener('click', function (e) { e.stopPropagation(); openThread(key); });
      marks[marks.length - 1].after(badge);
    });
  }

  /* ---------- the form (shared by new blabs and replies) ---------- */
  function formHtml(withStances) {
    return '<form class="m28-form">' +
      '<div class="m28-as">Posting as <strong>' + esc(myName()) + '</strong>' + (isMember() ? ' \u2713' : ' &middot; <button type="button" class="m28-link" data-signin>Sign in</button>') + '</div>' +
      (withStances ? '<div class="m28-stances">' + STANCES.map(function (s, i) {
        return '<label><input type="radio" name="stance" value="' + s[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + s[1] + '</label>';
      }).join('') + '</div>' : '') +
      '<textarea class="m28-text" placeholder="Your take..." maxlength="5000" required></textarea>' +
      '<button class="m28-post" type="submit">Post</button></form>';
  }

  function wireForm(form, build) {
    var si = form.querySelector('[data-signin]'); if (si) si.addEventListener('click', signIn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = form.querySelector('.m28-text').value.trim();
      if (!text || !me) return;
      var st = form.querySelector('input[name="stance"]:checked');
      var data = build({ text: text, stance: st ? st.value : 'context' });
      var btn = form.querySelector('.m28-post'); btn.disabled = true; btn.textContent = 'Posting...';
      db.collection('blabs').doc(data.id).set(data).then(function () {
        notify(data);
        form.querySelector('.m28-text').value = '';
        btn.disabled = false; btn.textContent = 'Post';
        var slot = form.closest('.m28-reply-slot');
        if (slot) slot.innerHTML = '';
        refresh();
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Post failed, try again';
      });
    });
  }

  /* Email the site owner about every new blab (FormSubmit relay, no server or password) */
  var NOTIFY_URL = 'https://formsubmit.co/ajax/dkarr@mac.com';
  var POLICY_TITLE = policy.getAttribute('data-title') || document.title;
  function notify(d) {
    if (/_test$/.test(DOC_KEY)) return;
    var link = location.origin + location.pathname + '#blab=' + encodeURIComponent(d.id);
    var where = d.anchor && d.anchor.exact
      ? (d.anchor.type === 'blab-text' ? 'Replying to part of a comment: "' : 'On the passage: "') + d.anchor.exact + '"'
      : (d.parentId ? 'A reply in the discussion' : 'In General discussion');
    try {
      fetch(NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: 'New blab on Flux Tax: ' + POLICY_TITLE,
          _template: 'table',
          _captcha: 'false',
          From: d.name + (d.signedIn ? ' (signed in)' : ''),
          Stance: stanceLabel(d.stance),
          Where: where,
          Blab: d.text,
          Link: link
        })
      }).catch(function () {});
    } catch (e) {}
  }

  function blabDoc(sectionId, f, extra) {
    var d = { docKey: DOC_KEY, sectionId: sectionId, id: newId(), name: myName(), signedIn: isMember(), createdByUid: me.uid,
      stance: f.stance, text: f.text, timestamp: Date.now() };
    for (var k in extra) d[k] = extra[k];
    return d;
  }

  /* ---------- thread rendering ---------- */
  function renderNodes(list, parentId, depth) {
    return list.filter(function (b) { return (b.parentId || null) === parentId; })
      .sort(function (a, b) { return a.timestamp - b.timestamp; })
      .map(function (b) {
        var lbl = stanceLabel(b.stance);
        var q = b.anchor && b.anchor.type === 'blab-text' ? '<div class="m28-onquote">on \u201C' + esc(b.anchor.exact) + '\u201D</div>' : '';
        return '<div class="m28-blab" data-id="' + esc(b.id) + '" style="margin-left:' + Math.min(depth, 4) * 14 + 'px">' +
          '<div class="m28-meta"><strong>' + esc(b.name) + '</strong>' + (b.signedIn ? ' <span class="m28-ok" title="Signed-in account">\u2713</span>' : '') + (lbl && !parentId ? ' <span class="m28-stance m28-' + esc(b.stance) + '">' + lbl + '</span>' : '') +
          ' <span class="m28-when">' + when(b.timestamp) + (b.edited && !b.deleted ? ' &middot; edited' : '') + '</span></div>' +
          q + (b.deleted ? '<div class="m28-body m28-deleted">Removed by the author.</div>' :
            '<div class="m28-body" data-blab-id="' + esc(b.id) + '">' + esc(b.text).replace(/\n/g, '<br>') + '</div>') +
          '<button class="m28-reply" type="button" data-id="' + esc(b.id) + '">Reply</button>' +
          (mine(b) ? ' <button class="m28-reply m28-edit" type="button" data-id="' + esc(b.id) + '">Edit</button> <button class="m28-reply m28-del" type="button" data-id="' + esc(b.id) + '">Remove</button>' : '') +
          '<div class="m28-reply-slot"></div></div>' + renderNodes(list, b.id, depth + 1);
      }).join('');
  }

  function mine(b) { return isMember() && !b.deleted && b.createdByUid === me.uid; }

  function wireOwn(container) {
    container.querySelectorAll('.m28-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var b = byId(btn.getAttribute('data-id')); if (!b) return;
        var slot = btn.parentNode.querySelector('.m28-reply-slot');
        slot.innerHTML = '<form class="m28-form"><textarea class="m28-text" maxlength="5000"></textarea><div><button class="m28-post" type="submit">Save</button> <button type="button" class="m28-link" data-cancel>Cancel</button></div></form>';
        var ta = slot.querySelector('textarea'); ta.value = b.text; ta.focus();
        slot.querySelector('[data-cancel]').addEventListener('click', function () { slot.innerHTML = ''; refresh(); });
        slot.querySelector('form').addEventListener('submit', function (e) {
          e.preventDefault();
          var t = ta.value.trim(); if (!t) return;
          db.collection('blabs').doc(b.id).update({ text: t, edited: Date.now() }).then(function () { slot.innerHTML = ''; refresh(); });
        });
      });
    });
    container.querySelectorAll('.m28-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slot = btn.parentNode.querySelector('.m28-reply-slot');
        slot.innerHTML = '<form class="m28-form"><div>Remove this blab? <button class="m28-post" type="submit">Yes, remove</button> <button type="button" class="m28-link" data-cancel>Keep it</button></div></form>';
        slot.querySelector('[data-cancel]').addEventListener('click', function () { slot.innerHTML = ''; refresh(); });
        slot.querySelector('form').addEventListener('submit', function (e) {
          e.preventDefault();
          db.collection('blabs').doc(btn.getAttribute('data-id')).update({ text: '', deleted: true, edited: Date.now() }).then(function () { slot.innerHTML = ''; refresh(); });
        });
      });
    });
  }

  function wireReplies(container, list, sectionId, anchor) {
    wireOwn(container);
    container.querySelectorAll('.m28-reply:not(.m28-edit):not(.m28-del)').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slot = btn.nextElementSibling;
        if (slot.innerHTML) { slot.innerHTML = ''; return; }
        slot.innerHTML = formHtml(false);
        var parent = btn.getAttribute('data-id');
        wireForm(slot.querySelector('form'), function (f) {
          return blabDoc(sectionId, f, { parentId: parent });
        });
        slot.querySelector('.m28-text').focus();
      });
    });
  }

  /* ---------- panel ---------- */
  var panel = document.createElement('div');
  panel.className = 'm28-panel';
  panel.innerHTML = '<div class="m28-panel-head"><span>Discussion</span><button type="button" class="m28-close" aria-label="Close">&times;</button></div><div class="m28-panel-body"></div>';
  document.body.appendChild(panel);
  var panelBody = panel.querySelector('.m28-panel-body');
  var openKey = null, pendingAnchor = null;
  panel.querySelector('.m28-close').addEventListener('click', closePanel);
  function closePanel() { panel.classList.remove('open'); openKey = null; pendingAnchor = null; }

  function openThread(key) {
    openKey = key; pendingAnchor = null;
    var list = threadFor(key);
    var anchor = null;
    list.forEach(function (b) { if (!anchor && isPassage(b)) anchor = b.anchor; });
    panelBody.innerHTML = '<blockquote class="m28-quote">\u201C' + esc(key) + '\u201D</blockquote>' +
      '<div class="m28-thread">' + renderNodes(list, null, 0) + '</div>' +
      '<div class="m28-new"><div class="m28-new-label">Add your take on this passage</div>' + formHtml(true) + '</div>';
    wireReplies(panelBody, list, SECTION, null);
    markCommentText(panelBody, list);
    wireForm(panelBody.querySelector('.m28-new form'), function (f) { return blabDoc(SECTION, f, { anchor: anchor }); });
    panel.classList.add('open');
  }

  function openNew(anchor) {
    if (anchor.type === 'blab-text') return openOnComment(anchor);
    var existing = blabs.some(function (b) { return isPassage(b) && b.anchor.exact === anchor.exact; });
    if (existing) return openThread(anchor.exact);
    openKey = null; pendingAnchor = anchor;
    panelBody.innerHTML = '<blockquote class="m28-quote">“' + esc(anchor.exact) + '”</blockquote>' +
      '<div class="m28-new"><div class="m28-new-label">Be the first to weigh in on this</div>' + formHtml(true) + '</div>';
    wireForm(panelBody.querySelector('form'), function (f) { openKey = anchor.exact; pendingAnchor = null; return blabDoc(SECTION, f, { anchor: anchor }); });
    panel.classList.add('open');
    panelBody.querySelector('.m28-text').focus();
  }

  function openOnComment(anchor) {
    var parent = byId(anchor.blabId);
    if (!parent) return;
    var returnKey = openKey;
    openKey = null;
    panelBody.innerHTML = '<div class="m28-new-label">Replying to ' + esc(parent.name) + ' about</div>' +
      '<blockquote class="m28-quote">\u201C' + esc(anchor.exact) + '\u201D</blockquote>' + formHtml(false);
    wireForm(panelBody.querySelector('form'), function (f) {
      if (returnKey) openKey = returnKey; else setTimeout(closePanel, 400);
      return blabDoc(parent.sectionId, f, { anchor: anchor, parentId: parent.id });
    });
    panel.classList.add('open');
    panelBody.querySelector('.m28-text').focus();
  }

  /* ---------- selection -> "Blab this" button ---------- */
  var blabBtn = document.createElement('button');
  blabBtn.type = 'button'; blabBtn.className = 'm28-blab-btn';
  blabBtn.textContent = '💬 Blab on this';
  document.body.appendChild(blabBtn);
  var currentAnchor = null;
  function checkSelection() {
    currentAnchor = selectionAnchor();
    blabBtn.classList.toggle('show', !!currentAnchor);
  }
  document.addEventListener('selectionchange', function () { clearTimeout(checkSelection.t); checkSelection.t = setTimeout(checkSelection, 150); });
  blabBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  blabBtn.addEventListener('click', function () {
    if (!currentAnchor) return;
    var a = currentAnchor;
    window.getSelection().removeAllRanges();
    blabBtn.classList.remove('show');
    openNew(a);
  });

  /* ---------- general (unanchored) discussion ---------- */
  var general = document.getElementById('general-discussion');
  function renderGeneral() {
    if (!general) return;
    var list = blabs.filter(function (b) { return b.sectionId === GENERAL; });
    var draft = general.querySelector('.m28-gen-form .m28-text');
    var keep = draft ? draft.value : '';
    general.innerHTML = '<h2>General discussion</h2>' +
      '<p class="m28-hint-sm">Not into highlighting? Just leave a comment here. You can also highlight words in anyone\'s comment to reply to that exact part.</p>' +
      '<div class="m28-gen-form">' + formHtml(true) + '</div>' +
      '<div class="m28-thread">' + (list.length ? renderNodes(list, null, 0) : '<p class="m28-empty">No comments yet. Start it off.</p>') + '</div>';
    if (keep) general.querySelector('.m28-gen-form .m28-text').value = keep;
    wireForm(general.querySelector('.m28-gen-form form'), function (f) { return blabDoc(GENERAL, f, {}); });
    wireReplies(general, list, GENERAL, null);
    markCommentText(general, list);
  }

  /* ---------- live data ---------- */
  db.collection('blabs').where('docKey', '==', DOC_KEY).onSnapshot(function (snap) {
    blabs = [];
    snap.forEach(function (d) { blabs.push(d.data()); });
    refresh();
    if (!deepLinked) { deepLinked = true; openFromLink(); }
  });

  /* Email links land on page.html#blab=<id>: open that blab and flash it */
  var deepLinked = false;
  function openFromLink() {
    var m = /[#&]blab=([^&]+)/.exec(location.hash);
    if (!m) return;
    var b = byId(decodeURIComponent(m[1]));
    if (!b) return;
    var root = b, guard = 0;
    while (root.parentId && byId(root.parentId) && guard++ < 50) root = byId(root.parentId);
    function flash(container) {
      var el = container.querySelector('.m28-blab[data-id="' + CSS.escape(b.id) + '"]');
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('m28-flash'); setTimeout(function () { el.classList.remove('m28-flash'); }, 2500);
    }
    if (root.sectionId === SECTION && isPassage(root)) {
      openThread(root.anchor.exact);
      var hl = [].filter.call(policy.querySelectorAll('mark.m28-hl'), function (mk) { return mk.getAttribute('data-key') === root.anchor.exact; })[0];
      if (hl) hl.scrollIntoView({ block: 'center' });
      setTimeout(function () { flash(panelBody); }, 300);
    } else if (general) {
      setTimeout(function () { flash(general); }, 300);
    }
  }

  function typing(el) {
    var t = el.querySelectorAll('textarea'), i;
    for (i = 0; i < t.length; i++) if (t[i].value.trim()) return true;
    return false;
  }

  /* Re-render, but never wipe a reply someone is in the middle of typing */
  function refresh(force) {
    paintHighlights();
    if (!general || force || !general.querySelector('.m28-reply-slot form')) renderGeneral();
    var count = document.getElementById('m28-count');
    if (count) count.textContent = blabs.length ? blabs.length + (blabs.length === 1 ? ' blab so far.' : ' blabs so far.') : '';
    if (openKey && panel.classList.contains('open') && (force || (!panel.querySelector('.m28-reply-slot form') && !typing(panel)))) openThread(openKey);
  }
  renderGeneral();
})();
