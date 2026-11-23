/* Kaur Care: branded PDF export for the appointment brief and letters.
   Runs entirely in the browser. Nothing the person types is sent to a server.
   Palette and type follow DESIGN.md (Kaur Care): sage, terracotta, linen; Fraunces + Plus Jakarta Sans. */
(function () {
  var JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var FONTS = {
    serif: { file: '/fonts/Fraunces-SemiBold.ttf', name: 'Fraunces', style: 'normal' },
    sans: { file: '/fonts/PlusJakartaSans-Regular.ttf', name: 'PlusJakartaSans', style: 'normal' },
    bold: { file: '/fonts/PlusJakartaSans-Bold.ttf', name: 'PlusJakartaSans', style: 'bold' }
  };
  var C = {
    sage: [45, 90, 71], terra: [200, 122, 90], ink: [58, 64, 58], muted: [107, 98, 86],
    sand: [232, 224, 213], rule: [240, 235, 227], mint: [237, 243, 239], blush: [251, 243, 238], rust: [138, 75, 50]
  };
  var PT = 0.3528; // millimetres per point
  var cache = { jspdf: null, fonts: null, emblem: undefined };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.jspdf && window.jspdf.jsPDF) return resolve();
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Could not load the PDF library.')); };
      document.head.appendChild(s);
    });
  }
  function toBase64(buf) {
    var bytes = new Uint8Array(buf), bin = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  }
  function loadFonts() {
    if (cache.fonts) return cache.fonts;
    cache.fonts = Promise.all(Object.keys(FONTS).map(function (k) {
      return fetch(FONTS[k].file).then(function (r) {
        if (!r.ok) throw new Error('font');
        return r.arrayBuffer();
      }).then(function (b) { return [k, toBase64(b)]; });
    })).then(function (pairs) { var o = {}; pairs.forEach(function (p) { o[p[0]] = p[1]; }); return o; });
    cache.fonts.catch(function () { cache.fonts = null; });
    return cache.fonts;
  }
  function loadEmblem() {
    if (cache.emblem !== undefined) return Promise.resolve(cache.emblem);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          cache.emblem = { data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight };
        } catch (e) { cache.emblem = null; }
        resolve(cache.emblem);
      };
      img.onerror = function () { cache.emblem = null; resolve(null); };
      img.src = '/logo-emblem.png';
    });
  }
  function ready() {
    return Promise.all([loadScript(JSPDF_SRC), loadFonts(), loadEmblem()]).then(function (r) { return { fonts: r[1], emblem: r[2] }; });
  }
  function newDoc(assets) {
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    Object.keys(FONTS).forEach(function (k) {
      var f = FONTS[k], file = f.name + '-' + f.style + '.ttf';
      doc.addFileToVFS(file, assets.fonts[k]);
      doc.addFont(file, f.name, f.style, undefined, 'Identity-H');
    });
    return doc;
  }
  // Keep only characters the embedded fonts can draw.
  function clean(s) {
    return String(s == null ? '' : s)
      .replace(/\r/g, '').replace(/\u00ad/g, '').replace(/[\u2028\u2029]/g, '\n')
      .replace(/[^\n -~\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026]/g, '');
  }
  function setFont(doc, kind, size, color) {
    var f = FONTS[kind];
    doc.setFont(f.name, f.style); doc.setFontSize(size);
    if (color) doc.setTextColor(color[0], color[1], color[2]);
  }
  function wrap(doc, text, width) { return doc.splitTextToSize(text, width); }
  function today() { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function save(doc, name) { doc.save(name.replace(/\.pdf$/i, '') + '.pdf'); }

  /* ---------- Appointment brief: one A4 page, scaled to fit ---------- */
  function drawBrief(doc, m, opener, assets, sc) {
    var W = 210, H = 297, M = 18, CW = W - 2 * M, LIMIT = H - 24, y = 0;
    var body = 9.6 * sc, lh = body * PT * 1.5, labelW = 49, pad = 2 * sc;

    function footer() {
      var n = doc.getNumberOfPages();
      for (var p = 1; p <= n; p++) {
        doc.setPage(p);
        doc.setDrawColor.apply(doc, C.sand); doc.setLineWidth(0.25); doc.line(M, H - 17, W - M, H - 17);
        setFont(doc, 'sans', 7, C.muted);
        var note = wrap(doc, 'My own summary to help the appointment. It is not a diagnosis. For an emergency call 999; for urgent advice call NHS 111.', CW);
        doc.text(note, M, H - 13);
        setFont(doc, 'bold', 7, C.sage);
        doc.text('Prepared with Kaur Care  |  kaurcare.com', W - M, H - 13 + note.length * 3, { align: 'right' });
      }
    }
    function header(first) {
      var top = 14;
      if (assets.emblem) {
        var eh = 11, ew = eh * assets.emblem.w / assets.emblem.h;
        doc.addImage(assets.emblem.data, 'PNG', M, top - 3, ew, eh);
        setFont(doc, 'serif', 17, C.sage); doc.text('Kaur Care', M + ew + 3, top + 4.2);
      } else { setFont(doc, 'serif', 17, C.sage); doc.text('Kaur Care', M, top + 4.2); }
      setFont(doc, 'bold', 7.5, C.terra); doc.setCharSpace(0.45);
      doc.text('1-PAGE APPOINTMENT BRIEF', W - M, top + 1.2, { align: 'right' });
      doc.setCharSpace(0);
      setFont(doc, 'sans', 8, C.muted); doc.text(today(), W - M, top + 5.6, { align: 'right' });
      doc.setDrawColor.apply(doc, C.sage); doc.setLineWidth(0.5); doc.line(M, top + 11, W - M, top + 11);
      y = top + 19;
      if (first) {
        var who = m.who === 'me' ? 'For: myself' : (m.who === 'child' ? 'For: my child' : 'For: someone I care for');
        var bits = []; if (m.name) bits.push(clean(m.name)); if (m.age) bits.push('age ' + clean(m.age));
        setFont(doc, 'serif', 21 * sc, C.sage); doc.text('Appointment brief', M, y);
        y += 6.2 * sc;
        setFont(doc, 'sans', 9.5 * sc, C.muted); doc.text(who + (bits.length ? '  (' + bits.join(', ') + ')' : ''), M, y);
        y += 6.5 * sc;
      }
    }
    function room(h) { if (y + h > LIMIT) { doc.addPage(); header(false); } }
    function eyebrow(text, x, yy, color) {
      setFont(doc, 'bold', 7 * sc, color || C.terra); doc.setCharSpace(0.35);
      doc.text(text.toUpperCase(), x, yy); doc.setCharSpace(0);
    }
    function row(label, value) {
      value = clean(value).trim(); if (!value) return;
      setFont(doc, 'sans', body);
      var lines = wrap(doc, value, CW - labelW - 2);
      var h = Math.max(lines.length * lh, 4) + pad * 2;
      room(h);
      eyebrow(label, M, y + pad + 2.4 * sc);
      setFont(doc, 'sans', body, C.ink);
      doc.text(lines, M + labelW, y + pad + body * PT * 0.95);
      y += h;
      doc.setDrawColor.apply(doc, C.rule); doc.setLineWidth(0.25); doc.line(M, y, W - M, y);
    }

    header(true);

    // Opener
    setFont(doc, 'sans', body * 1.04);
    var oLines = wrap(doc, '\u201c' + clean(opener) + '\u201d', CW - 12);
    var oh = oLines.length * lh * 1.04 + 10.5 * sc;
    room(oh);
    doc.setFillColor.apply(doc, C.mint); doc.roundedRect(M, y, CW, oh, 2.2, 2.2, 'F');
    eyebrow('My 30-second opener', M + 6, y + 5.6 * sc, C.sage);
    setFont(doc, 'sans', body * 1.04, C.ink);
    doc.text(oLines, M + 6, y + 11 * sc + 0.6);
    y += oh + 4;

    row('Situation', (m.concern || '') + (m.duration ? ' (for ' + m.duration + ')' : ''));
    row('Pattern and triggers', m.pattern);
    row('Already tried', m.tried);
    row('Medicines and allergies', m.meds);
    row('Severity at worst', m.sev + ' out of 10');
    row('It affects', (m.chips || []).join(', '));
    row('In my words', m.impact);
    row('Biggest worry', m.worry);
    if (m.log && m.log.length) row('Recent symptom log', m.log.map(function (e) { return clean(e.date) + ': ' + clean(e.note); }).join('\n'));
    row('Hoping for', m.ask);

    // Questions
    var qs = (m.questions || []).map(clean).filter(Boolean);
    if (qs.length) {
      y += 4 * sc; room(10);
      eyebrow('My questions', M, y);
      y += 3.2 * sc;
      qs.forEach(function (q, i) {
        setFont(doc, 'sans', body);
        var ql = wrap(doc, q, CW - 8);
        room(ql.length * lh + 1.2);
        setFont(doc, 'bold', body, C.terra); doc.text(String(i + 1) + '.', M, y + lh * 0.78);
        setFont(doc, 'sans', body, C.ink); doc.text(ql, M + 6, y + lh * 0.78);
        y += ql.length * lh + 0.8;
      });
    }

    // Before I leave
    var asks = ['What is the plan, and who is doing what?', 'When is my follow-up?',
      'What would mean I should come back, call 111 or call 999 sooner?', 'Can my concerns and the plan be written in my notes?'];
    var bh = (asks.length * lh) + 12 * sc;
    y += 4 * sc; room(bh);
    doc.setFillColor.apply(doc, C.blush); doc.roundedRect(M, y, CW, bh, 2.2, 2.2, 'F');
    eyebrow('Before I leave, I will ask', M + 6, y + 5.6 * sc, C.rust);
    var ay = y + 11 * sc;
    asks.forEach(function (a) {
      doc.setDrawColor.apply(doc, C.sage); doc.setLineWidth(0.3); doc.roundedRect(M + 6, ay - 2.5, 2.9, 2.9, 0.4, 0.4, 'S');
      setFont(doc, 'sans', body, C.ink); doc.text(a, M + 12, ay);
      ay += lh;
    });
    y += bh;
    footer();
    return doc.getNumberOfPages();
  }

  function briefPdf(m, opener) {
    return ready().then(function (assets) {
      var sc = 1.14, doc;
      for (var i = 0; i < 14; i++) {
        doc = newDoc(assets);
        if (drawBrief(doc, m, opener, assets, sc) === 1) break;
        sc -= 0.04;
        if (sc < 0.78) { doc = newDoc(assets); drawBrief(doc, m, opener, assets, 0.78); break; }
      }
      save(doc, 'kaur-care-appointment-brief');
    });
  }

  /* ---------- Letters: a proper letter, generated from the letter text ---------- */
  function letterPdf(text, filename) {
    return ready().then(function (assets) {
      var doc = newDoc(assets);
      var W = 210, H = 297, M = 24, CW = W - 2 * M, size = 10.4, lh = size * PT * 1.55, y = 26, inFooter = false;
      // Thin sage and terracotta rule across the top of every page
      function topRule() {
        doc.setFillColor.apply(doc, C.sage); doc.rect(0, 0, W, 2.2, 'F');
        doc.setFillColor.apply(doc, C.terra); doc.rect(0, 2.2, 38, 0.8, 'F');
      }
      function newPage() { doc.addPage(); topRule(); y = 26; }
      function room(h) { if (y + h > H - 26) newPage(); }
      topRule();
      var lines = clean(text).split('\n');
      var first = true;
      lines.forEach(function (raw) {
        if (raw.trim() === '---') { inFooter = true; room(14); y += 4; doc.setDrawColor.apply(doc, C.sand); doc.setLineWidth(0.25); doc.line(M, y, W - M, y); y += 5; return; }
        if (raw.trim() === '') { y += lh * 0.55; return; }
        var m, indent = 0, kind = 'sans', col = C.ink, sz = size, txt = raw, marker = null;
        if (inFooter) { kind = 'sans'; col = C.muted; sz = 8; }
        else if ((m = raw.match(/^\s+(\d+)\.\s+(.*)$/))) { indent = 8; marker = m[1] + '.'; txt = m[2]; }
        else if ((m = raw.match(/^\s+-\s+(.*)$/))) { indent = 8; marker = '\u2022'; txt = m[1]; }
        else if (/^\s{2,}\S/.test(raw)) { indent = 8; txt = raw.trim(); }
        else if (/^Subject:/.test(raw)) { kind = 'serif'; col = C.sage; sz = 13.2; txt = raw.replace(/^Subject:\s*/, ''); }
        else if (/^(Patient|DOB|Contact|NHS area):/.test(raw)) { col = C.ink; }
        else if (/^(To|Dear|Yours)/.test(raw) || first) { /* normal */ }
        var isDate = first; first = false;
        if (isDate) { kind = 'bold'; col = C.sage; sz = 9.5; }
        setFont(doc, kind, sz, col);
        var w = CW - indent;
        var wl = wrap(doc, txt, w);
        var h = wl.length * sz * PT * 1.55;
        room(h);
        if (marker) { setFont(doc, 'bold', sz, C.terra); doc.text(marker, M + indent - 5.5, y + sz * PT * 1.0); setFont(doc, kind, sz, col); }
        doc.text(wl, M + indent, y + sz * PT * 1.0, { lineHeightFactor: 1.55 });
        y += h;
        if (kind === 'serif') y += 1.5;
      });
      // Page numbers if more than one page
      var n = doc.getNumberOfPages();
      if (n > 1) for (var p = 1; p <= n; p++) { doc.setPage(p); setFont(doc, 'sans', 8, C.muted); doc.text('Page ' + p + ' of ' + n, W - M, H - 12, { align: 'right' }); }
      save(doc, filename);
    });
  }

  window.kcPdf = {
    brief: briefPdf,
    letter: letterPdf,
    _clean: clean
  };
})();
