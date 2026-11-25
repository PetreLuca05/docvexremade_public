// The public pages' behaviour, ported 1:1 from the DocVex Website design: the slideshows and parallax, the scroll-driven
// Parcurs and Funcții vedetă sections, the Funcții player, the closing animation, the download page, the roadmap, and the
// account pages, which here work with the real accounts (Supabase), payments (Stripe) and installers (GitHub releases).
import { AUTH_EVENT, authConfigured, authHref, authRedirect, checkoutUrl, getSupabase, nextPage, recordDownload, storedUser } from '../auth.js'
import { track, trackThen } from '../analytics.js'
import downloads from 'virtual:latest-downloads'
import { initPortal } from './account.js'

var Gavel = { ok: false }
;(function () {
  var sites = [].slice.call(document.querySelectorAll('.site')), tabs = [].slice.call(document.querySelectorAll('.switch button'))
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, active = null, started = {}
  function clamp(x) { return Math.min(1, Math.max(0, x)) }
  function ease(t) { return t * t * (3 - 2 * t) }

  /* word-by-word reveal */
  document.querySelectorAll('.reveal').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/); el.textContent = ''
    words.forEach(function (w, i) { var s = document.createElement('span'); s.textContent = w; el.appendChild(s); if (i < words.length - 1) el.appendChild(document.createTextNode(' ')) })
  })
  function onScroll() {
    if (!active) return
    var vh = innerHeight
    active.querySelectorAll('.reveal').forEach(function (el) {
      var sp = el.children, r = el.getBoundingClientRect(), q = clamp((vh * 0.9 - r.top) / (vh * 0.5)), n = reduced ? sp.length : Math.round(q * sp.length)
      for (var i = 0; i < sp.length; i++) sp[i].classList.toggle('lit', i < n)
    })
  }
  function navState() { document.querySelectorAll('.nav').forEach(function (n) { n.classList.toggle('scrolled', scrollY > 24) }) }
  addEventListener('scroll', navState, { passive: true }); navState()
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll)

  /* stills */
  var shots = [
    { id: 'desk', w: 2000, h: 820, p: [1.2, 2.3, 9.6], t: [-1.3, 0.55, 0.4], fov: 26 },
    { id: 'strike', w: 1800, h: 900, p: [0.6, 2.6, 12.5], t: [-1.3, 1.75, 0], fov: 28, k: 1 },
    { id: 'close', w: 900, h: 1035, p: [2.6, 1.9, 4.6], t: [0.15, 0.95, 0], fov: 30 },
    { id: 'paper', w: 900, h: 700, p: [-2.9, 4.6, 5.4], t: [-2.3, 0, 1.5], fov: 34 },
    { id: 'handle', w: 900, h: 700, p: [-4.6, 1.5, 3.4], t: [-1.9, 0.75, 0], fov: 30 },
    { id: 'block', w: 900, h: 700, p: [2.4, 2.6, 3.6], t: [0.1, 0.5, 0], fov: 32 }
  ]
  var stillsDone = false
  function stills() {
    if (stillsDone || !Gavel.ok) return; stillsDone = true
    setTimeout(function () {
      var urls = Gavel.stills(shots); if (!urls) return
      document.querySelectorAll('.ph[data-shot]').forEach(function (el) { el.style.backgroundImage = 'url(' + urls[el.dataset.shot] + ')' })
    }, 60)
  }

  /* live heroes */
  function start(site) {
    if (started[site.id]) return; started[site.id] = true
    var canvas = site.querySelector('canvas.gl'); if (!canvas) return
    var dark = canvas.dataset.mode === 'dark', kind = canvas.dataset.pose, scene = site.querySelector('.scene'), stage = canvas.parentElement, cur = 0, lt = 0
    var api = Gavel.ok && Gavel.live(canvas, dark, dark ? (kind === 'rise' ? 1.0 : 0.82) : 1.05, function (g, t) {
      var dt = Math.min(0.25, t - lt); lt = t
      var k = Math.min(1, g.w / g.h / 1.3), idle = g.reduced ? 0 : 1
      if (kind === 'rise') {
        var r = scene.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, r.height - innerHeight))
        cur += (p - cur) * (g.reduced ? 1 : 1 - Math.exp(-dt * 5))
        var e = ease(cur), s = (1.2 + e * 0.62) * (0.66 + 0.34 * k)
        stage.style.setProperty('--fade', (14 + e * 50) + '%')
        g.gavel.scale.setScalar(s)
        g.gavel.position.set(Math.sin(t * 0.5) * 0.04 * idle, -2.4 + e * 3.5 + Math.sin(t * 0.8) * 0.04 * idle, 0)
        g.gavel.rotation.set(0.12 + e * 0.1, -0.55 + e * 1.3 + Math.sin(t * 0.35) * 0.08 * idle, 0.13 - e * 0.05)
      } else {
        var hr = site.querySelector('.th').getBoundingClientRect(), q = clamp(-hr.top / Math.max(1, hr.height))
        cur += (q - cur) * (g.reduced ? 1 : 1 - Math.exp(-dt * 5))
        g.gavel.scale.setScalar(1.55 * (0.7 + 0.3 * k))
        g.gavel.position.set(0.4 + 2.5 * k, 1.75 + cur * 1.2 + Math.sin(t * 0.7) * 0.05 * idle, 0)
        g.gavel.rotation.set(0.2, -0.75 + cur * 0.5 + Math.sin(t * 0.3) * 0.1 * idle, -0.5 - cur * 0.15)
      }
    })
    if (!api) site.classList.add('no3d')
  }

  function show(n, keepScroll) {
    var site = typeof n === 'number' ? (sites[n - 1] || sites[0]) : n; if (!site) return
    sites.forEach(function (s) { s.classList.toggle('on', s === site) })
    tabs.forEach(function (b, i) { b.setAttribute('aria-pressed', i === n - 1 ? 'true' : 'false') })
    active = site; document.documentElement.lang = 'ro'
    if (!keepScroll) scrollTo(0, 0)
    start(site); stills(); onScroll()
  }
  /* One page per address (index.html, instalare.html, preturi.html, ...): each holds a single .site, already on. */
  function fromHash() { return sites[0] }
  /* The home page's sections are marked with data-anchor, not ids: an address like /#faq (a link from another page) scrolls there */
  function toAnchor(smooth) {
    var h = decodeURIComponent(location.hash.slice(1)), t = h && active && active.querySelector('[data-anchor="' + h.replace(/"/g, '') + '"]')
    if (t) t.scrollIntoView({ behavior: smooth && !reduced ? 'smooth' : 'auto', block: 'start' })
  }
  addEventListener('hashchange', function () { toAnchor(true) })
  if (location.hash.length > 1) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    /* once now, then again as the fonts and pictures settle the sections above it */
    requestAnimationFrame(function () { toAnchor(false) })
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { toAnchor(false) })
    addEventListener('load', function () { toAnchor(false); setTimeout(function () { if (scrollY > 0) toAnchor(false) }, 400) })
  }
  /* in-page navigation, filters, contact form */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-go]')
    if (a) {
      var sel = '[data-anchor="' + a.dataset.go + '"]', t = active.querySelector(sel)
      /* a home-page section clicked on another page: the link's own address (/#section) opens the home page there */
      if (!t) return
      e.preventDefault()
      if (a.dataset.go !== 'top') t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); else scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      return
    }
    var f = e.target.closest('.filters button')
    if (f) {
      var box = f.closest('.cases'), tag = f.dataset.f
      box.querySelectorAll('.filters button').forEach(function (b) { b.setAttribute('aria-pressed', b === f ? 'true' : 'false') })
      box.querySelectorAll('.clist li').forEach(function (li) { li.hidden = tag !== 'all' && li.dataset.f !== tag })
    }
  })
  document.querySelectorAll('form.form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var d = new FormData(form), out = form.querySelector('output')
      var href = 'mailto:support@docvex.ro?subject=' + encodeURIComponent('Mesaj de la ' + (d.get('nume') || 'un vizitator')) + '&body=' + encodeURIComponent((d.get('mesaj') || '') + '\n\n' + (d.get('nume') || '') + '\n' + (d.get('email') || ''))
      out.innerHTML = 'Mesajul este pregătit. Trimiteți-l din aplicația dumneavoastră de e-mail la <a href="' + href + '">support@docvex.ro</a>.'
    })
  })
  /* hero slideshow: the next photo fades in over the current one every 6 s; paused while the tab is hidden */
  /* The hero, the "why" panel and the quotes band draw on the same set of pictures. Each slideshow picks its next picture at random
     from those that no other slideshow is showing or about to show, and not from its own last few, so two places never show the same
     picture and the order differs on every visit. */
  var Pics = { cur: {}, res: {}, past: {},
    key: function (n) { n = n.replace(/^.*\//, '').replace(/\.jpg$/, '').replace(/^why-/, ''); return n === 'library' ? 'laptop' : n },
    next: function (id, keys, at) {
      var k, busy = {}, past = this.past[id] || (this.past[id] = [])
      if (at >= 0) { this.cur[id] = keys[at]; past.push(keys[at]); if (past.length > Math.min(5, keys.length - 3)) past.shift() }
      for (k in this.cur) if (k !== id) busy[this.cur[k]] = 1
      for (k in this.res) if (k !== id) busy[this.res[k]] = 1
      var ok = [], loose = [], i
      for (i = 0; i < keys.length; i++) { if (i === at || busy[keys[i]]) continue; loose.push(i); if (past.indexOf(keys[i]) < 0) ok.push(i) }
      var from = ok.length ? ok : loose.length ? loose : [(at + 1) % keys.length], pick = from[Math.floor(Math.random() * from.length)]
      this.res[id] = keys[pick]; return pick
    } }
  document.querySelectorAll('.hero-photos').forEach(function (box, bi) {
    if (reduced) return
    var imgs = box.querySelectorAll('img'), at = 0, raf = 0, pid = 'hero' + bi
    var keys = [].map.call(imgs, function (m) { return Pics.key(m.getAttribute('src') || m.dataset.src) })
    function need(m) { if (m.dataset.src) { m.src = m.dataset.src; m.removeAttribute('data-src') } }
    var nx = Pics.next(pid, keys, 0); need(imgs[nx])
    addEventListener('scroll', function () {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(function () { if (scrollY <= box.offsetHeight) box.style.setProperty('--parallax', (scrollY * 0.35).toFixed(1) + 'px') })
    }, { passive: true })
    ;(function tick() {
      setTimeout(function () {
        if (document.hidden) return tick()
        var next = nx, img = imgs[next]
        need(img)
        ;(img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () {
          imgs[next].className = ''; void imgs[next].offsetWidth   /* a picture coming back starts its drift from the beginning */
          for (var i = 0; i < imgs.length; i++) imgs[i].className = i === next ? 'is-on' : i === at ? 'is-prev' : ''
          at = next; nx = Pics.next(pid, keys, at); need(imgs[nx]); tick()   /* the one after is chosen and fetched while this one shows */
        })
      }, 6000)
    })()
  })
  /* Parcurs: step tabs; advances on its own until the visitor picks a step */
  document.querySelectorAll('.path').forEach(function (path) {
    var list = path.querySelector('.steps'), tabs = [].slice.call(list.children), panes = path.querySelectorAll('.pane'), at = 0, timer = 0, seen = false, hover = false
    function go(i) {
      at = i
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); panes[k].hidden = k !== i })
    }
    function stop() { clearInterval(timer); timer = 0; list.classList.remove('auto') }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stop(); go(i) })
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
        if (!d) return
        e.preventDefault(); stop(); var n = (i + d + tabs.length) % tabs.length; go(n); tabs[n].focus()
      })
    })
    if (reduced || !('IntersectionObserver' in window)) return
    path.addEventListener('mouseenter', function () { hover = true }); path.addEventListener('mouseleave', function () { hover = false })
    new IntersectionObserver(function (e) {
      seen = e[0].isIntersecting
      if (seen && !timer && !list.dataset.done) {
        list.dataset.done = '1'; list.classList.add('auto'); go(0)
        timer = setInterval(function () { if (seen && !hover && !document.hidden) go((at + 1) % tabs.length) }, 6000)
      }
    }, { threshold: 0.4 }).observe(path)
  })
  /* parallax for every photo frame */
  ;(function () {
    var frames = [].slice.call(document.querySelectorAll('.ph')).filter(function (el) { return el.style.backgroundImage })
    frames.forEach(function (el) {
      var s = document.createElement('span'); s.className = 'plx'; s.style.backgroundImage = el.style.backgroundImage
      el.style.backgroundImage = ''; el.insertBefore(s, el.firstChild); el._plx = s
    })
    if (reduced || !frames.length) return
    var raf = 0
    function move() {
      raf = 0
      var vh = innerHeight
      frames.forEach(function (el) {
        var r = el.getBoundingClientRect()
        if (r.bottom < -100 || r.top > vh + 100) return
        var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)))
        el._plx.style.transform = 'translate3d(0,' + (-p * r.height * 0.2).toFixed(1) + 'px,0)'
      })
    }
    function ask() { if (!raf) raf = requestAnimationFrame(move) }
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); move()
  })()
  /* "De ce există DocVex": the photo is a slow slideshow like the hero's: pictures cross-fade and drift left to right, inside the
     frame that already moves with the scroll. It runs only while the panel is on screen, and fetches each picture one slide ahead. */
  document.querySelectorAll('.ph[data-slides]').forEach(function (ph) {
    var names = ph.dataset.slides.split(' '), box = ph._plx
    if (reduced || !box || names.length < 2) return
    var imgs = names.map(function (n, i) {
      var m = document.createElement('img'); m.alt = ''; m.decoding = 'async'
      if (i === 0) { m.src = '/img/' + n + '.jpg'; m.className = 'is-on' } else m.dataset.src = '/img/' + n + '.jpg'
      box.appendChild(m); return m
    })
    box.classList.add('why-photos')
    var at = 0, vis = false, timer = 0, keys = names.map(Pics.key), pid = 'why' + (Pics.n = (Pics.n || 0) + 1), nx = Pics.next(pid, keys, 0)
    function need(m) { if (m.dataset.src) { m.src = m.dataset.src; m.removeAttribute('data-src') } }
    function tick() {
      clearTimeout(timer)
      timer = setTimeout(function () {
        if (document.hidden || !vis) return tick()
        var next = nx, img = imgs[next]
        need(img)
        ;(img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () {
          imgs[next].className = ''; void imgs[next].offsetWidth   /* a picture coming back starts its drift from the beginning */
          for (var i = 0; i < imgs.length; i++) imgs[i].className = i === next ? 'is-on' : i === at ? 'is-prev' : ''
          at = next; nx = Pics.next(pid, keys, at); need(imgs[nx]); tick()
        })
      }, 6000)
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis) need(imgs[nx]) }, { rootMargin: '200px' }).observe(ph)
    else vis = true
    tick()
  })
  /* background slideshow with parallax (Principiu section) */
  document.querySelectorAll('.bg-show').forEach(function (box) {
    if (reduced) return
    var imgs = box.querySelectorAll('img'), at = 0, raf = 0, seen = false
    function move() {
      raf = 0
      var r = box.getBoundingClientRect(), vh = innerHeight
      seen = r.bottom > 0 && r.top < vh
      if (!seen) return
      var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)))
      box.style.setProperty('--plx', (-p * r.height * 0.18).toFixed(1) + 'px')
    }
    function ask() { if (!raf) raf = requestAnimationFrame(move) }
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); move()
    ;(function tick() {
      setTimeout(function () {
        if (document.hidden) return tick()
        var next = (at + 1) % imgs.length, img = imgs[next]
        ;(img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () {
          imgs[next].className = ''; void imgs[next].offsetWidth   /* a picture coming back starts its drift from the beginning */
          for (var i = 0; i < imgs.length; i++) imgs[i].className = i === next ? 'is-on' : i === at ? 'is-prev' : ''
          at = next; tick()
        })
      }, 5000)
    })()
  })
  /* Parcurs: scroll drives the file on the right continuously; the text on the left changes only once a step's threshold is passed */
  document.querySelectorAll('.flow').forEach(function (flow) {
    var rail = flow.querySelector('.rail'), token = flow.querySelector('.rail-token'), status = token.querySelector('em'), count = flow.querySelector('.flow-count b')
    var nodes = [].slice.call(flow.querySelectorAll('.rail-nodes li')), steps = [].slice.call(flow.querySelectorAll('.step'))
    var states = ['Se încarcă', 'Text extras', 'Explicat', 'Verificat', 'Redactat', 'Termen propus'], n = steps.length - 1
    var still = matchMedia('(max-width:900px),(prefers-reduced-motion:reduce)'), cur = 0, target = 0, raf = 0, step = -1
    function measure() { var r = flow.getBoundingClientRect(); target = clamp(-r.top / Math.max(1, r.height - innerHeight)) * n }
    function setStep(i) {
      step = i; status.textContent = states[i]; count.textContent = '0' + i
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i) })
      nodes.forEach(function (li, k) { li.classList.toggle('done', k <= i); li.classList.toggle('on', k === i) })
    }
    function paint() {
      raf = 0
      if (still.matches) { for (var k = 0; k <= n; k++) flow.style.removeProperty('--t' + k); return }
      cur += (target - cur) * 0.16
      if (Math.abs(target - cur) < 0.0005) cur = target
      flow.style.setProperty('--p', (cur / n).toFixed(4))
      token.style.transform = 'translate3d(' + ((cur / n) * (rail.clientWidth - token.offsetWidth)).toFixed(1) + 'px,0,0)'
      flow.style.setProperty('--t0', ease(clamp(0.2 + cur * 2)).toFixed(3))
      /* each action plays out over the first 70% of the scroll toward its step, then holds */
      for (var i = 1; i <= n; i++) flow.style.setProperty('--t' + i, ease(clamp((cur - (i - 1)) / 0.7)).toFixed(3))
      /* stepped text: move on only past 60% of the way to the next step, move back only below 40% */
      var want = step < 0 ? Math.round(cur) : step
      while (want < n && cur > want + 0.6) want++
      while (want > 0 && cur < want - 0.6) want--
      if (want !== step) setStep(want)
      if (cur !== target) raf = requestAnimationFrame(paint)
    }
    function ask() { measure(); if (!raf) raf = requestAnimationFrame(paint) }
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask)
    nodes.forEach(function (li, k) {
      li.firstChild.addEventListener('click', function () {
        var top = flow.getBoundingClientRect().top + scrollY
        scrollTo({ top: top + (k / n) * (flow.offsetHeight - innerHeight), behavior: reduced ? 'auto' : 'smooth' })
      })
    })
    measure(); cur = target; paint()
  })
  /* Funcții vedetă: buttons pick a feature; scrolling through the pinned section plays each presentation in turn */
  document.querySelectorAll('.star').forEach(function (star) {
    var strip = star.querySelector('.star-tabs'), tabs = [].slice.call(strip.children), feats = [].slice.call(star.querySelectorAll('.feat')), scenes = [].slice.call(star.querySelectorAll('.scene'))
    var count = star.querySelector('.star-count b'), n = tabs.length, still = matchMedia('(prefers-reduced-motion:reduce)'), cur = 0, target = 0, raf = 0, step = -1
    function setStep(i) {
      step = i; count.textContent = ('0' + (i + 1)).slice(-2)
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1 })
      feats.forEach(function (f, k) { f.classList.toggle('on', k === i) })
      scenes.forEach(function (s, k) { s.classList.toggle('on', k === i) })
      scenes.forEach(function (s) { s.classList.remove('play') })
      if (play && !reduced) { void scenes[i].offsetWidth; scenes[i].classList.add('play') }
      if (strip.scrollWidth > strip.clientWidth + 4) strip.scrollTo({ left: tabs[i].offsetLeft - (strip.clientWidth - tabs[i].offsetWidth) / 2, behavior: 'smooth' })
    }
    function play(i, t) {
      var s = scenes[i].style
      s.setProperty('--t', ease(t).toFixed(3)); s.setProperty('--a', ease(clamp(t / 0.4)).toFixed(3))
      s.setProperty('--b', ease(clamp((t - 0.3) / 0.4)).toFixed(3)); s.setProperty('--c', ease(clamp((t - 0.6) / 0.4)).toFixed(3))
      tabs[i].style.setProperty('--t', t.toFixed(3))
    }
    function measure() { var r = star.getBoundingClientRect(); target = Math.min(n - 0.0001, clamp(-r.top / Math.max(1, r.height - innerHeight)) * n) }
    function paint() {
      raf = 0
      if (still.matches) return
      cur += (target - cur) * 0.18
      if (Math.abs(target - cur) < 0.0005) cur = target
      var i = Math.min(n - 1, Math.floor(cur))
      if (i !== step) setStep(i)
      play(i, clamp((cur - i) / 0.72))
      if (cur !== target) raf = requestAnimationFrame(paint)
    }
    function ask() { measure(); if (!raf) raf = requestAnimationFrame(paint) }
    function pick(k) {
      if (still.matches) { setStep(k); return }
      var top = star.getBoundingClientRect().top + scrollY
      scrollTo({ top: top + ((k + 0.76) / n) * (star.offsetHeight - innerHeight), behavior: 'smooth' })
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { pick(k) })
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
        if (!d) return
        e.preventDefault(); var m = (k + d + n) % n; pick(m); tabs[m].focus({ preventScroll: true })
      })
    })
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask)
    if (still.matches) setStep(0); else { measure(); cur = target; paint() }
  })
  /* quotes band: the same pictures pass behind the quote, very faint, cross-fading and drifting like the hero's */
  document.querySelectorAll('.quote').forEach(function (sec) {
    if (reduced) return
    var names = ['shelves', 'long-room', 'books', 'justitia-close', 'gavel', 'signing', 'contract', 'tie', 'suit', 'review', 'justitia-sky']
    var box = document.createElement('div'); box.className = 'quote-photos'; box.setAttribute('aria-hidden', 'true')
    var imgs = names.map(function (n, i) { var m = document.createElement('img'); m.alt = ''; m.decoding = 'async'; m.dataset.src = '/img/why-' + n + '.jpg'; box.appendChild(m); return m })
    sec.insertBefore(box, sec.firstChild)
    var at = -1, vis = false, timer = 0, keys = names.map(Pics.key), pid = 'quote' + (Pics.n = (Pics.n || 0) + 1), nx = Pics.next(pid, keys, -1)
    function need(m) { if (m.dataset.src) { m.src = m.dataset.src; m.removeAttribute('data-src') } }
    function go() {
      var next = nx, img = imgs[next]
      need(img)
      ;(img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () {
        imgs[next].className = ''; void imgs[next].offsetWidth   /* a picture coming back starts its drift from the beginning */
          for (var i = 0; i < imgs.length; i++) imgs[i].className = i === next ? 'is-on' : i === at ? 'is-prev' : ''
        at = next; nx = Pics.next(pid, keys, at); need(imgs[nx])
      })
    }
    /* the picture changes on the same beat as the quote: the rotor below announces each change */
    sec.addEventListener('dv-quote', function () { if (vis && at >= 0) go() })
    /* parallax: the pictures slide against the scroll inside the band */
    var praf = 0
    function plx() { praf = 0; var r = sec.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -80 || r.top > vh + 80) return; var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2))); box.style.transform = 'translate3d(0,' + (-p * 64).toFixed(1) + 'px,0)' }
    addEventListener('scroll', function () { if (!praf) praf = requestAnimationFrame(plx) }, { passive: true }); addEventListener('resize', plx); plx()
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && at < 0) go(); if (vis) need(imgs[nx]) }, { rootMargin: '300px' }).observe(sec)
    else { vis = true; go() }
  })
  /* "Versiunea curentă": screenshots of the app pass behind the section, faint, with the same cross-fade, drift and scroll parallax */
  document.querySelectorAll('.band.ver').forEach(function (sec) {
    if (reduced) return
    var names = ['01', '02', '03', '05', '06', '07']
    var box = document.createElement('div'); box.className = 'quote-photos ver-photos'; box.setAttribute('aria-hidden', 'true')
    var imgs = names.map(function (n) { var m = document.createElement('img'); m.alt = ''; m.decoding = 'async'; m.dataset.src = '/shots/' + n + '.jpg'; box.appendChild(m); return m })
    sec.insertBefore(box, sec.firstChild)
    var at = -1, vis = false, timer = 0, nx = Math.floor(Math.random() * imgs.length), praf = 0
    function need(m) { if (m.dataset.src) { m.src = m.dataset.src; m.removeAttribute('data-src') } }
    var was = -1
    function other() { var i; do { i = Math.floor(Math.random() * imgs.length) } while (i === at || i === was); was = at; return i }
    function go() {
      var next = nx, img = imgs[next]
      need(img)
      ;(img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () {
        imgs[next].className = ''; void imgs[next].offsetWidth   /* a picture coming back starts its drift from the beginning */
          for (var i = 0; i < imgs.length; i++) imgs[i].className = i === next ? 'is-on' : i === at ? 'is-prev' : ''
        at = next; nx = other(); need(imgs[nx]); tick()
      })
    }
    function tick() { clearTimeout(timer); timer = setTimeout(function () { if (document.hidden || !vis) return tick(); go() }, 7000) }
    function plx() { praf = 0; var r = sec.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -80 || r.top > vh + 80) return; var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2))); box.style.transform = 'translate3d(0,' + (-p * 64).toFixed(1) + 'px,0)' }
    addEventListener('scroll', function () { if (!praf) praf = requestAnimationFrame(plx) }, { passive: true }); addEventListener('resize', plx); plx()
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && at < 0) go() }, { rootMargin: '300px' }).observe(sec)
    else { vis = true; go() }
  })
  /* quotes: a random one on load, then another random one every 10 s */
  document.querySelectorAll('.rotor').forEach(function (box) {
    var list; try { list = JSON.parse(box.dataset.quotes) } catch (e) { return }
    var q = box.querySelector('blockquote'), who = box.querySelector('cite span'), val = box.querySelector('.stands span'), at = -1
    var shown = window.__dvQuotes || (window.__dvQuotes = []), me = shown.length; shown.push(-1)
    function put(i) { at = i; shown[me] = i; q.textContent = '\u201E' + list[i][0] + '\u201D'; who.textContent = list[i][1]; if (val) val.textContent = list[i][2] }
    function other() { var i; do { i = Math.floor(Math.random() * list.length) } while ((i === at || shown.indexOf(i) > -1) && list.length > shown.length); return i }
    put(other())
    if (reduced) return
    /* The label, the quote and the author glide to their new places: the words fade out, the text changes,
       then each element slides from where it was to where the new quote puts it while the words fade back in. */
    var label = box.parentElement.querySelector('.label'), cite = box.querySelector('cite'), moving = [label, q, cite].filter(Boolean)
    var EASE = 'cubic-bezier(.2,.7,.2,1)'
    function swap() {
      var before = moving.map(function (el) { return el.getBoundingClientRect().top })
      q.style.transition = cite.style.transition = 'opacity .4s ease'
      q.style.opacity = cite.style.opacity = '0'
      setTimeout(function () {
        put(other())
        var qs = box.closest('.quote'); if (qs) qs.dispatchEvent(new Event('dv-quote'))   /* the picture behind changes on this same beat */
        var after = moving.map(function (el) { return el.getBoundingClientRect().top })
        moving.forEach(function (el, k) { el.style.transition = 'none'; el.style.transform = 'translateY(' + (before[k] - after[k]).toFixed(1) + 'px)' })
        void box.offsetHeight
        moving.forEach(function (el, k) { el.style.transition = 'transform .8s ' + EASE + ', opacity .7s ease ' + (k === 2 ? '.12s' : '0s'); el.style.transform = 'translateY(0)' })
        q.style.opacity = cite.style.opacity = '1'
      }, 430)
    }
    setInterval(function () { if (!document.hidden) swap() }, 10000)
  })
  /* download page: screenshot slideshow in the hero, and the operating-system switch */
  document.querySelectorAll('.dlh').forEach(function (hero) {
    var box = hero.querySelector('.dl-show'), imgs = [].slice.call(box.querySelectorAll('img,video')), dots = [].slice.call(hero.querySelectorAll('.dots button'))
    var caps = JSON.parse(box.dataset.caps), num = hero.querySelector('.cap b'), cap = hero.querySelector('.cap em'), at = 0, timer = 0
    function isFilm(m) { return m.tagName === 'VIDEO' }
    function warm(m) { if (isFilm(m) && m.preload !== 'auto') { m.preload = 'auto'; try { m.load() } catch (e) {} } }
    /* screenshots hold for a few seconds; a film plays through once and the show moves on when it ends */
    function auto() {
      clearTimeout(timer); if (reduced) return
      var m = imgs[at], i = at
      function next() { if (at !== i) return; if (document.hidden || hero.offsetParent === null) { timer = setTimeout(next, 1500); return } go(at + 1) }
      if (isFilm(m)) { m.onended = next; timer = setTimeout(next, ((m.duration || 20) + 4) * 1000) } else timer = setTimeout(next, 5500)
      warm(imgs[(at + 1) % imgs.length])
    }
    function go(i) {
      i = (i + imgs.length) % imgs.length
      if (i === at) return
      var img = imgs[i], from = at; at = i; clearTimeout(timer)
      function show() {
        if (at !== i || img._shown === at + 1) return; img._shown = at + 1; setTimeout(function () { img._shown = 0 }, 0)
        imgs.forEach(function (m, k) { m.className = k === i ? 'is-on' : k === from ? 'is-prev' : ''; if (isFilm(m) && k !== i) { m.onended = null; m.pause() } })
        dots.forEach(function (d, k) { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current') })
        num.textContent = ('0' + (i + 1)).slice(-2); cap.textContent = caps[i]
        auto()
      }
      if (isFilm(img)) {
        warm(img); if (img.currentTime > .05) { try { img.currentTime = 0 } catch (e) {} }
        if (reduced) return show()
        var pl = img.play(); if (pl && pl.catch) pl.catch(function () {})
        if (img.readyState >= 3 && !img.seeking) show(); else { img.addEventListener('playing', show, { once: true }); setTimeout(show, 1500) }
      } else (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(show)
    }
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k) }) })
    hero.querySelector('.prev').addEventListener('click', function () { go(at - 1) })
    hero.querySelector('.next').addEventListener('click', function () { go(at + 1) })
    auto()
    /* parallax: the screenshot window and the text drift at their own speeds as the hero scrolls away */
    if (!reduced) {
      var praf = 0
      addEventListener('scroll', function () {
        if (praf || hero.offsetParent === null) return
        praf = requestAnimationFrame(function () { praf = 0; if (scrollY <= hero.offsetHeight) hero.style.setProperty('--py', scrollY.toFixed(1) + 'px') })
      }, { passive: true })
    }
  })
  ;(function () {
    var page = document.getElementById('dl'); if (!page) return
    var btn = page.querySelector('.dl-copy .row .btn'), fine = page.querySelector('.dl-copy .fine'), said = fine.textContent
    function setOs(os) {
      page.dataset.os = os
      page.querySelectorAll('.os button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.os === os ? 'true' : 'false') })
      page.querySelectorAll('.osname').forEach(function (s) { s.textContent = os === 'mac' ? 'macOS' : 'Windows' })
      /* the button links straight to the newest installer for that system, read from the GitHub releases when the site was built */
      var f = downloads[os]
      if (f) { btn.href = f.url; btn.title = 'DocVex ' + f.version + ' · ' + f.file; btn.removeAttribute('aria-disabled'); fine.textContent = said }
      else { btn.removeAttribute('href'); btn.removeAttribute('title'); btn.setAttribute('aria-disabled', 'true'); fine.textContent = 'Versiunea pentru ' + (os === 'mac' ? 'macOS' : 'Windows') + ' nu este publicată încă. Revino curând.' }
    }
    page.addEventListener('click', function (e) { var b = e.target.closest('.os button'); if (b) setOs(b.dataset.os) })
    /* a download: remembered on a signed-in account and counted in Plausible */
    btn.addEventListener('click', function () {
      var os = page.dataset.os, f = downloads[os]; if (!f) return
      recordDownload(f.version); track('Download Click', { platform: os, arch: f.arch || 'x64', version: f.version, location: 'hero' })
    })
    /* a link can ask for a system with ?os=mac or ?os=windows; otherwise the visitor's own */
    var asked = new URLSearchParams(location.search).get('os')
    setOs(asked === 'mac' || asked === 'windows' ? asked : /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? 'mac' : 'windows')
  })()
  /* Funcții: click a function to play its animation in the panel beside the list */
  document.querySelectorAll('.fx').forEach(function (fx) {
    var rows = [].slice.call(fx.querySelectorAll('.fx-row')), scenes = [].slice.call(fx.querySelectorAll('.scene')), cap = fx.querySelector('.fx-cap b'), at = 0, raf = 0, seen = false, nextT = 0, inView = false, pending = false
    function paint(i, t) {
      var s = scenes[i].style
      s.setProperty('--t', ease(t).toFixed(3)); s.setProperty('--a', ease(clamp(t / 0.4)).toFixed(3))
      s.setProperty('--b', ease(clamp((t - 0.3) / 0.4)).toFixed(3)); s.setProperty('--c', ease(clamp((t - 0.6) / 0.4)).toFixed(3))
      rows[i].style.setProperty('--t', t.toFixed(3))
      /* one timeline for the stage, on the bottom line of its inner frame: a film reports its own time */
      var f = scenes[i].querySelector('.fx-film'), p = f && f.duration ? clamp(f.currentTime / f.duration) : t
      if (f && f.ended) p = 1
      prog.style.transform = 'scaleX(' + p.toFixed(4) + ')'
    }
    var prog = document.createElement('i'); prog.className = 'fx-prog'; prog.setAttribute('aria-hidden', 'true'); fx.querySelector('.fx-vis').appendChild(prog)
    /* when a function's animation is over, the next one starts; nothing loops */
    function advance(i, wait) {
      if (at !== i || reduced) return
      clearTimeout(nextT); nextT = setTimeout(function () { if (at !== i) return; if (inView) pick((i + 1) % rows.length, true); else pending = true }, wait)
    }
    function pick(i, play) {
      at = i; cancelAnimationFrame(raf); clearTimeout(nextT); pending = false
      rows.forEach(function (r, k) { r.setAttribute('aria-selected', k === i ? 'true' : 'false') })
      var film = scenes[i].querySelector('.fx-film'), dur = +scenes[i].dataset.dur || 7000, shown = false
      /* The film that was showing stays on its last frame until the new one is really drawing frames, then the two cross-fade:
         no poster flash, no frozen first frame. Films are loaded one ahead and rewound while hidden, so a switch never waits on a seek. */
      function show() {
        if (shown || at !== i) return; shown = true
        scenes.forEach(function (s, k) { s.classList.toggle('on', k === i) })
        scenes.forEach(function (s) { s.classList.remove('play') })
        if (play && !reduced) { void scenes[i].offsetWidth; scenes[i].classList.add('play') }
        fx.querySelectorAll('.fx-film').forEach(function (v) {
          if (v === film) return
          v.pause(); setTimeout(function () { if (v.paused && v.currentTime > 0) { try { v.currentTime = 0 } catch (e) {} } }, 650)
        })
      }
      if (film) { film.loop = false; film.onended = function () { advance(i, 0) } }
      if (film && play && !reduced) {
        if (film.currentTime > 0.05) { try { film.currentTime = 0 } catch (e) {} }
        film.preload = 'auto'
        var pl = film.play(); if (pl && pl.catch) pl.catch(function () {})
        if (film.readyState >= 3 && !film.seeking) show()
        else { film.addEventListener('playing', show, { once: true }); setTimeout(show, 1500) }
        var nx = scenes[(i + 1) % scenes.length].querySelector('.fx-film')   /* the next film downloads and decodes its first frame while this one plays */
        if (nx && nx.preload !== 'auto') { nx.preload = 'auto'; try { nx.load() } catch (e) {} }
      } else show()
      cap.textContent = rows[i].querySelector('b').textContent
      var no = fx.querySelector('.fx-no'), ti = fx.querySelector('.fx-t'), de = fx.querySelector('.fx-d'), info = fx.querySelector('.fx-info')
      if (no) {
        no.textContent = (i < 9 ? '0' : '') + (i + 1); ti.textContent = cap.textContent; de.textContent = rows[i].querySelector('.tx span').textContent
        if (!reduced && play) { info.classList.remove('in'); void info.offsetWidth; info.classList.add('in') }
      }
      if (!play || reduced) { paint(i, 1); return }
      var t0 = performance.now()
      paint(i, 0)
      ;(function step(now) { var t = clamp((now - t0) / dur); paint(i, t); if ((t < 1 || (film && !film.ended && !film.paused)) && at === i) raf = requestAnimationFrame(step); else if (t >= 1 && !(film && film.ended)) advance(i, film ? Math.max(2500, ((film.duration || 0) * 1000 - dur) + 3000) : 1100) })(t0)
    }
    rows.forEach(function (r, i) {
      r.addEventListener('click', function () { pick(i, true) })
      r.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
        if (!d) return
        e.preventDefault(); var m = (i + d + rows.length) % rows.length; rows[m].focus(); pick(m, true)
      })
    })
    fx.querySelector('.fx-again').addEventListener('click', function () { pick(at, true) })
    pick(0, false)
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      inView = e[0].isIntersecting
      if (inView && !seen) { seen = true; pick(at, true) }
      else if (inView && pending) pick((at + 1) % rows.length, true)
    }, { threshold: 0.35 }).observe(fx.querySelector('.fx-vis'))
  })

  /* Roadmap: the line draws and the stages rise in when the section comes into view */
  document.querySelectorAll('.rm').forEach(function (rm) {
    if (reduced || !('IntersectionObserver' in window)) return
    rm.classList.add('pre')
    new IntersectionObserver(function (e, io) { if (e[0].isIntersecting) { rm.classList.add('in'); io.disconnect() } }, { threshold: 0.3 }).observe(rm)
  })

  /* Accounts (Supabase, the same accounts as the app): the header's account button, sign-in and the five-step sign-up, the account portal */
  ;(function () {
    var signed = !!storedUser()
    function nav() {
      signed = !!storedUser()
      document.querySelectorAll('.acct').forEach(function (a) { a.firstElementChild.textContent = signed ? a.dataset.in : a.dataset.out; a.setAttribute('href', signed ? '/cont.html' : authHref()) })
    }
    addEventListener(AUTH_EVENT, nav); addEventListener('storage', nav)
    var UNAVAILABLE = 'Conturile nu sunt disponibile încă pe site. Revino curând.'
    var ERRORS = {
      invalid_credentials: 'E-mailul sau parola nu sunt corecte.',
      email_not_confirmed: 'Confirmă-ți întâi adresa de e-mail, din linkul primit.',
      weak_password: 'Parola a fost respinsă ca fiind prea slabă. Alege una mai lungă.',
      over_email_send_rate_limit: 'Prea multe e-mailuri trimise. Încearcă din nou peste câteva minute.',
      over_request_rate_limit: 'Prea multe încercări. Așteaptă puțin și încearcă din nou.',
      signup_disabled: 'Crearea conturilor noi este oprită momentan.',
      email_address_invalid: 'Adresa de e-mail nu este acceptată.',
      generic: 'Ceva nu a mers. Încearcă din nou.'
    }
    function errorText(x) { return authConfigured ? ERRORS[x && x.code] || ERRORS.generic : UNAVAILABLE }
    /* Sign-in and the five-step sign-up, ported from the live site and sent to Supabase */
    var au = document.querySelector('.au')
    if (au) {
      var $ = function (s) { return au.querySelector(s) }, $$ = function (s) { return [].slice.call(au.querySelectorAll(s)) }
      var plans = JSON.parse(au.dataset.plans), out = $('.au-out'), mode = 'signin', step = 0, top = 0
      var LEVELS = ['Prea slabă', 'Slabă', 'Acceptabilă', 'Bună', 'Puternică'], COMMON = ['password', 'parola', 'parola123', '12345678', '123456789', 'qwerty123', 'abc12345', 'docvex123']
      var GENDER = { Feminin: 'female', Masculin: 'male', Altul: 'other' }
      var params = new URLSearchParams(location.search), asked = plans[params.get('plan')] ? params.get('plan') : null
      /* back from Google or from an e-mail link: the sign-in finishes on this page, with the plan picked before leaving in ?plan= */
      var fromLink = params.has('code') || /access_token|error_description/.test(location.hash), paidBack = params.get('plata') === 'ok', busy = false, arrived = false, started = false
      function err(input, msg) { var f = input.closest('.field'), m = f.querySelector('.err'); m.textContent = msg || ''; f.classList.toggle('has-error', !!msg); if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); return !msg }
      function nameErr(v) { v = v.trim(); return !v ? 'Scrie-ți numele.' : v.length < 2 ? 'Numele trebuie să aibă cel puțin 2 caractere.' : v.length > 80 ? 'Numele poate avea cel mult 80 de caractere.' : /[^\p{L}\s'.\-]/u.test(v) ? 'Folosește doar litere, spații, cratime, apostrofuri și puncte.' : '' }
      function emailErr(v) {
        v = v.trim()
        if (!v) return 'Scrie-ți adresa de e-mail.'
        if (/\s/.test(v)) return 'Adresa de e-mail nu poate conține spații.'
        if (v.indexOf('@') < 0) return 'Adresei îi lipsește „@”, de exemplu nume@exemplu.ro.'
        var p = v.split('@'), local = p[0], dom = p.slice(1).join('@')
        if (!dom) return 'Scrie domeniul după „@”, de exemplu exemplu.ro.'
        if (v.length > 254) return 'Adresa de e-mail este prea lungă.'
        if (!local || /^\.|\.$|\.\./.test(local)) return 'Partea dinainte de „@” nu poate începe, se termina sau avea două puncte la rând.'
        if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(dom)) return 'Domeniul nu pare corect, de exemplu exemplu.ro.'
        return ''
      }
      function checkPass(v) {
        var low = v.toLowerCase(), parts = ($('#su-name').value + ' ' + $('#su-email').value.split('@')[0]).toLowerCase().split(/[\s._\-]+/).filter(function (x) { return x.length > 2 })
        var r = { length: v.length >= 8, letters: /\p{L}/u.test(v), digit: /\d/.test(v), cases: /\p{Ll}/u.test(v) && /\p{Lu}/u.test(v), symbol: /[^\p{L}\d\s]/u.test(v),
          personal: !!v && !parts.some(function (x) { return low.indexOf(x) >= 0 }), common: !!v && COMMON.indexOf(low) < 0, edges: !!v && v === v.trim() }
        r.valid = r.length && r.letters && r.digit && r.personal && r.common && r.edges
        r.level = !r.valid ? (v.length >= 6 ? 1 : 0) : Math.min(4, 2 + (r.cases ? 1 : 0) + (r.symbol && v.length >= 12 ? 1 : 0))
        return r
      }
      function meter() {
        var r = checkPass($('#su-pass').value), box = $('.strength')
        box.dataset.level = r.level; box.querySelector('b').textContent = LEVELS[r.level]
        $$('.strength-bar span').forEach(function (s, i) { s.classList.toggle('is-on', $('#su-pass').value && i < Math.max(1, r.level)) })
        $$('.rules li').forEach(function (li) { li.classList.toggle('is-ok', !!r[li.dataset.rule]) })
        var a = $('#su-again').value; $('#su-again').closest('.field').querySelector('.ok').hidden = !(a && a === $('#su-pass').value)
        return r
      }
      function dateErr() {
        var d = $('#su-day').value, m = $('#su-month').value, y = $('#su-year').value, n = [d, m, y].filter(Boolean).length
        if (!n) return ''
        if (n < 3) return 'Alege ziua, luna și anul, sau lasă-le pe toate necompletate.'
        if (+d > new Date(+y, +m, 0).getDate()) return 'Luna aleasă nu are această zi.'
        var now = new Date(), age = now.getFullYear() - y - (now < new Date(now.getFullYear(), m - 1, d) ? 1 : 0)
        return age < 16 ? 'Trebuie să ai cel puțin 16 ani.' : ''
      }
      function plan() { var r = $('input[name="plan"]:checked'); return r ? r.value : 'start' }
      function planMini() {
        var p = plans[plan()], box = $('.plan-mini')
        box.innerHTML = '<b></b><em></em><span></span><ul></ul>'
        box.children[0].textContent = p.name; box.children[1].textContent = p.price + ' / lună'; box.children[2].textContent = p.text
        box.children[3].innerHTML = p.features.map(function (f) { return '<li>' + f + '</li>' }).join('')
        box.hidden = step !== 3
      }
      function review() {
        var g = $('input[name="gender"]:checked').value, d = $('#su-day').value, mo = $('#su-month'), y = $('#su-year').value
        var about = [g, d ? d + ' ' + mo.options[mo.selectedIndex].text + ' ' + y : ''].filter(Boolean).join(' · ') || 'Nespecificat', p = plans[plan()]
        var rows = [['Contul', $('#su-name').value.trim() + ' · ' + $('#su-email').value.trim()], ['Parola', '•••••••• (' + LEVELS[checkPass($('#su-pass').value).level] + ')'], ['Despre tine', about], ['Plan', p.name + ' · ' + p.price + ' / lună']]
        var dl = $('.review'); dl.textContent = ''
        rows.forEach(function (r, i) {
          var div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'), b = document.createElement('button')
          dt.textContent = r[0]; dd.textContent = r[1]; b.type = 'button'; b.className = 'au-link'; b.textContent = 'Modifică'; b.dataset.goto = i
          div.appendChild(dt); div.appendChild(dd); div.appendChild(b); dl.appendChild(div)
        })
      }
      function render() {
        $$('.auth-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.mode === (mode === 'sent' ? 'signup' : mode) ? 'true' : 'false') })
        $$('[data-intro]').forEach(function (d) { d.hidden = d.dataset.intro !== (mode === 'signup' || mode === 'sent' ? 'signup' : 'signin') })
        $$('form[data-view]').forEach(function (f) { f.hidden = f.dataset.view !== mode })
        $$('[data-step]').forEach(function (d) { d.hidden = +d.dataset.step !== step })
        $('.au-stepof').textContent = 'Pasul ' + (step + 1) + ' din 5'
        $('[data-back]').hidden = step === 0; $('[data-next]').textContent = step === 4 ? 'Creează contul' : 'Continuă'
        $$('.progress > li').forEach(function (li, i) {
          li.classList.toggle('is-done', i < step); li.classList.toggle('is-current', i === step)
          if (i === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current')
          li.querySelector('.progress-name').disabled = i >= step
        })
        top = Math.max(top, step); planMini(); if (step === 4) review()
        $('.au-google').hidden = mode === 'forgot' || mode === 'sent'; $('.auth-or').hidden = mode === 'forgot' || mode === 'sent'
        if (mode === 'signup' && !started) { started = true; track('Signup Started') }
      }
      function go(m, s) { mode = m; if (s != null) step = s; out.textContent = ''; render() }
      function validStep() {
        if (step === 0) { var a = err($('#su-name'), nameErr($('#su-name').value)), b = err($('#su-email'), emailErr($('#su-email').value)); return a && b }
        if (step === 1) {
          var r = meter(), p = $('#su-pass'), g = $('#su-again')
          var a1 = err(p, !p.value ? 'Scrie-ți parola.' : r.valid ? '' : 'Parola nu îndeplinește încă toate cerințele de mai jos.')
          var b1 = err(g, !g.value ? 'Repetă parola, ca să fim siguri că ai scris-o corect.' : g.value !== p.value ? 'Parolele nu coincid.' : '')
          return a1 && b1
        }
        if (step === 2) return err($('#su-day'), dateErr())
        if (step === 4) { var ok = $('#su-terms').checked; $('[data-terms-err]').textContent = ok ? '' : 'Pentru a crea contul trebuie să accepți termenii.'; return ok }
        return true
      }
      /* the page to come back to, keeping the paid plan picked here (Google and the confirmation e-mail return with it) */
      function redirect(withPlan) { var u = new URL(authRedirect()); if (withPlan && plan() !== 'start') u.searchParams.set('plan', plan()); return u.toString() }
      function wait(form, on, text) {
        busy = on; form.querySelectorAll('button').forEach(function (b) { b.disabled = on }); form.setAttribute('aria-busy', on ? 'true' : 'false')
        if (on) out.textContent = text
      }
      /* Signed in (by signing in, creating an account, or back from Google or an e-mail link): first to Stripe when a paid plan
         was picked while creating the account, else back to the page that sent here (?next=), else the home page. */
      function signedIn(session) {
        if (arrived) return; arrived = true; nav()
        if (paidBack) return thanks(session.user)
        var p = fromLink ? asked : mode === 'signup' || mode === 'sent' ? plan() : null
        var checkout = p && p !== 'start' ? checkoutUrl(p, session.user) : null
        out.textContent = 'Te-ai autentificat. Te ducem mai departe…'
        if (checkout) trackThen('Checkout Redirect', { plan: p }).then(function () { location.replace(checkout) })
        else location.replace(nextPage() || '/')
      }
      /* back from Stripe's payment page */
      function thanks(user) {
        track('Payment Return')
        $('.auth-tabs').hidden = true; $$('form[data-view]').forEach(function (f) { f.hidden = true }); $('.au-google').hidden = true; $('.auth-or').hidden = true
        var box = document.createElement('div'); box.className = 'au-done'
        box.innerHTML = '<h3>Plata a fost primită. Mulțumim!</h3><p class="au-lead"></p><div class="au-actions"><a class="btn small" href="/cont.html">Contul meu</a><a class="btn small ghost" href="/instalare.html">Descarcă aplicația</a></div>'
        box.querySelector('p').textContent = 'Ești autentificat ca ' + user.email + '. Abonamentul apare în contul tău imediat ce îl confirmă Stripe.'
        out.textContent = ''; out.parentNode.insertBefore(box, out)
      }
      function call(form, text, job) {
        if (busy) return
        if (!authConfigured) { out.textContent = UNAVAILABLE; return }
        wait(form, true, text)
        getSupabase().then(job).then(function () { wait(form, false) }, function (x) { wait(form, false); out.textContent = errorText(x) })
      }
      function signIn(form) {
        call(form, 'Se verifică…', function (sb) {
          return sb.auth.signInWithPassword({ email: $('#si-email').value.trim(), password: $('#si-pass').value }).then(function (r) {
            if (r.error) throw r.error
            track('Signin', { provider: 'email' }); if (r.data.session) signedIn(r.data.session)
          })
        })
      }
      function forgot(form) {
        var email = $('#fg-email').value.trim()
        call(form, 'Se trimite…', function (sb) {
          return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/cont.html?parola=noua' }).then(function (r) {
            if (r.error) throw r.error
            track('Password Reset Requested')
            setTimeout(function () { out.textContent = 'Dacă există un cont pentru ' + email + ', ți-am trimis un link de resetare. Verifică și dosarul Spam.' })
          })
        })
      }
      function create(form) {
        var email = $('#su-email').value.trim(), news = $('#su-news').checked, g = GENDER[$('input[name="gender"]:checked').value] || null
        var d = $('#su-day').value, m = $('#su-month').value, y = $('#su-year').value, born = d && m && y ? y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2) : null
        var data = { full_name: $('#su-name').value.trim(), plan: plan(), has_password: true, newsletter: news, newsletter_at: news ? new Date().toISOString() : null }
        if (g || born) { if (g) data.gender = g; if (born) data.birth_date = born; data.demographics_at = new Date().toISOString() }
        call(form, 'Se creează contul…', function (sb) {
          return sb.auth.signUp({ email: email, password: $('#su-pass').value, options: { emailRedirectTo: redirect(true), data: data } }).then(function (r) {
            /* an address already in use comes back as a user with no identities */
            var x = r.error || (r.data.user && !(r.data.user.identities || []).length ? { code: 'user_already_exists' } : null)
            if (x && (x.code === 'user_already_exists' || x.code === 'email_exists')) { go('signup', 0); err($('#su-email'), 'Există deja un cont cu acest e-mail. Intră în el din fila Autentificare.'); $('#su-email').focus(); return }
            if (x && x.code === 'weak_password') { go('signup', 1); err($('#su-pass'), ERRORS.weak_password); $('#su-pass').focus(); return }
            if (x) throw x
            track('Signup Completed', { plan: plan() })
            if (r.data.session) return signedIn(r.data.session)
            sent(email)
          })
        })
      }
      /* "check your e-mail", with a resend that waits a minute between sends */
      var tick = 0
      function sent(email) {
        go('sent'); $('[data-sent-text]').textContent = 'Ți-am trimis un link de confirmare la ' + email + '. Deschide-l ca să-ți activezi contul; poate ajunge și în dosarul Spam.'
        countdown(60)
      }
      function countdown(s) {
        var b = $('[data-resend] span'); clearInterval(tick)
        function show() { b.textContent = s > 0 ? 'Poți retrimite în ' + s + ' s' : 'Retrimite e-mailul'; $('[data-resend]').disabled = s > 0 }
        show(); tick = setInterval(function () { s--; show(); if (s <= 0) clearInterval(tick) }, 1000)
      }
      function resend(form) {
        call(form, 'Se trimite…', function (sb) {
          return sb.auth.resend({ type: 'signup', email: $('#su-email').value.trim(), options: { emailRedirectTo: redirect(true) } }).then(function (r) {
            if (r.error) throw r.error
            setTimeout(function () { out.textContent = 'E-mailul a fost retrimis.'; countdown(60) })
          })
        })
      }
      function google() {
        if (busy) return
        if (!authConfigured) { out.textContent = UNAVAILABLE; return }
        busy = true
        /* from Cont nou the plan comes back with Google (?plan=), so a paid one goes on to Stripe; from Autentificare it does not */
        var to = redirect(mode === 'signup')
        getSupabase().then(function (sb) {
          return trackThen('Signin', { provider: 'google' }).then(function () { return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: to } }) })
        }).then(function (r) { if (r.error) throw r.error }).catch(function (x) { busy = false; out.textContent = errorText(x) })
      }
      /* birth-date choices */
      for (var d = 1; d <= 31; d++) $('#su-day').add(new Option(d, d))
      for (var y = new Date().getFullYear() - 16; y >= 1920; y--) $('#su-year').add(new Option(y, y))
      au.addEventListener('submit', function (e) {
        e.preventDefault(); if (busy) return; out.textContent = ''
        var form = e.target, view = form.dataset.view
        if (view === 'signin') { var a = err($('#si-email'), emailErr($('#si-email').value)), b = err($('#si-pass'), $('#si-pass').value ? '' : 'Scrie-ți parola.'); if (a && b) signIn(form) }
        else if (view === 'forgot') { if (err($('#fg-email'), emailErr($('#fg-email').value))) forgot(form) }
        else if (view === 'sent') resend(form)
        else if (validStep()) { if (step < 4) { step++; render() } else create(form) }
        var bad = au.querySelector('[aria-invalid="true"]'); if (bad) bad.focus()
      })
      au.addEventListener('click', function (e) {
        var t = e.target, b
        if ((b = t.closest('.auth-tabs button'))) return go(b.dataset.mode)
        if (t.closest('[data-forgot]')) { $('#fg-email').value = $('#fg-email').value || $('#si-email').value; return go('forgot') }
        if (t.closest('[data-backin]')) return go('signin')
        if (t.closest('[data-wrong]')) { clearInterval(tick); return go('signup', 0) }
        if (t.closest('[data-back]')) { step = Math.max(0, step - 1); out.textContent = ''; return render() }
        if ((b = t.closest('[data-goto]'))) { step = +b.dataset.goto; out.textContent = ''; return render() }
        if ((b = t.closest('[data-eye]'))) { var inp = b.parentElement.querySelector('input'), show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.textContent = show ? 'Ascunde' : 'Arată'; b.setAttribute('aria-label', show ? 'Ascunde parola' : 'Arată parola'); return }
        if (t.closest('[data-gen]')) {
          var set = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!?#%+', buf = new Uint32Array(18), pw = ''
          crypto.getRandomValues(buf); for (var i = 0; i < buf.length; i++) pw += set[buf[i] % set.length]
          pw = 'aA7!' + pw.slice(4); $('#su-pass').value = pw; $('#su-again').value = pw; $('#su-pass').type = 'text'; meter()
          var msg = function (ok) { out.textContent = ok ? 'Am completat o parolă puternică și am copiat-o. Salveaz-o în managerul de parole.' : 'Am completat o parolă puternică. Salveaz-o în managerul de parole.' }
          try { navigator.clipboard.writeText(pw).then(function () { msg(true) }, function () { msg(false) }) } catch (x) { msg(false) }
          return
        }
        if (t.closest('[data-google]')) google()
      })
      au.addEventListener('input', function (e) { if (e.target.id === 'su-pass' || e.target.id === 'su-again') meter(); if (e.target.closest('.field.has-error')) err(e.target, '') })
      au.addEventListener('change', function (e) { if (e.target.name === 'plan') planMini() })
      au.addEventListener('keyup', function (e) { if (e.target.type === 'password' && e.getModifierState) { var c = e.target.closest('.field').querySelector('.caps'); if (c) c.hidden = !e.getModifierState('CapsLock') } })
      /* "Alege <plan>" on the pricing and download pages opens the sign-up here, with that plan ticked (?plan=) */
      if (asked && !fromLink) { var pick = $('#au-plan-' + asked); if (pick) pick.checked = true; mode = 'signup' }
      render()
      if (paidBack) out.textContent = 'Plata a fost primită. Mulțumim!'
      if (!authConfigured) out.textContent = UNAVAILABLE
      else getSupabase().then(function (sb) {
        sb.auth.onAuthStateChange(function (ev, s) { if (s) setTimeout(function () { signedIn(s) }) })
        return sb.auth.getSession().then(function (r) { if (r.data.session) signedIn(r.data.session); else if (fromLink) out.textContent = 'Linkul nu mai este valabil sau a fost deja folosit. Autentifică-te din nou.' })
      }).catch(function () {})
    }
    var portal = document.querySelector('.portal')
    if (portal) {
      function tab(k) {
        portal.querySelectorAll('.p-nav [data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === k ? 'true' : 'false') })
        portal.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== k })
      }
      portal.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]'); if (b) { tab(b.dataset.tab); return }
        /* signing out: account.js */
      })
      initPortal(portal, tab)
    }
    nav()
  })()
  /* roadmap page: the rail is a tab list, one stage on stage at a time */
  ;(function () {
    var rail = document.querySelector('.pl-rail'), stage = document.querySelector('.pv-stage'); if (!rail || !stage) return
    var btns = [].slice.call(rail.querySelectorAll('[data-pl]')), pans = [].slice.call(stage.querySelectorAll('.pv')), cur = 0
    function show(i, focus) {
      if (i < 0 || i >= pans.length) return
      var dir = i < cur ? -1 : 1; cur = i
      btns.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; b.parentNode.classList.toggle('at', k === i) })
      pans.forEach(function (p, k) { p.hidden = k !== i; p.classList.remove('in') })
      stage.style.setProperty('--dir', dir); void pans[i].offsetWidth; pans[i].classList.add('in')
      rail.style.setProperty('--at', i)
      if (btns[i].scrollIntoView && rail.scrollWidth > rail.clientWidth) btns[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
      if (focus) btns[i].focus()
    }
    rail.addEventListener('click', function (e) { var b = e.target.closest('[data-pl]'); if (b) show(+b.dataset.pl) })
    stage.addEventListener('click', function (e) { var b = e.target.closest('[data-pl]'); if (b) show(+b.dataset.pl) })
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(Math.min(cur + 1, pans.length - 1), true) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(Math.max(cur - 1, 0), true) }
    })
    show(0)
  })()
  /* closing section, second take: the day's papers are read, gathered into one neat pile, sealed, and the seal takes its place */
  document.querySelectorAll('.closer.cl2').forEach(function (sec) {
    var fx = sec.querySelector('.closer-fx'), cards = [].slice.call(fx.querySelectorAll('.cz')), cv = fx.querySelector('canvas'), ctx = cv.getContext('2d'), cv2 = fx.querySelector('.q-cv2'), c2 = cv2.getContext('2d'), mode = 'cv', items = [], rasterOK = false, rasterGen = 0, PAD = 44, FLY_ = 860
    var seal = sec.querySelector('.closer-seal'), word = sec.querySelector('.closer-word'), inn = sec.querySelector('.closer-in')
    var scan = fx.querySelector('.q-scan'), wall = fx.querySelector('.dk-wall'), bloom = fx.querySelector('.q-bloom'), dial = fx.querySelector('.q-dial'), wave = fx.querySelector('.q-wave'), wave2 = fx.querySelector('.q-wave.w2'), rays = fx.querySelector('.q-rays'), spot2 = fx.querySelector('.q-spot'), floor = fx.querySelector('.q-floor'), shape = fx.querySelector('.q-shape'), shp = shape.querySelector('path'), NS = 360, pileR = [], sealR = [], t0 = 0, tB = 0, BEND = 300, tSwap = 0, clones = [], sk = [], tSuck0 = 0, acc = fx.querySelector('.q-acc'), burstAt = 0, burstDone = true, cvLive = 1, arrive = [], tGrow0 = 0, tGrow1 = 1, tLand = 0, hx = 0, hy = 0, hk = 1, ring = fx.querySelector('.q-ring'), rc = ring.querySelectorAll('circle')
    var W = 0, H = 0, cx = 0, cy = 0, ox = 0, oy = 0, S = 100, dpr = 1, anims = [], timers = [], motes = [], raf = 0, vis = false, state = 'rest', dust = 0
    if (reduced || !fx.animate) return
    sec.classList.add('q-pre')   /* the section is always part of the page, at its normal size */
    var mark = document.createElement('i'); mark.className = 'vx-mark'; sec.parentNode.insertBefore(mark, sec)   /* where the section will live once it has played */
    function size() {
      var r = fx.getBoundingClientRect(), s = seal.getBoundingClientRect()
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv2.width = W * dpr; cv2.height = H * dpr; cx = W / 2; cy = H / 2; S = seal.offsetWidth || 100
      ox = cx - (s.left - r.left + s.width / 2); oy = cy - (s.top - r.top + s.height / 2)
      fx.style.setProperty('--cx', cx + 'px'); fx.style.setProperty('--cy', cy + 'px'); fx.style.setProperty('--S', S + 'px')
    }
    var isMac = /Mac|iPhone|iPad|iPod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '')
    sec.classList.add(isMac ? 'os-mac' : 'os-win')
    var vid = fx.querySelector('.q-vid'), vidOK = false, vidAsked = false, VX = {"win": 54, "mac": 55, "win-m": 18, "mac-m": 19}, vxKey = '', forceK = 0, rasterScale = 0, jobs = [], built = false, domBuilt = false, buildT = 0, lastW = 0, lastH = 0
    function spot(k) {   /* where a desktop item sits: its centre on the 1440 x 760 reference screen, or its phone position */
      var c = cards[k], d = c.dataset, small = W < 700, out = { k0: 1, show: true, x: 0, y: 0 }
      if (c.classList.contains(isMac ? 'only-win' : 'only-mac')) { out.show = false; return out }
      if (small) {
        if (!d.m) { out.show = false; return out }
        var m = d.m.split(','); out.x = W * m[0] / 390; out.y = H * m[1] / 800; out.k0 = +m[2] * Math.min(1, W / 390)
      } else { out.k0 = forceK || Math.max(.62, Math.min(1.2, W / 1440)); out.x = cx + (d.x - 720) * out.k0; out.y = H * d.y / 760; if ((d.x < 0 || d.x > 1440) && W < 1440 * out.k0 + 150) out.show = false }
      return out
    }
    function layout() {
      size()
      cards.forEach(function (c, k) {
        var s = spot(k); c._s = s
        c.style.left = s.x + 'px'; c.style.top = s.y + 'px'; c.style.zIndex = 100 + k; c.style.transform = 'translate(-50%,-50%) scale(' + s.k0 + ')'; c.style.opacity = s.show ? 1 : 0; c.style.visibility = s.show ? '' : 'hidden'
        if (c.dataset.full) c.style.width = (W / s.k0) + 'px'
      })
      if (W !== lastW || H !== lastH) { lastW = W; lastH = H; built = false; setTimeout(function () { if (state === 'rest') sealOutline() }, 500) }
      if (!built) { built = true; domBuilt = false; clearTimeout(buildT); buildT = setTimeout(function () { if (state === 'rest' && vidAsked && !vidOK) prepare() }, 3500) }
    }
    /* Every item is cut into ribbons ahead of time (not at the moment the animation starts), and each ribbon's whole path down the spiral is worked out once.
       A ribbon is placed, turned and stretched from its neighbours' positions, so an item bends and thins as one continuous sheet. */
    /* Each desktop item is drawn once, by the browser itself, into its own bitmap. During the pull the bitmaps are drawn on one canvas
       in thin strips, so an item bends as a smooth sheet at full quality and the work per frame is a few hundred cheap image draws. */
    function gatherCSS() {
      var out = [], want = /\.(dk|cz)\b|\.dk-|\.cz-|\.g-|\.a-|\.w-|\.os-|\.only-/
      function walk(rules) { for (var i = 0; i < rules.length; i++) { var r = rules[i]
        if (r.cssRules && r.conditionText !== undefined) { try { if (window.matchMedia(r.conditionText).matches) walk(r.cssRules) } catch (e) {} }
        else if (r.selectorText && want.test(r.selectorText)) out.push(r.cssText) } }
      for (var s = 0; s < document.styleSheets.length; s++) { try { walk(document.styleSheets[s].cssRules) } catch (e) {} }
      return out.join('\n')
    }
    function raster(it, css) {
      return new Promise(function (ok, bad) {
        var c = it.c, cl = c.cloneNode(true), w = c.offsetWidth, h = c.offsetHeight, sc = it.s.k0 * (rasterScale || dpr), bw = w + PAD * 2, bh = h + PAD * 2
        cl.style.cssText = 'position:absolute!important;left:' + PAD + 'px!important;top:' + PAD + 'px!important;opacity:1!important;transform:none!important;visibility:visible!important;margin:0!important;width:' + w + 'px;height:' + h + 'px;z-index:auto'
        var html = new XMLSerializer().serializeToString(cl)
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.ceil(bw * sc) + '" height="' + Math.ceil(bh * sc) + '" viewBox="0 0 ' + bw + ' ' + bh + '"><foreignObject x="0" y="0" width="' + bw + '" height="' + bh + '">'
          + '<div xmlns="http://www.w3.org/1999/xhtml" class="closer cl2 ' + (isMac ? 'os-mac' : 'os-win') + '" style="position:relative;width:' + bw + 'px;height:' + bh + 'px;margin:0;padding:0;background:none;overflow:hidden"><style><![CDATA[' + css + ']]></style>' + html + '</div></foreignObject></svg>'
        var img = new Image()
        img.onload = function () {
          try { var b = document.createElement('canvas'); b.width = Math.ceil(bw * sc); b.height = Math.ceil(bh * sc); b.getContext('2d').drawImage(img, 0, 0, b.width, b.height)
            it.bmp = b; it.bw = bw * it.s.k0; it.bh = bh * it.s.k0; ok() } catch (e) { bad(e) }
        }
        img.onerror = bad
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      })
    }
    function prepare(cb) {
      if (!W) return
      var gen = ++rasterGen, list = [], css = gatherCSS(), secR = sec.getBoundingClientRect(); rasterOK = false
      cards.forEach(function (c, k) {
        var s = c._s; if (!s || !s.show || !c.offsetWidth) return
        list.push({ c: c, k: k, s: s, x: s.x, y: s.y, d: Math.sqrt((s.x - cx) * (s.x - cx) + (s.y - cy) * (s.y - cy)), ang: Math.atan2(s.y - cy, s.x - cx) })
      })
      Promise.all(list.map(function (it) { return raster(it, css) })).then(function () {
        if (gen !== rasterGen) return
        /* a blank result means this browser would not draw the items this way: use the built-in fallback instead */
        try { var t = list[list.length - 1].bmp, px = t.getContext('2d').getImageData(0, 0, t.width, t.height).data, any = false; for (var i = 3; i < px.length; i += 97 * 4) if (px[i]) { any = true; break } if (!any) return } catch (e) {}
        items = list; rasterOK = true; if (cb) cb()
      }, function () {})
    }
    function drawItems(tt) {
      c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cv2.width, cv2.height); c2.imageSmoothingQuality = 'high'
      var SPREAD = .34, SWIRL = 1.45, live = 0
      for (var n = 0; n < items.length; n++) {
        var it = items[n], t = (tt - it.delay) / FLY_
        if (t >= 1) continue
        live++
        if (t <= 0) { c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.globalAlpha = 1; c2.drawImage(it.bmp, it.x - it.bw / 2, it.y - it.bh / 2, it.bw, it.bh); continue }
        var hor = it.hor, len = hor ? it.bw : it.bh, per = hor ? it.bh : it.bw, K = it.K, wS = len / K, bS = (hor ? it.bmp.width : it.bmp.height) / K, P = it.P, j
        for (j = 0; j < K; j++) {
          var o = it.sl[j], tk = Math.max(0, Math.min(1, (t - SPREAD * o.lag) / (1 - SPREAD))), e = Math.pow(tk, 2.5), rr = o.r0 * (1 - e), th = o.t0 + SWIRL * Math.pow(tk, 1.7) + .5 * e * e
          P[j * 3] = cx + rr * Math.cos(th); P[j * 3 + 1] = cy + rr * Math.sin(th); P[j * 3 + 2] = rr
        }
        for (j = 0; j < K; j++) {
          var o2 = it.sl[j], a = Math.max(j - 1, 0) * 3, b = Math.min(j + 1, K - 1) * 3, span = (b - a) / 3 || 1, vx = P[b] - P[a], vy = P[b + 1] - P[a + 1], l2 = Math.sqrt(vx * vx + vy * vy), rr2 = P[j * 3 + 2]
          var al = Math.max(0, Math.min(1, (rr2 - S * .1) / (S * .22))); if (al <= 0) continue
          var ang = l2 > .3 ? Math.atan2(vy, vx) - (hor ? 0 : 1.5708) : o2.pa; o2.pa = ang
          var sA = Math.max(.02, l2 / (span * wS)), near = Math.min(1, rr2 / o2.r0), sP = (.03 + .97 * Math.pow(near, 1.25)) * (.2 + .8 * Math.min(1, rr2 / (S * 1.5))), co = Math.cos(ang) * dpr, si = Math.sin(ang) * dpr, ov = .7 / sA
          c2.globalAlpha = al
          if (hor) { c2.setTransform(co * sA, si * sA, -si * sP, co * sP, P[j * 3] * dpr, P[j * 3 + 1] * dpr); c2.drawImage(it.bmp, j * bS, 0, bS, it.bmp.height, -wS / 2 - ov, -per / 2, wS + ov * 2, per) }
          else { c2.setTransform(co * sP, si * sP, -si * sA, co * sA, P[j * 3] * dpr, P[j * 3 + 1] * dpr); c2.drawImage(it.bmp, 0, j * bS, it.bmp.width, bS, -per / 2, -wS / 2 - ov, per, wS + ov * 2) }
        }
      }
      c2.globalAlpha = 1
      return live
    }
    function build() {
      if (domBuilt || !W) return
      clones.forEach(function (w) { if (w.parentNode) w.parentNode.removeChild(w) }); clones = []; jobs = []
      fx.classList.remove('q-noclones')
      var secR = sec.getBoundingClientRect(), small = W < 700, F = 30, SPREAD = .34, SWIRL = 1.45, frag = document.createDocumentFragment()
      cards.forEach(function (c, k) {
        var s = c._s; if (!s || !s.show) return
        var r = c.getBoundingClientRect(); if (!r.width) return
        var ccx = r.left - secR.left + r.width / 2, ccy = r.top - secR.top + r.height / 2, hor = Math.abs(cx - ccx) * r.height >= Math.abs(cy - ccy) * r.width * .6, len = hor ? r.width : r.height
        var K = Math.max(small ? 3 : 4, Math.min(small ? 12 : 24, Math.round(len / (small ? 20 : 24)))), jb = { c: c, k: k, s: s, r: r, hor: hor, K: K, sl: [], d: Math.sqrt((ccx - cx) * (ccx - cx) + (ccy - cy) * (ccy - cy)), ang: Math.atan2(ccy - cy, ccx - cx) }
        for (var s2 = 0; s2 < K; s2++) {
          var f0 = s2 / K * 100 - .5, f1 = 100 - (s2 + 1) / K * 100 - .5, wr = document.createElement('div'), of = document.createElement('div'), cl = c.cloneNode(true)
          var rx = ccx + (hor ? ((s2 + .5) / K - .5) * r.width : 0), ry = ccy + (hor ? 0 : ((s2 + .5) / K - .5) * r.height)
          wr.className = 'cz-w'; of.className = 'cz-o'; wr.style.left = rx + 'px'; wr.style.top = ry + 'px'; wr.style.zIndex = 100 + k
          cl.style.left = '0px'; cl.style.top = '0px'; cl.style.opacity = 1; cl.style.zIndex = ''
          cl.style.clipPath = hor ? 'inset(-30% ' + f1.toFixed(2) + '% -30% ' + f0.toFixed(2) + '%)' : 'inset(' + f0.toFixed(2) + '% -30% ' + f1.toFixed(2) + '% -30%)'
          of.appendChild(cl); wr.appendChild(of); frag.appendChild(wr); clones.push(wr); jb.sl.push({ wr: wr, of: of, cl: cl, x: rx, y: ry })
        }
        jobs.push(jb)
      })
      fx.insertBefore(frag, scan)
      jobs.forEach(function (jb) { jb.sl.forEach(function (o) { o.rc = o.cl.getBoundingClientRect() }) })
      jobs.forEach(function (jb) {
        var r = jb.r, hor = jb.hor, sl = jb.sl, K = jb.K, wS = (hor ? r.width : r.height) / K, rmin = 1e9, rmax = 0, j2, f
        sl.forEach(function (o) { o.of.style.transform = 'translate(' + (r.left - o.rc.left).toFixed(2) + 'px,' + (r.top - o.rc.top).toFixed(2) + 'px)'
          o.r0 = Math.sqrt((o.x - cx) * (o.x - cx) + (o.y - cy) * (o.y - cy)) || 1; o.t0 = Math.atan2(o.y - cy, o.x - cx); rmin = Math.min(rmin, o.r0); rmax = Math.max(rmax, o.r0); o.fr = []; o.pa = 0; o.rc = null })
        for (f = 0; f <= F; f++) {
          var t = f / F, P = sl.map(function (o) {
            var tk = Math.max(0, Math.min(1, (t - SPREAD * (o.r0 - rmin) / ((rmax - rmin) || 1)) / (1 - SPREAD))), e = Math.pow(tk, 2.5), rr = o.r0 * (1 - e), th = o.t0 + SWIRL * Math.pow(tk, 1.7) + .5 * e * e
            return [cx + rr * Math.cos(th), cy + rr * Math.sin(th), rr] })
          for (j2 = 0; j2 < K; j2++) {
            var o = sl[j2], a = P[Math.max(j2 - 1, 0)], b = P[Math.min(j2 + 1, K - 1)], span = (Math.min(j2 + 1, K - 1) - Math.max(j2 - 1, 0)) || 1, vx = b[0] - a[0], vy = b[1] - a[1], len2 = Math.sqrt(vx * vx + vy * vy)
            var ang = len2 > .6 ? Math.atan2(vy, vx) - (hor ? 0 : Math.PI / 2) : o.pa
            while (ang - o.pa > Math.PI) ang -= 6.2832; while (ang - o.pa < -Math.PI) ang += 6.2832; o.pa = ang
            var sA = K > 1 ? Math.max(.02, len2 / (span * wS) * 1.04) : Math.max(.05, P[j2][2] / o.r0), near = Math.min(1, P[j2][2] / o.r0), sP = (.03 + .97 * Math.pow(near, 1.25)) * (.2 + .8 * Math.min(1, P[j2][2] / (S * 1.5)))
            o.fr.push({ transform: 'translate(' + (P[j2][0] - o.x).toFixed(1) + 'px,' + (P[j2][1] - o.y).toFixed(1) + 'px) rotate(' + (ang * 57.2958).toFixed(1) + 'deg) scale(' + (hor ? sA.toFixed(3) + ',' + sP.toFixed(3) : sP.toFixed(3) + ',' + sA.toFixed(3)) + ')',
              opacity: Math.max(0, Math.min(1, (P[j2][2] - S * .1) / (S * .22))).toFixed(3) })
          }
        }
      })
      jobs.sort(function (p, q) { return p.d - q.d })
      fx.classList.add('q-noclones'); domBuilt = true
    }
    function A(el, frames, opt) { var a = el.animate(frames, opt); anims.push(a); return a }
    function reset() { anims.forEach(function (a) { a.cancel() }); anims = []; fold.on = false; foldEl.style.opacity = 0; ask.style.visibility = ''; ask.classList.remove('q-folding'); if (vid && vid.src) { try { vid.pause(); if (vid.currentTime > 0) vid.currentTime = 0 } catch (e) {} } fx.classList.add('q-noclones'); sk = []; timers.forEach(clearTimeout); timers = []; dust = 0; state = 'rest'; shape.style.opacity = 0; sec.classList.add('q-pre'); sec.classList.remove('q-done', 'q-lit', 'q-live', 'q-go', 'q-cvrun'); c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cv2.width, cv2.height); hx = hy = 0; hk = 1; fx.style.setProperty('--hx', '0px'); fx.style.setProperty('--hy', '0px'); layout() }
    var SOFT = 'cubic-bezier(.65,0,.15,1)', OUT = 'cubic-bezier(.16,.84,.24,1)'
    /* Before the pull: a quiet DocVex card asks whether to install. The answer is given without a pointer: a line of light
       crosses "Instalează", the words fade, and the card's own hairline border draws in to a ring at the centre, which becomes the rim of the core. */
    /* the wax behind the emblem is never quite still: its outline flows very slightly, like the living body it came from.
       The drawing itself is untouched; a slow displacement is applied on top of it. */
    if (!reduced) {
      var live = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); live.setAttribute('width', '0'); live.setAttribute('height', '0'); live.setAttribute('aria-hidden', 'true'); live.style.position = 'absolute'
      live.innerHTML = '<filter id="dvWaxLive" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="1" seed="7" result="n"><animate attributeName="baseFrequency" dur="19s" values="0.011;0.0155;0.0125;0.009;0.011" calcMode="spline" keyTimes="0;0.27;0.52;0.78;1" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="5.5" xChannelSelector="R" yChannelSelector="G"/></filter>'
      sec.appendChild(live)
    }
    var ask = fx.querySelector('.q-ask'), askIn = fx.querySelector('.q-ask-in'), foldEl = fx.querySelector('.q-fold'), foldR = foldEl.querySelector('rect'), fold = { on: false }
    var FOLD = 640
    function coreR0(g) { return S * (.02 + .42 * Math.pow(g, .9)) }   /* the body: a point at first, and larger with everything it takes in */
    function drawFold() {   /* the card draws in to a single point, in one unbroken move; the living body takes over from that exact point */
      var t = (performance.now() - fold.t0) / FOLD
      if (t <= 0) { foldEl.style.opacity = 0; return }
      if (t >= 1) { foldEl.style.opacity = 0; return }
      var e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, d = 2 * coreR0(0)
      var w = fold.w + (d - fold.w) * e, h = fold.h + (d - fold.h) * e, r = Math.min(w, h) / 2 * e + fold.r * (1 - e)
      foldR.setAttribute('x', (-w / 2).toFixed(2)); foldR.setAttribute('y', (-h / 2).toFixed(2)); foldR.setAttribute('width', w.toFixed(2)); foldR.setAttribute('height', h.toFixed(2)); foldR.setAttribute('rx', r.toFixed(2))
      foldR.style.fill = 'rgba(' + Math.round(18 - 11 * e) + ',' + Math.round(20 - 12 * e) + ',' + Math.round(23 - 13 * e) + ',' + (.9 + .1 * e).toFixed(2) + ')'
      foldR.style.stroke = 'rgba(' + Math.round(220 + 35 * e) + ',' + Math.round(201 + 31 * e) + ',' + Math.round(163 + 23 * e) + ',' + (.38 + .57 * e).toFixed(2) + ')'
      /* the glow the body will carry comes up only once the shape is small, so nothing large is ever blurred */
      var gl = Math.max(0, Math.min(1, (120 - Math.max(w, h)) / 100))
      foldEl.style.filter = gl > 0 ? 'drop-shadow(0 0 ' + (29 * gl).toFixed(0) + 'px rgba(255,236,196,' + (.5 * gl).toFixed(2) + '))' : 'none'
      foldEl.style.opacity = 0   /* the card element itself is what is seen drawing in; this only keeps the time */
    }
    function play() {
      reset(); state = 'intro'
      sealOutline()
      var go = ask.querySelector('.go'), no = ask.querySelector('.q-ask-f span'), sweep = go.querySelector('i'), PRE = 1650, w0 = ask.offsetWidth, h0 = ask.offsetHeight, ring = Math.max(26, S * .34), cs = getComputedStyle(ask)
      /* the answer */
      A(sweep, [{ transform: 'translateX(-120%)' }, { transform: 'translateX(220%)' }], { duration: 620, delay: 260, easing: 'cubic-bezier(.4,0,.2,1)' })
      A(no, [{ opacity: 1 }, { opacity: .25 }], { duration: 400, delay: 260, fill: 'forwards' })
      /* The card lets go of its words and draws in. Only opacity is animated on the card itself; the shape that draws in is one small
         vector outline redrawn each frame, so nothing is re-laid-out or re-blurred while it moves. */
      var d0 = PRE - 760
      /* The card itself becomes the singularity: the very same element draws in to a point (only its transform, corner radius and
         colour change, with its frosted backdrop switched off for the move), and the living body takes over from that point. */
      var f0 = d0 + 130, dd = 2 * coreR0(0), rad = cs.borderTopLeftRadius || '3px'
      A(askIn, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: f0, easing: 'ease-in', fill: 'forwards' })
      timers.push(setTimeout(function () { ask.classList.add('q-folding') }, f0))
      var fa = A(ask, [{ opacity: 1, transform: 'translate(-50%,-50%) scale(1,1)', borderRadius: rad + ' / ' + rad, backgroundColor: 'rgba(13,19,36,.94)', borderColor: 'rgba(220,201,163,.38)' },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(' + (dd / w0).toFixed(5) + ',' + (dd / h0).toFixed(5) + ')', borderRadius: (w0 / 2).toFixed(1) + 'px / ' + (h0 / 2).toFixed(1) + 'px', backgroundColor: 'rgb(5,8,15)', borderColor: 'rgba(255,232,186,.95)' }],
        { duration: FOLD, delay: f0, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' })
      /* the hand-over follows the card's own animation, not a clock: the body appears on the frame the card has finished */
      function handed() { if (!fold.on) return; fold.on = false; if (state === 'run') drawShape(); ask.style.visibility = 'hidden' }
      fa.onfinish = handed; timers.push(setTimeout(handed, f0 + FOLD + 500))
      fold = { t0: performance.now() + d0 + 130, w: w0, h: h0, r: parseFloat(cs.borderTopLeftRadius) || 3, ring: ring, on: true }
      /* the pull starts with the card: the first things leave the desktop on the same beat the card begins to draw in */
      timers.push(setTimeout(run, Math.max(0, d0 + 130 - 380 / 1.6)))
      if (!raf) raf = requestAnimationFrame(tick)
    }
    var sealFor = 0
    function sealOutline() {   /* the seal's outline as a distance from its centre at every angle; measured once per size, ahead of time */
      if (sealFor === S && sealR.length === NS) return
      var q; for (q = 0; q < NS; q++) sealR[q] = 0
      var sp = seal.querySelector('.gv-seal>path'), SL = sp.getTotalLength(), sc = S / 200
      for (q = 0; q < 720; q++) { var pt = sp.getPointAtLength(SL * q / 720), ax = pt.x - 100, ay = pt.y - 100, ai = Math.round((Math.atan2(ay, ax) + 6.2832) / 6.2832 * NS) % NS; sealR[ai] = Math.max(sealR[ai], Math.sqrt(ax * ax + ay * ay) * sc) }
      for (q = 0; q < NS; q++) if (!sealR[q]) sealR[q] = sealR[(q + NS - 1) % NS] || S * .43
      sealFor = S
    }
    function run() {
      state = 'run'; sec.classList.add('q-go')
      mode = vidOK ? 'vid' : rasterOK && items.length ? 'cv' : 'dom'
      if (mode === 'dom') { if (!domBuilt) build(); fx.classList.remove('q-noclones') }
      arrive = []
      if (mode === 'vid') { var vl = []; cards.forEach(function (c) { var s = c._s; if (s && s.show) vl.push({ ang: Math.atan2(s.y - cy, s.x - cx), d: Math.sqrt((s.x - cx) * (s.x - cx) + (s.y - cy) * (s.y - cy)) }) }); vl.sort(function (p, q) { return p.d - q.d }) }
      var list = mode === 'vid' ? vl : mode === 'cv' ? items.slice().sort(function (p, q) { return p.d - q.d }) : jobs, n = mode === 'vid' ? VX[vxKey] : list.length, RATE = 1.6, SCAN = 680 / RATE, tG = 380 / RATE, STEP = Math.min(34, 1150 / Math.max(1, n - 1)) / RATE, FLY = 860 / RATE, tC = tG + (n - 1) * STEP + FLY, tP = tC + 110 / RATE, PRESS = 620, HOLD = 700, HOME = 1500, tH = tP + PRESS + HOLD
      /* 1. a band of light reads across everything on the screen; the wallpaper lets go as the pull begins */
      A(scan, [{ transform: 'translateX(-260px)', opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .88 }, { transform: 'translateX(' + (W + 260) + 'px)', opacity: 0 }], { duration: SCAN, easing: 'cubic-bezier(.45,0,.55,1)' })
      if (mode !== 'vid') A(wall, [{ opacity: 1, transform: 'scale(1) rotate(0deg)', filter: 'blur(0px) brightness(1)' }, { opacity: .5, transform: 'scale(1.06) rotate(3deg)', filter: 'blur(6px) brightness(.8)', offset: .5 }, { opacity: 0, transform: 'scale(1.25) rotate(14deg)', filter: 'blur(22px) brightness(.5)' }],
        { duration: tC - tG - 150, delay: tG + 60, easing: 'cubic-bezier(.4,0,.8,.5)', fill: 'both' })
      FLY_ = FLY
      list.forEach(function (jb, i) {
        var c = jb.c, delay = mode === 'vid' ? tG + i / Math.max(1, list.length - 1) * (n - 1) * STEP : tG + i * STEP
        jb.delay = delay; arrive.push({ a: jb.ang + 1.1, t: delay + FLY * .84 })
        if (mode === 'vid') return
        if (mode === 'dom') {
          jb.sl.forEach(function (o) { A(o.wr, o.fr, { duration: FLY, delay: delay, fill: 'forwards' }) })
          A(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 1, delay: delay, fill: 'forwards' })
        } else if (!jb.sl || jb.geoW !== W) {   /* 2. strips about 5px wide; each remembers where it starts on the spiral */
          var hor = Math.abs(cx - jb.x) * jb.bh >= Math.abs(cy - jb.y) * jb.bw * .6, len = hor ? jb.bw : jb.bh, K = Math.max(8, Math.min(260, Math.ceil(len / 3.2))), rmin = 1e9, rmax = 0
          jb.hor = hor; jb.K = K; jb.sl = []; jb.P = new Float32Array(K * 3); jb.geoW = W
          for (var s2 = 0; s2 < K; s2++) { var ox2 = jb.x + (hor ? ((s2 + .5) / K - .5) * len : 0), oy2 = jb.y + (hor ? 0 : ((s2 + .5) / K - .5) * len), r0 = Math.sqrt((ox2 - cx) * (ox2 - cx) + (oy2 - cy) * (oy2 - cy)) || 1
            jb.sl.push({ r0: r0, t0: Math.atan2(oy2 - cy, ox2 - cx), pa: 0, lag: 0 }); rmin = Math.min(rmin, r0); rmax = Math.max(rmax, r0) }
          jb.sl.forEach(function (o) { o.lag = (o.r0 - rmin) / ((rmax - rmin) || 1); o.pa = 0 })
        } else jb.sl.forEach(function (o) { o.pa = 0 })
      })
      if (mode === 'cv') { t0 = performance.now(); cvLive = 1; drawItems(0); sec.classList.add('q-cvrun') }
      if (mode === 'vid') { try { if (vid.currentTime > 0) vid.currentTime = 0 } catch (e) {} vid.playbackRate = 1; var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {})
        A(vid, [{ opacity: 1 }, { opacity: 1, offset: (tC - 60) / (tP + 240) }, { opacity: 0 }], { duration: tP + 240, fill: 'forwards' }) }
      var q; sealOutline()
      t0 = performance.now(); tB = tP - BEND; tSwap = tP; tSuck0 = tG; burstAt = tP + 70; burstDone = false; tGrow0 = tG + FLY * .6; tGrow1 = tGrow0 + (n - 1) * STEP + 160; tLand = tH + HOME; sec.classList.add('q-live'); timers.push(setTimeout(function () { sec.classList.remove('q-live') }, tLand + 520))
      /* the ring is engraved around the pile */
      var home = 'translate(0,0)'
      ;[].forEach.call(rc, function (c, i) {
        var L = 2 * Math.PI * +c.getAttribute('r'); c.style.strokeDasharray = L; c.style.strokeDashoffset = L
        A(c, [{ strokeDashoffset: L * (i ? -1 : 1) }, { strokeDashoffset: 0 }], { duration: 760, delay: tC - 420 + i * 110, easing: SOFT, fill: 'forwards' })
      })
      var T = tH + HOME - (tC - 420), o1 = (tP + PRESS * .55 - (tC - 420)) / T, o2 = (tH - (tC - 420)) / T
      A(ring, [{ opacity: 1, transform: 'translate(0,0) scale(1.06) rotate(-90deg)' }, { opacity: 1, transform: 'translate(0,0) scale(1.06) rotate(-90deg)', offset: o1 * .9, easing: OUT }, { opacity: 1, transform: 'translate(0,0) scale(1) rotate(-90deg)', offset: o1 + .04 },
        { opacity: .9, transform: 'translate(0,0) scale(1) rotate(-90deg)', offset: o2, easing: SOFT }, { opacity: .32, transform: home + ' scale(1.22) rotate(-90deg)' }], { duration: T, delay: tC - 420, fill: 'forwards' })
      A(bloom, [{ opacity: 0, transform: 'translate(0,0) scale(.3)' }, { opacity: .95, transform: 'translate(0,0) scale(.8)', offset: (tP + PRESS * .5 - tC) / (tH + HOME - tC), easing: 'ease-out' },
        { opacity: .6, transform: 'translate(0,0) scale(1)', offset: (tH - tC) / (tH + HOME - tC), easing: SOFT }, { opacity: .42, transform: home + ' scale(1.15)' }], { duration: tH + HOME - tC, delay: tC, fill: 'forwards' })
      /* 4. the seal is pressed, holds a moment, then moves to its place */
      var at = 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px)', TS = PRESS + HOLD + HOME
      A(acc, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: .95, transform: 'scale(.62)', offset: (FLY * .6) / (tP - tG), easing: 'ease-out' }, { opacity: 1, transform: 'scale(1.05)', offset: (tB - tG) / (tP - tG), easing: 'cubic-bezier(.5,0,.9,.5)' }, { opacity: 0, transform: 'scale(.3)' }], { duration: tP - tG, delay: tG, fill: 'forwards' })
      /* the job is done: the emblem is struck into the wax in one beat, and everything around answers at once */
      A(seal, [{ opacity: 0, transform: at + ' scale(1)', '--seal-in': '#DCC9A3', filter: 'brightness(1)' },
        { opacity: 1, transform: at + ' scale(1.2)', '--seal-in': '#0f172a', filter: 'brightness(1.9)', offset: 80 / TS, easing: 'cubic-bezier(.2,.9,.3,1)' },
        { opacity: 1, transform: at + ' scale(.95)', filter: 'brightness(1.15)', offset: 250 / TS, easing: 'ease-out' }, { opacity: 1, transform: at + ' scale(1.025)', filter: 'brightness(1)', offset: 420 / TS, easing: 'ease-in-out' },
        { opacity: 1, transform: at + ' scale(1)', '--seal-in': '#0f172a', filter: 'brightness(1)', offset: PRESS / TS },
        { opacity: 1, transform: at + ' scale(1)', '--seal-in': '#0f172a', filter: 'brightness(1)', offset: (PRESS + HOLD) / TS, easing: SOFT }, { opacity: 1, transform: 'translate(0,0) scale(1)', '--seal-in': '#0f172a', filter: 'brightness(1)' }],
        { duration: TS, delay: tP, fill: 'backwards' })
      A(wave, [{ opacity: 0, transform: 'translate(0,0) scale(.8)' }, { opacity: 1, transform: 'translate(0,0) scale(1)', offset: .06 }, { opacity: 0, transform: 'translate(0,0) scale(4.2)' }], { duration: 1200, delay: tP + 60, easing: OUT })
      A(wave2, [{ opacity: 0, transform: 'translate(0,0) scale(.8)' }, { opacity: .7, transform: 'translate(0,0) scale(1)', offset: .08 }, { opacity: 0, transform: 'translate(0,0) scale(2.6)' }], { duration: 1500, delay: tP + 190, easing: OUT })
      A(rays, [{ opacity: 0, transform: 'translate(0,0) scale(.35) rotate(0deg)' }, { opacity: .9, transform: 'translate(0,0) scale(.9) rotate(6deg)', offset: .14 }, { opacity: 0, transform: 'translate(0,0) scale(1.45) rotate(14deg)' }], { duration: 1300, delay: tP + 40, easing: OUT })
      A(bloom, [{ opacity: .9, transform: 'translate(0,0) scale(.6)', filter: 'brightness(1)' }, { opacity: 1, transform: 'translate(0,0) scale(1.4)', filter: 'brightness(3)', offset: .12 }, { opacity: .7, transform: 'translate(0,0) scale(.95)', filter: 'brightness(1)' }], { duration: 1100, delay: tP + 40, easing: 'ease-out' })
      /* the stage lights come on: a spot from above, a pool of light and a shadow on the floor beneath the seal */
      A(spot2, [{ opacity: 0 }, { opacity: 1, offset: .05 }, { opacity: .55, offset: .09 }, { opacity: 1, offset: .14 }, { opacity: 1, offset: (PRESS + HOLD) / (PRESS + HOLD + HOME), easing: SOFT }, { opacity: .6 }], { duration: PRESS + HOLD + HOME, delay: tP + 30, fill: 'forwards' })
      A(floor, [{ opacity: 0, transform: 'scale(.5,.6)' }, { opacity: 1, transform: 'scale(1.12,1.1)', offset: .1, easing: 'ease-out' }, { opacity: 1, transform: 'scale(1)', offset: .22 }, { opacity: 1, transform: 'scale(1)', offset: (PRESS + HOLD) / (PRESS + HOLD + HOME), easing: SOFT }, { opacity: .7, transform: 'scale(.9)' }], { duration: PRESS + HOLD + HOME, delay: tP + 30, fill: 'forwards' })
      A(fx, [{ transform: 'scale(1)' }, { transform: 'scale(1.045)', offset: .16 }, { transform: 'scale(.992)', offset: .5 }, { transform: 'scale(1)' }], { duration: 700, delay: tP + 50, easing: 'ease-out' })
      A(dial, [{ opacity: 0, transform: 'translate(0,0) scale(.6)' }, { opacity: .7, transform: 'translate(0,0) scale(1)', offset: 520 / (PRESS + HOLD + HOME), easing: SOFT }, { opacity: .55, transform: 'translate(0,0) scale(1)', offset: (PRESS + HOLD) / (PRESS + HOLD + HOME), easing: SOFT }, { opacity: .42, transform: home + ' scale(1)' }],
        { duration: PRESS + HOLD + HOME, delay: tP + 60, easing: OUT, fill: 'forwards' })
      /* 5. the name is written beside it, then the words below */
      A(word, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-14px)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'translateX(0)' }], { duration: 1100, delay: tH + HOME * .5, easing: OUT, fill: 'backwards' })
      ;[].forEach.call(inn.children, function (el, i) {
        if (el.classList.contains('closer-brand')) return
        A(el, [{ opacity: 0, transform: 'translateY(26px)', filter: 'blur(8px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], { duration: 1100, delay: tH + HOME * .78 + i * 150, easing: OUT, fill: 'backwards' })
      })
      sec.classList.remove('q-pre')
      timers.push(setTimeout(function () { fx.classList.add('q-noclones') }, tP + 400))
       timers.push(setTimeout(function () { sec.classList.add('q-lit') }, tH + HOME * .4))
      timers.push(setTimeout(function () { state = 'done'; sec.classList.add('q-done') }, tH + HOME + 1400)); timers.push(setTimeout(settle, tH + HOME + 900))
      if (!raf) raf = requestAnimationFrame(tick)
    }
    /* a little gold dust hangs in the light afterwards */
    function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x) }
    function follow() {   /* everything behind the seal is tied to where the seal actually is, frame by frame */
      var r = seal.getBoundingClientRect(), f = sec.getBoundingClientRect()
      if (state === 'rest' || !r.width) { hx = hy = 0; hk = 1 } else { hx = r.left + r.width / 2 - f.left - cx; hy = r.top + r.height / 2 - f.top - cy; hk = r.width / S }
      if (state === 'run' && performance.now() - t0 < tSwap) { hx = hy = 0; hk = 1 }
      fx.style.setProperty('--hx', hx.toFixed(1) + 'px'); fx.style.setProperty('--hy', hy.toFixed(1) + 'px')
    }
    function drawShape() {   /* a living body: it grows as it swallows each paper, flows into the seal's outline, and keeps breathing until it has landed */
      var tt = performance.now() - t0, op = (fold.on ? 0 : 1) * (tt > tSuck0 ? 1 : 0) * (1 - sm((tt - (tLand + 480)) / 320))   /* it appears on the frame the card has finished drawing in */
      shape.style.opacity = op.toFixed(3); if (op <= 0) return
      var g = 0, u = Math.max(0, Math.min(1, (tt - tB) / BEND)), ts = tt / 1000, d = '', pts = [], q
      for (q = 0; q < arrive.length; q++) g += sm((tt - arrive[q].t) / 200)   /* it grows by what it has actually swallowed, piece by piece */
      g = arrive.length ? g / arrive.length : sm((tt - tGrow0) / (tGrow1 - tGrow0))
      var R0 = coreR0(g), calm = 1 - sm((tt - (tLand - 250)) / 800), life = (tt < tSwap ? .022 + .02 * Math.sin(Math.PI * u) : .05) * calm
      var hot = tt > tSwap ? Math.exp(-(tt - tSwap) / 170) : 0
      for (q = 0; q < NS; q++) {
        var th = q / NS * 6.2832, lag = .5 + .5 * Math.sin(th * 2 + 1.1), xi = Math.max(0, Math.min(1, u * 1.15 - .15 * lag))
        var e = xi < .5 ? 4 * xi * xi * xi : 1 - Math.pow(-2 * xi + 2, 3) / 2
        var breathe = 1 + life * (.5 * Math.sin(th * 3 + ts * 2.6) + .34 * Math.sin(th * 5 - ts * 1.9 + 1) + .42 * Math.sin(th * 2 + ts * 1.3 + 2) + .2 * Math.sin(th * 7 + ts * 3.4))
        var bump = 0
        if (tt < tB + 200) for (var k = 0; k < arrive.length; k++) { var age = tt - arrive[k].t; if (age > 0 && age < 420) { var c2 = Math.cos(th - arrive[k].a); if (c2 > 0) bump += S * .028 * Math.exp(-age / 160) * c2 * c2 } }
        var r = ((R0 + bump) * (1 - e) + sealR[q] * e) * breathe * hk * (1 + .1 * hot)
        pts.push([Math.cos(th) * r, Math.sin(th) * r])
      }
      for (q = 0; q < NS; q++) {
        var p0 = pts[q], p1 = pts[(q + 1) % NS], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2
        d += q ? 'Q' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1) : 'M' + mx.toFixed(1) + ' ' + my.toFixed(1)
      }
      p0 = pts[0]; p1 = pts[1]; shp.setAttribute('d', d + 'Q' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' ' + ((p0[0] + p1[0]) / 2).toFixed(1) + ' ' + ((p0[1] + p1[1]) / 2).toFixed(1) + 'Z')
      shape.style.transform = 'translate(' + hx.toFixed(1) + 'px,' + hy.toFixed(1) + 'px)'
      var cu = sm((u - .25) / .75), glow = Math.sin(Math.PI * u) * (tt < tSwap ? 1 : 0) + hot + .5 * (1 - cu), mix = function (a, b) { return Math.round((a + (b - a) * cu) * (1 - hot * .8) + 255 * hot * .8) }
      shp.style.fill = 'rgb(' + mix(7, 220) + ',' + mix(8, 201) + ',' + mix(10, 163) + ')'; shp.style.stroke = 'rgba(255,232,186,' + (.95 * (1 - cu)).toFixed(3) + ')'; shp.style.strokeWidth = (1.2 + 1.6 * g).toFixed(2)
      shape.style.filter = 'drop-shadow(0 0 ' + (16 + 26 * glow).toFixed(0) + 'px rgba(255,236,196,' + Math.min(.95, .3 + .4 * glow).toFixed(2) + ')) drop-shadow(0 12px 16px rgba(0,0,0,.45))'
    }
    function tick() {
      raf = 0
      if (settleUntil) { if (performance.now() > settleUntil) settleUntil = 0; var sr = fx.getBoundingClientRect(); if (sr.height && Math.abs(sr.height - H) > .5) { H = sr.height; cy = H / 2; fx.style.setProperty('--cy', cy + 'px') } }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); if (fold.on) drawFold(); follow(); ctx.translate(hx, hy)
      if (state === 'run') {
        if (mode === 'cv' && cvLive) cvLive = drawItems(performance.now() - t0)
        var tq = performance.now() - t0, ccx2 = cx + pX * 10, ccy2 = cy + pY * 7
        if (tq > tSuck0 && tq < tSwap - 120) for (var z = 0; z < (W < 700 ? 2 : 5); z++) { var zr = S * 1.4 + Math.random() * Math.max(W, H) * .5; sk.push({ r: zr, r0: zr, a: Math.random() * 6.2832, w: .5 + Math.random() * 1.3 }) }
        ctx.lineCap = 'round'
        for (var y2 = sk.length - 1; y2 >= 0; y2--) {
          var p2 = sk[y2], x0 = ccx2 + Math.cos(p2.a) * p2.r, y0 = ccy2 + Math.sin(p2.a) * p2.r, v2 = 2.5 + 2600 / (p2.r + 30)
          p2.r -= v2; p2.a += v2 * 1.25 / (p2.r + 40)
          if (p2.r < S * .22) { sk.splice(y2, 1); continue }
          ctx.strokeStyle = 'rgba(245,226,184,' + (.55 * Math.min(1, (p2.r0 - p2.r) / 90) * Math.min(1, (p2.r - S * .22) / 70)).toFixed(3) + ')'; ctx.lineWidth = p2.w
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ccx2 + Math.cos(p2.a) * p2.r, ccy2 + Math.sin(p2.a) * p2.r); ctx.stroke()
        }
        drawShape()
        if (!burstDone && performance.now() - t0 >= burstAt) {
          burstDone = true; dust = 1
          for (var b2 = 0; b2 < (W < 700 ? 60 : 130); b2++) { var an = Math.random() * 6.2832, v = 4 + Math.random() * 17
            motes.push({ x: cx + Math.cos(an) * S * .42, y: cy + Math.sin(an) * S * .42, bx: Math.cos(an) * v, by: Math.sin(an) * v, r: .5 + Math.random() * 1.8, vy: -.05 - Math.random() * .15, ph: Math.random() * 6.28, a: 0, m: .35 + Math.random() * .6, t: 115, life: 320 + Math.random() * 520 }) }
        }
      }
      if (dust) {
        if (motes.length < (W < 700 ? 18 : 38) && burstDone && Math.random() < .2) motes.push({ x: Math.random() * W, y: Math.random() * H, r: .5 + Math.random() * 1.5, vy: -.06 - Math.random() * .2, ph: Math.random() * 6.28, a: 0, m: .08 + Math.random() * .3, t: 0, life: 500 + Math.random() * 700 })
        for (var k = motes.length - 1; k >= 0; k--) {
          var p = motes[k]; p.t++; p.ph += .012; p.y += p.vy; p.x += Math.sin(p.ph) * .18; if (p.bx) { p.x += p.bx; p.y += p.by; p.bx *= .93; p.by *= .93; p.m = Math.max(.12, p.m * .992); if (Math.abs(p.bx) + Math.abs(p.by) < .05) p.bx = p.by = 0 }
          p.a = p.m * Math.min(1, p.t / 120) * Math.min(1, (p.life - p.t) / 120)
          if (p.t > p.life) { motes.splice(k, 1); continue }
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
          g.addColorStop(0, 'rgba(240,222,180,' + p.a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(240,222,180,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill()
        }
      } else motes = []
      if ((vis || settleUntil) && state !== 'rest') raf = requestAnimationFrame(tick)
    }
    /* parallax: the layers of the scene shift by depth with the pointer and with the scroll */
    var pTx = 0, pTy = 0, pSy = 0, pX = 0, pY = 0, pRaf = 0
    function par() {
      pRaf = 0; var ty = pTy + pSy; pX += (pTx - pX) * .09; pY += (ty - pY) * .09
      sec.style.setProperty('--px', pX.toFixed(4)); sec.style.setProperty('--py', pY.toFixed(4))
      if (vis && (Math.abs(pTx - pX) > .002 || Math.abs(ty - pY) > .002)) pRaf = requestAnimationFrame(par)
    }
    function kick() { if (!pRaf) pRaf = requestAnimationFrame(par) }
    sec.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var r = sec.getBoundingClientRect(); pTx = ((e.clientX - r.left) / r.width - .5) * 2; pTy = ((e.clientY - r.top) / r.height - .5) * 2; kick() })
    sec.addEventListener('pointerleave', function () { pTx = 0; pTy = 0; kick() })
    addEventListener('scroll', function () { if (!vis) return; var r = sec.getBoundingClientRect(), vh = window.innerHeight; pSy = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh)) * 1.2; kick() }, { passive: true })
    /* The pull itself is a pre-rendered film (true image warp, motion blur), so it plays the same on every computer.
       It is fetched only when the section is getting close; if it cannot play, the items are drawn live instead. */
    function askVideo() {
      if (vidAsked || !vid || !W) return; vidAsked = true
      var small = W < 700, base = (isMac ? 'mac' : 'win') + (small ? '-m' : ''), hd = !small && H * (window.devicePixelRatio || 1) > 1020
      vxKey = base
      if (!VX[base] || !vid.canPlayType || !vid.canPlayType('video/mp4; codecs="avc1.640033"')) { prepare(); return }
      vid.poster = '/vortex/' + base + '.jpg'
      vid.addEventListener('canplaythrough', function () { if (!vidOK) { vidOK = true; sec.classList.add('q-vidok'); if (state === 'rest') { var w = vid.play(); if (w && w.then) w.then(function () { if (state === 'rest' || state === 'intro') { vid.pause(); try { vid.currentTime = 0 } catch (e) {} } }, function () {}) } } })
      vid.addEventListener('error', function () { vidOK = false; sec.classList.remove('q-vidok'); prepare() })
      vid.src = '/vortex/' + base + (small ? '' : hd ? '-hd' : '-sd') + '.mp4'; vid.preload = 'auto'; vid.load()
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { if (e[0].isIntersecting) askVideo() }, { rootMargin: '2600px 0px' }).observe(mark)
    /* used only when the animation is baked to video */
    sec.__q = { bake: function (o) { forceK = o.k || 0; rasterScale = o.scale || 0; lastW = 0; layout(); clearTimeout(buildT)
      return new Promise(function (ok) { prepare(function () { ok({ W: W, H: H, cx: cx, cy: cy, S: S, bg: getComputedStyle(wall).backgroundImage, items: items.map(function (it) { return { k: it.k, x: it.x, y: it.y, bw: it.bw, bh: it.bh, d: it.d, ang: it.ang } }) }) }) }) },
      bmp: function (i) { return items[i].bmp } }
    /* The scene takes over the whole screen once, when the visitor reaches it: the page lines the section up with the window, the navbar
       steps aside and scrolling is held until the seal has landed. Afterwards the section settles to its normal height and never replays. */
    var played = false, locked = false, navEl = null, settleUntil = 0, safeT = 0, busy = false
    function hold(e) { if (locked) { e.preventDefault(); skip() } }
    function holdKey(e) { if (locked && /^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| |Spacebar|Escape|Enter)$/.test(e.key)) { e.preventDefault(); skip() } }
    /* A scroll, a click or a key during the scene skips it: the scene dissolves, everything is taken straight to its final state,
       and the finished panel comes up already part of the page. */
    var skipping = false
    function skip() {
      if (skipping || (state !== 'intro' && state !== 'run')) return
      skipping = true
      var veil = document.createElement('i'); veil.className = 'vx-veil vx-in'; sec.appendChild(veil)
      var fin = veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in-out', fill: 'forwards' })
      fin.onfinish = function () {
        try {
          if (state === 'intro') { timers.forEach(clearTimeout); timers = []; run() }
          timers.forEach(clearTimeout); timers = []
          anims.forEach(function (a) { try { a.finish() } catch (e) {} })
          fold.on = false; foldEl.style.opacity = 0; ask.style.visibility = 'hidden'; shape.style.opacity = 0
          if (vid && vid.src) { try { vid.pause() } catch (e) {} }
          fx.classList.add('q-noclones'); c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cv2.width, cv2.height); sk = []; burstDone = true; dust = 1; cvLive = 0
          sec.classList.remove('q-pre', 'q-live'); sec.classList.add('q-go', 'q-lit', 'q-done'); state = 'done'
          settle()
        } catch (e) {}
        var out = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })
        out.onfinish = function () { if (veil.parentNode) veil.parentNode.removeChild(veil); skipping = false }
      }
    }
    sec.addEventListener('click', function (e) { if ((state === 'intro' || state === 'run') && !e.target.closest('.q-replay')) skip() })
    function lock() { if (locked) return; locked = true; addEventListener('wheel', hold, { passive: false }); addEventListener('touchmove', hold, { passive: false }); addEventListener('keydown', holdKey) }
    function unlock() { if (!locked) return; locked = false; removeEventListener('wheel', hold); removeEventListener('touchmove', hold); removeEventListener('keydown', holdKey) }
    function navHide(on) { navEl = navEl || (sec.closest('.site') || document).querySelector('.nav'); if (navEl) navEl.classList.toggle('vx-hide', on) }
    function begin(again) {   /* the page fades to dark, and the scene fades in as a fixed layer over the whole window */
      if ((played && !again) || busy) return; played = true; busy = true; lock(); navHide(true)
      var veil = document.createElement('i'); veil.className = 'vx-veil'; document.body.appendChild(veil)
      var fin = veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-in', fill: 'forwards' })
      fin.onfinish = function () {
        if (again) { sec.style.transition = 'none'; sec.classList.add('q-full', 'q-fixed'); settleUntil = 0; reset(); void sec.offsetHeight; sec.style.transition = '' }
        else if (Math.abs(fx.getBoundingClientRect().height - H) > 1 || Math.abs(fx.getBoundingClientRect().width - W) > 1) layout()
        sec.classList.add('q-show')
        var out = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })
        out.onfinish = function () { if (veil.parentNode) veil.parentNode.removeChild(veil) }
        setTimeout(play, 620)
      }
      clearTimeout(safeT); safeT = setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); if (locked && state !== 'done') settle() }, 14000)   /* never leave the page held or covered, whatever happens */
    }
    function settle() {   /* the fixed layer becomes an ordinary section: it is put into the page exactly where the window is, then eases to its normal height */
      clearTimeout(safeT); busy = false
      if (!sec.classList.contains('q-fixed')) return
      sec.style.transition = 'none'; sec.classList.remove('q-fixed', 'q-show'); void sec.offsetHeight
      window.scrollTo(0, sec.getBoundingClientRect().top + window.pageYOffset)
      sec.style.transition = ''; void sec.offsetHeight
      unlock(); navHide(false); settleUntil = performance.now() + 1300; sec.classList.remove('q-full')
      setTimeout(function () { size() }, 1350)
      if (!raf) raf = requestAnimationFrame(tick)
    }
    var again = sec.querySelector('.q-replay'); if (again) again.addEventListener('click', function () {   /* replay in place: the section dissolves, resets and plays again where it is */
      if (state !== 'done' || busy) return; busy = true
      var veil = document.createElement('i'); veil.className = 'vx-veil vx-in'; sec.appendChild(veil)
      veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in-out', fill: 'forwards' }).onfinish = function () {
        settleUntil = 0; reset()
        var out = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })
        out.onfinish = function () { if (veil.parentNode) veil.parentNode.removeChild(veil); busy = false }
        setTimeout(play, 380)
      }
    })
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        vis = e[0].isIntersecting
        if (vis && !played && e[0].intersectionRatio > .45) { played = true; play() }
        else if (vis && !raf && state !== 'rest') raf = requestAnimationFrame(tick)
      }, { threshold: [0, .45, .7] }).observe(sec)
    }
    else { sec.classList.remove('q-pre', 'q-fixed', 'q-full'); sec.classList.add('q-lit') }
    addEventListener('resize', function () { if (state === 'rest') layout(); else if (state === 'done') { size() } })
    layout(); addEventListener('load', function () { if (state === 'rest') layout() }); setTimeout(function () { if (state === 'rest') layout() }, 1200)
  })
  document.querySelectorAll('.closer:not(.cl2)').forEach(function (sec) {
    var fx = sec.querySelector('.closer-fx'), cards = [].slice.call(fx.querySelectorAll('.cz')), cv = fx.querySelector('canvas'), ctx = cv.getContext('2d')
    var sealBox = sec.querySelector('.closer-seal'), W = 0, H = 0, cx = 0, cy = 0, dpr = 1, parts = [], raf = 0, playing = false, idle = false, anims = [], timers = []
    if (reduced || !fx.animate) return
    sec.classList.add('pre')
    function size() {
      var r = fx.getBoundingClientRect(), s = sealBox.getBoundingClientRect()
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = W * dpr; cv.height = H * dpr; cx = W / 2; cy = H / 2
      sec.style.setProperty('--ox', (cx - (s.left - r.left + s.width / 2)) + 'px'); sec.style.setProperty('--oy', (cy - (s.top - r.top + s.height / 2)) + 'px')
      fx.style.setProperty('--cx', cx + 'px'); fx.style.setProperty('--cy', cy + 'px')
    }
    function rnd(a, b) { return a + Math.random() * (b - a) }
    var COL = ['#F5F2EA', '#DCC9A3', '#e9e4d6', '#8B5E3C', '#c9b184']
    function burst(n, jets) {
      for (var k = 0; k < n; k++) {
        var a, v, y0 = cy
        if (jets) {
          var r = Math.random()
          if (r < .62) { a = (Math.random() < .5 ? 0 : Math.PI) + rnd(-.3, .16); v = rnd(9, 34); y0 = cy + 19 }
          else if (r < .9) { a = -Math.PI / 2 + rnd(-1.15, 1.15); v = rnd(5, 19); y0 = cy + 10 }
          else { a = rnd(0, 6.283); v = rnd(2, 8) }
        } else { a = rnd(0, 6.283); v = rnd(2, 14) }
        parts.push({ t: 's', x: cx, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rnd(.8, jets ? 3 : 3.2), life: 1, d: rnd(.014, .032), g: jets ? .22 : .12, stay: !!jets, rest: rnd(.1, .3) })
      }
      if (!jets) return
      /* scraps of paper thrown up by the blow: they tumble, flutter down and stay */
      for (k = 0; k < Math.round(n * .2); k++) {
        a = -Math.PI / 2 + rnd(-1.35, 1.35); v = rnd(5, 17)
        parts.push({ t: 'p', x: cx + rnd(-30, 30), y: cy + 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(5, 13), h: rnd(4, 9), rot: rnd(0, 6.28), vr: rnd(-.3, .3), flip: rnd(0, 6.28), vf: rnd(.12, .3),
          col: COL[(Math.random() * COL.length) | 0], life: 1, stay: true, rest: rnd(.12, .3), ph: rnd(0, 6.28) })
      }
      /* dust rolling out along the surface on both sides */
      for (k = 0; k < 14; k++) {
        var sd = k % 2 ? 1 : -1
        parts.push({ t: 'd', x: cx + sd * rnd(10, 50), y: cy + 30 + rnd(-6, 10), vx: sd * rnd(2.5, 8), vy: rnd(-1.1, -.1), r: rnd(16, 34), gr: rnd(.9, 1.7), life: 1, d: rnd(.011, .02) })
      }
    }
    function paint() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H)
      var RF = Math.max(260, Math.min(W, H) * .62), k, p, al, dd, fall
      for (k = 0; k < parts.length; k++) {           /* dust first, underneath */
        p = parts[k]; if (p.t !== 'd') continue
        var gd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        gd.addColorStop(0, 'rgba(220,201,163,' + (.2 * p.life).toFixed(3) + ')'); gd.addColorStop(1, 'rgba(220,201,163,0)')
        ctx.globalAlpha = 1; ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      }
      for (k = 0; k < parts.length; k++) {
        p = parts[k]; if (p.t === 'd') continue
        dd = Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy)) / RF; fall = dd >= 1 ? 0 : (1 - dd) * (1 - dd)
        if (p.t === 'p') {
          al = Math.max(p.rest, Math.min(1, p.life * 1.3)) * (p.life > p.rest ? Math.max(fall, .5) : fall); if (al < .01) continue
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.flip) * .85 + .15)
          ctx.globalAlpha = al; ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.globalAlpha = al * .35; ctx.fillStyle = '#15213A'; ctx.fillRect(-p.w / 2 + 1.5, -p.h / 2 + 1.5, p.w * .6, 1); ctx.restore(); continue
        }
        al = Math.min(1, p.life * 1.4)
        var sp = Math.abs(p.vx) + Math.abs(p.vy)
        if (p.stay) al = Math.max(p.rest, al) * (sp > 1.5 ? Math.max(fall, .6) : fall)
        if (al < .01) continue
        var hot = p.life > .78 ? '#FFF6DF' : p.life > .45 ? '#EBD9B0' : p.life > .3 ? '#DCC9A3' : '#b89868'
        if (sp > 1.5) {           /* still flying: a streak along its path, brighter at the head */
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * .9; ctx.strokeStyle = hot; ctx.lineWidth = p.r * 1.1; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 1.9, p.y - p.vy * 1.9); ctx.stroke()
          ctx.globalAlpha = al * .22; ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.283); ctx.fill()
          ctx.globalCompositeOperation = 'source-over'
        } else { ctx.globalAlpha = al; ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill() }
      }
    }
    function tick() {
      var moving = false, floor = cy + 70
      for (var k = parts.length - 1; k >= 0; k--) {
        var p = parts[k]
        if (p.t === 'd') { p.x += p.vx; p.y += p.vy; p.vx *= .94; p.r += p.gr; p.gr *= .97; p.life -= p.d; if (p.life <= 0) { parts.splice(k, 1); continue } moving = true; continue }
        if (p.t === 'p') {
          var s2 = Math.abs(p.vx) + Math.abs(p.vy)
          if (s2 > .05 || p.y < floor - 4) {
            p.ph += .16; p.vx = p.vx * .955 + Math.sin(p.ph) * .09; p.vy = Math.min(2.2, p.vy * .955 + .17)
            p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += p.vf
            if (p.y > floor + (p.ph % 1) * 60) { p.vx = p.vy = 0; p.vr = 0; p.vf = 0; p.y = Math.min(p.y, floor + 60) }
            moving = true
          }
          if (p.life > p.rest) { p.life -= .008; moving = true }
          continue
        }
        if (p.stay) {
          var sp = Math.abs(p.vx) + Math.abs(p.vy)
          if (sp > .04) { p.x += p.vx; p.y += p.vy; p.vx *= .925; p.vy = p.vy * .925 + p.g * Math.min(1, sp / 9); moving = true }
          if (p.life > p.rest) { p.life -= p.d; moving = true }
          continue
        }
        p.x += p.vx; p.y += p.vy; p.vx *= .955; p.vy = p.vy * .955 + p.g; p.life -= p.d
        if (p.life <= 0) { parts.splice(k, 1); continue }
        moving = true
      }
      paint()
      if (playing || moving) raf = requestAnimationFrame(tick); else raf = 0
    }
    function stop() { anims.forEach(function (a) { a.cancel() }); anims = []; var cc = fx.querySelector('.cz-core'); if (cc) cc.style.cssText = ''; timers.forEach(clearTimeout); timers = []; parts = []; playing = idle = false; sec.classList.remove('gather', 'gavel'); if (W) paint() }
    function ss(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x) }
    function spot(k) {   /* each piece's place in the grid */
      var n = cards.length, small = W < 700, m = small ? k / 2 : k, cols = small ? 3 : 6, rows = Math.ceil((small ? Math.ceil(n / 2) : n) / cols)
      var padX = small ? 18 : Math.max(60, (W - 1240) / 2 + 20), padY = small ? 40 : 54
      return { small: small, m: m, k0: small ? .64 : 1, show: !(small && k % 2),
        x: padX + (W - padX * 2) * ((m % cols) + .5) / cols, y: padY + (H - padY * 2) * (Math.floor(m / cols) + .5) / rows }
    }
    function layout() {   /* the pieces rest in the grid whenever the animation is not running */
      size()
      cards.forEach(function (c, k) {
        var s = spot(k)
        c.style.left = s.x + 'px'; c.style.top = s.y + 'px'
        c.style.transform = 'translate(-50%,-50%) scale(' + s.k0 + ')'; c.style.opacity = s.show ? 1 : 0
      })
    }
    var core = fx.querySelector('.cz-core')
    var swirl = core.querySelector('b'), spinAt = 0
    function feed(i, cnt, ux, uy) {   /* the singularity swallows one piece: it swells, recoils from the blow and sends out a ripple */
      if (!playing) return
      var g = (i + 1) / cnt, s0 = .1 + 1.05 * Math.pow(i / cnt, .8), s1 = .1 + 1.05 * Math.pow(g, .8), kick = 3 + 5 * g
      core.style.transform = 'scale(' + s1.toFixed(3) + ')'
      if (!i) {   /* birth: the first piece folds into a point of light */
        core.style.opacity = 1
        anims.push(core.animate([{ opacity: 0, transform: 'scale(.62)', filter: 'brightness(2.4)' }, { opacity: 1, transform: 'scale(.34)', filter: 'brightness(2)', offset: .35 },
          { opacity: 1, transform: 'scale(' + (s1 * .8).toFixed(3) + ')', filter: 'brightness(1.2)', offset: .75 }, { opacity: 1, transform: 'scale(' + s1.toFixed(3) + ')', filter: 'brightness(1)' }], { duration: 460, easing: 'ease-out' }))
        return
      }
      anims.push(core.animate([
        { transform: 'translate(0,0) scale(' + s0.toFixed(3) + ')', filter: 'brightness(1)' },
        { transform: 'translate(' + (ux * kick).toFixed(1) + 'px,' + (uy * kick).toFixed(1) + 'px) scale(' + (s1 * 1.34 + .05).toFixed(3) + ')', filter: 'brightness(1.7)', offset: .28 },
        { transform: 'translate(' + (-ux * kick * .4).toFixed(1) + 'px,' + (-uy * kick * .4).toFixed(1) + 'px) scale(' + (s1 * .93).toFixed(3) + ')', filter: 'brightness(1.1)', offset: .62 },
        { transform: 'translate(0,0) scale(' + s1.toFixed(3) + ')', filter: 'brightness(1)' }], { duration: 300, easing: 'ease-out' }))
      if (swirl) { var r0 = spinAt; spinAt += 55 + 40 * g; swirl.style.transform = 'rotate(' + spinAt + 'deg)'; anims.push(swirl.animate([{ transform: 'rotate(' + r0 + 'deg)' }, { transform: 'rotate(' + spinAt + 'deg)' }], { duration: 420, easing: 'cubic-bezier(.1,.7,.2,1)' })) }
      var rip = document.createElement('i'); rip.className = 'cz-rip'; fx.appendChild(rip)
      var ra = rip.animate([{ transform: 'scale(' + (.3 + s1 * .9).toFixed(2) + ')', opacity: .85 }, { transform: 'scale(' + (1.6 + s1 * 3.2).toFixed(2) + ')', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.1,.7,.3,1)' })
      ra.onfinish = ra.oncancel = function () { if (rip.parentNode) rip.parentNode.removeChild(rip) }; anims.push(ra)
      /* a few sparks thrown off the far side of the blow */
      for (var q = 0; q < (W < 700 ? 3 : 5); q++) {
        var an = Math.atan2(uy, ux) + rnd(-.9, .9), v = rnd(2.5, 7 + 5 * g)
        parts.push({ t: 's', x: cx, y: cy, vx: Math.cos(an) * v, vy: Math.sin(an) * v, r: rnd(.7, 2.2), life: 1, d: rnd(.03, .055), g: .04 })
      }
    }
    function play() {
      stop(); layout(); playing = true
      sec.classList.remove('done', 'hit'); sec.classList.add('pre')
      var small = W < 700, N = 44, D = 640, D0 = 900, FIRST = 820
      var shown = []; cards.forEach(function (c, k) { var s = spot(k); if (s.show) shown.push({ c: c, s: s, k: k, a: Math.atan2(s.y - cy, s.x - cx) }) })
      shown.sort(function (p, q) { return p.a - q.a })
      var cnt = shown.length, STEP = small ? 190 : 108, stride = cnt % 5 ? 5 : 7
      /* there is no singularity yet: the first piece to reach the centre collapses into it */
      core.style.opacity = 0; spinAt = 0; if (swirl) swirl.style.transform = 'rotate(0deg)'
      for (var i = 0; i < cnt; i++) (function (i) {
        var it = shown[(i * stride) % cnt], c = it.c, s = it.s, k0 = s.k0
        var dx = cx - s.x, dy = cy - s.y, len = Math.sqrt(dx * dx + dy * dy) || 1, side = it.k % 2 ? 1 : -1
        var nx = -dy / len * side, ny = dx / len * side, arc = len * .2, spin = side * rnd(120, 260), delay = i ? FIRST + (i - 1) * STEP : 0, dur = i ? D : D0, ph = rnd(0, 6.28)
        var frames = []
        for (var f = 0; f <= N; f++) {
          var t = f / N, wind = ss(0, .3, t), u = Math.max(0, (t - .26) / .74), snap = u * u * u
          var p = -.07 * wind * (1 - u) + snap, amp = wind * (1 - u) * (small ? 1.2 : 2.2)
          var jx = Math.sin(t * 90 + ph) * amp, jy = Math.cos(t * 81 + ph * 2) * amp
          var bow = Math.sin(Math.PI * Math.max(0, p)) * arc
          var x = dx * p + nx * bow + jx, y = dy * p + ny * bow + jy
          var sc = k0 * (1 + .12 * wind * (1 - u)) * (1 - (i ? .94 : .8) * snap)
          frames.push({ transform: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + sc.toFixed(3) + ') rotate(' + (spin * snap).toFixed(1) + 'deg)',
            filter: i ? 'none' : 'brightness(' + (1 + 5 * ss(.8, 1, t)).toFixed(2) + ') blur(' + (3 * ss(.88, 1, t)).toFixed(1) + 'px)',
            opacity: (1 - ss(i ? .93 : .94, 1, t)).toFixed(3) })
        }
        anims.push(c.animate(frames, { duration: dur, delay: delay, fill: 'both', easing: 'linear' }))
        timers.push(setTimeout(function () { feed(i, cnt, dx / len, dy / len) }, delay + dur * (i ? .95 : .93)))
      })(i)
      var gavelAt = FIRST + (cnt - 2) * STEP + D + 140, hitAt = gavelAt + 743
      sec.classList.add('gather')
      timers.push(setTimeout(function () { sec.classList.add('gavel') }, gavelAt))
      timers.push(setTimeout(function () { core.style.cssText = ''; sec.classList.remove('gather'); sec.classList.add('hit'); burst(small ? 120 : 240, true) }, hitAt))
      timers.push(setTimeout(function () { sec.classList.remove('pre'); sec.classList.add('done') }, hitAt + 400))
      timers.push(setTimeout(function () { playing = false; idle = true }, hitAt + 1000))
      if (!raf) raf = requestAnimationFrame(tick)
    }
    var seen = false
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && e[0].intersectionRatio > .45) { if (!seen) { seen = true; play() } }
      else if (!e[0].isIntersecting) { seen = false; stop(); sec.classList.remove('done', 'hit'); sec.classList.add('pre'); layout() }
    }, { threshold: [0, .45] }).observe(sec)
    else { sec.classList.remove('pre'); sec.classList.add('done') }
    addEventListener('resize', function () { if (idle) { size(); paint() } else if (!playing) layout() })
    layout(); addEventListener('load', function () { if (!playing && !idle) layout() }); setTimeout(function () { if (!playing && !idle) layout() }, 1200)
  })
  show(fromHash(), true)
})()

