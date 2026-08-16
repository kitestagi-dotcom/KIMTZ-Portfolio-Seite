(function () {
  'use strict';

  const HINGE_CONFIG = {
    top: { origin: '50% 0%', rotateX: -92, rotateY: 0 },
    bottom: { origin: '50% 100%', rotateX: 92, rotateY: 0 },
    left: { origin: '0% 50%', rotateX: 0, rotateY: 92 },
    right: { origin: '100% 50%', rotateX: 0, rotateY: -92 }
  };

  const defaults = {
    splitBy: 'char',
    hinge: 'top',
    duration: 0.65,
    stagger: 0.045,
    ease: 'power3.out',
    perspective: 700,
    creaseShading: 0.55,
    trigger: 'mount'
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  class FoldText {
    constructor(element, options) {
      this.element = element;
      this.options = Object.assign({}, defaults, options);
      this.hinge = HINGE_CONFIG[this.options.hinge] || HINGE_CONFIG.top;
      this.originalNodes = Array.from(element.childNodes).map(function (node) {
        return node.cloneNode(true);
      });
      this.rawText = element.textContent;
      this.text = this.rawText.trim().replace(/\s+/g, ' ');
      this.originalAriaLabel = element.getAttribute('aria-label');
      this.hasLeadingWhitespace = /^\s/.test(this.rawText);
      this.hasTrailingWhitespace = /\s$/.test(this.rawText);
      this.timeline = null;
      this.scrollTrigger = null;
      this.intersectionObserver = null;
      this.hoverHandler = null;
      this.build();
      this.animate();
    }

    createSegment(content, split) {
      const segment = document.createElement('span');
      const piece = document.createElement('span');
      segment.className = 'fold-text-segment';
      segment.dataset.foldSplit = split;
      segment.style.setProperty('--fold-perspective', Math.max(120, this.options.perspective) + 'px');
      piece.className = 'fold-text-piece';
      piece.dataset.foldHinge = this.options.hinge;
      piece.style.transformOrigin = this.hinge.origin;
      piece.style.setProperty('--fold-crease', 0);
      piece.textContent = content || '\u00a0';
      segment.appendChild(piece);
      return segment;
    }

    splitText(value) {
      const splitBy = this.options.splitBy;
      const fragment = document.createDocumentFragment();
      const normalized = value.replace(/\s+/g, ' ');
      const parts = normalized.split(/(\s+)/);

      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          const whitespace = this.createSegment('\u00a0', splitBy);
          whitespace.dataset.foldWhitespace = 'true';
          fragment.appendChild(whitespace);
          return;
        }
        if (splitBy === 'word') {
          fragment.appendChild(this.createSegment(part, splitBy));
          return;
        }

        const word = document.createElement('span');
        word.className = 'fold-text-word';
        this.getCharacters(part).forEach((character) => {
          word.appendChild(this.createSegment(character, splitBy));
        });
        fragment.appendChild(word);
      });
      return fragment;
    }

    getCharacters(value) {
      if (window.Intl && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter(document.documentElement.lang || 'de', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(value), function (entry) { return entry.segment; });
      }
      return Array.from(value);
    }

    cloneWithSegments(node) {
      if (node.nodeType === Node.TEXT_NODE) return this.splitText(node.nodeValue || '');
      if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
      if (node.tagName === 'BR') return node.cloneNode(false);

      const clone = node.cloneNode(false);
      Array.from(node.childNodes).forEach((child) => {
        clone.appendChild(this.cloneWithSegments(child));
      });
      return clone;
    }

    build() {
      const visual = document.createElement('span');
      visual.className = 'fold-text-visual';
      visual.setAttribute('aria-hidden', 'true');

      if (this.options.splitBy === 'line') {
        this.rawText.trim().split('\n').forEach((line) => {
          const lineElement = document.createElement('span');
          lineElement.className = 'fold-text-line';
          lineElement.appendChild(this.createSegment(line || '\u00a0', 'line'));
          visual.appendChild(lineElement);
        });
      } else {
        this.originalNodes.forEach((node) => {
          visual.appendChild(this.cloneWithSegments(node));
        });
      }

      const whitespace = visual.querySelectorAll('[data-fold-whitespace="true"]');
      if (whitespace.length && this.hasLeadingWhitespace) {
        whitespace[0].remove();
      }
      if (whitespace.length && this.hasTrailingWhitespace) {
        whitespace[whitespace.length - 1].remove();
      }

      this.element.setAttribute('aria-label', this.text);
      this.element.replaceChildren(visual);
      this.element.classList.add('fold-text');
      this.pieces = Array.from(visual.querySelectorAll('.fold-text-piece'));
    }

    play(repeat) {
      this.killTimeline();
      const crease = clamp(this.options.creaseShading, 0, 1);
      this.timeline = window.gsap.timeline({
        repeat: repeat ? -1 : 0,
        repeatDelay: repeat ? 0.75 : 0
      });
      this.timeline.fromTo(this.pieces, {
        opacity: 0,
        rotateX: this.hinge.rotateX,
        rotateY: this.hinge.rotateY,
        '--fold-crease': crease,
        transformOrigin: this.hinge.origin,
        willChange: 'transform, opacity',
        force3D: true
      }, {
        opacity: 1,
        rotateX: 0,
        rotateY: 0,
        '--fold-crease': 0,
        duration: this.options.duration,
        ease: this.options.ease,
        stagger: this.options.stagger,
        clearProps: 'willChange'
      });
    }

    animate() {
      if (!this.pieces.length || !window.gsap) return;

      if (this.options.trigger === 'hover') {
        window.gsap.set(this.pieces, { opacity: 1, rotateX: 0, rotateY: 0, '--fold-crease': 0 });
        this.hoverHandler = () => this.play(false);
        this.element.addEventListener('mouseenter', this.hoverHandler);
      } else if (this.options.trigger === 'scroll') {
        const crease = clamp(this.options.creaseShading, 0, 1);
        window.gsap.set(this.pieces, {
          opacity: 0,
          rotateX: this.hinge.rotateX,
          rotateY: this.hinge.rotateY,
          '--fold-crease': crease,
          transformOrigin: this.hinge.origin
        });
        if (window.ScrollTrigger) {
          this.scrollTrigger = window.ScrollTrigger.create({
            trigger: this.element,
            start: 'top 82%',
            once: true,
            onEnter: () => this.play(false)
          });
        } else if (window.IntersectionObserver) {
          this.intersectionObserver = new IntersectionObserver((entries, observer) => {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            this.play(false);
          }, { rootMargin: '0px 0px -18% 0px' });
          this.intersectionObserver.observe(this.element);
        } else {
          window.gsap.set(this.pieces, { opacity: 1, rotateX: 0, rotateY: 0, '--fold-crease': 0, clearProps: 'willChange' });
        }
      } else {
        this.play(this.options.trigger === 'loop');
      }
    }

    killTimeline() {
      if (this.timeline) this.timeline.kill();
      this.timeline = null;
      if (window.gsap) window.gsap.killTweensOf(this.pieces);
    }

    destroy() {
      this.killTimeline();
      if (this.scrollTrigger) this.scrollTrigger.kill();
      if (this.intersectionObserver) this.intersectionObserver.disconnect();
      if (this.hoverHandler) this.element.removeEventListener('mouseenter', this.hoverHandler);
      this.element.classList.remove('fold-text');
      if (this.originalAriaLabel === null) {
        this.element.removeAttribute('aria-label');
      } else {
        this.element.setAttribute('aria-label', this.originalAriaLabel);
      }
      this.element.replaceChildren(...this.originalNodes.map(function (node) {
        return node.cloneNode(true);
      }));
    }

    static enhanceAll(selector, options) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return [];
      if (!window.gsap) return [];
      if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);

      return Array.from(document.querySelectorAll(selector)).map(function (element) {
        return new FoldText(element, options);
      });
    }
  }

  window.FoldText = FoldText;
})();
