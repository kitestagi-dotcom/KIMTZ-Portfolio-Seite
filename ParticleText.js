(function () {
  'use strict';

  const defaults = {
    particleSize: 1.8,
    density: 4,
    color: '#ffffff',
    highlightColor: '#005A91',
    scatter: 180,
    gatherDuration: 1600,
    stagger: 420,
    pointerRepel: 40,
    repelRadius: 120,
    idleDrift: 0.7,
    glow: true
  };

  class ParticleText {
    constructor(element, options) {
      this.element = element;
      this.options = Object.assign({}, defaults, options);
      this.text = element.textContent.trim().replace(/\s+/g, ' ');
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'particle-text-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.context = this.canvas.getContext('2d');
      this.particles = [];
      this.pointer = null;
      this.animationStart = 0;
      this.animationEnd = 0;
      this.frame = null;
      this.lastDraw = 0;
      this.isVisible = false;
      this.isBuilt = false;
      this.resizeTimer = null;

      this.element.classList.add('particle-text-heading');
      this.element.appendChild(this.canvas);
      this.bindEvents();
      this.observeVisibility();
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.isBuilt) return;
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.safeBuild(), 120);
      });
      this.resizeObserver.observe(this.element);
    }

    bindEvents() {
      this.element.addEventListener('pointerenter', () => this.scatter());
      this.element.addEventListener('pointermove', (event) => {
        const bounds = this.element.getBoundingClientRect();
        this.pointer = {
          x: event.clientX - bounds.left + this.padding,
          y: event.clientY - bounds.top + this.padding
        };
      });
      this.element.addEventListener('pointerleave', () => {
        this.pointer = null;
      });
    }

    observeVisibility() {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        this.isVisible = entries[0].isIntersecting;
        if (!this.isVisible) return;
        if (!this.isBuilt && !this.safeBuild()) return;
        if (this.pointer || performance.now() < this.animationEnd) this.start();
      }, { rootMargin: '160px' });
      this.visibilityObserver.observe(this.element);
    }

    safeBuild() {
      try {
        this.build();
        return true;
      } catch (error) {
        this.destroy();
        return false;
      }
    }

    transformText(text, transform) {
      if (transform === 'uppercase') return text.toUpperCase();
      if (transform === 'lowercase') return text.toLowerCase();
      if (transform === 'capitalize') {
        return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
      }
      return text;
    }

    measureText(context, text, letterSpacing) {
      const characters = Array.from(text);
      return context.measureText(text).width + Math.max(0, characters.length - 1) * letterSpacing;
    }

    drawText(context, text, x, y, letterSpacing) {
      if (!letterSpacing) {
        context.fillText(text, x, y);
        return;
      }

      Array.from(text).forEach((character) => {
        context.fillText(character, x, y);
        x += context.measureText(character).width + letterSpacing;
      });
    }

    getLines(context, text, maxWidth, letterSpacing) {
      const words = text.split(' ');
      const lines = [];
      let line = words.shift() || '';

      words.forEach((word) => {
        const candidate = line + ' ' + word;
        if (this.measureText(context, candidate, letterSpacing) <= maxWidth) {
          line = candidate;
        } else {
          lines.push(line);
          line = word;
        }
      });
      if (line) lines.push(line);
      return lines;
    }

    build() {
      const style = window.getComputedStyle(this.element);
      const bounds = this.element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const fontSize = parseFloat(style.fontSize);
      const lineHeight = style.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(style.lineHeight);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const letterSpacing = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing) || 0;
      const width = Math.ceil(bounds.width);
      const height = Math.ceil(bounds.height);
      const samplingCanvas = document.createElement('canvas');
      const samplingContext = samplingCanvas.getContext('2d', { willReadFrequently: true });
      samplingCanvas.width = width;
      samplingCanvas.height = height;
      samplingContext.font = style.fontWeight + ' ' + fontSize + 'px ' + style.fontFamily;
      samplingContext.fillStyle = '#fff';
      samplingContext.textBaseline = 'top';

      const text = this.transformText(this.text, style.textTransform);
      const lines = this.getLines(samplingContext, text, width - paddingLeft - paddingRight, letterSpacing);
      const textHeight = lines.length * lineHeight;
      const availableHeight = height - paddingTop - paddingBottom;
      const startY = paddingTop + Math.max(0, (availableHeight - textHeight) / 2);

      lines.forEach((line, index) => {
        let x = paddingLeft;
        if (style.textAlign === 'center') {
          x = (width - this.measureText(samplingContext, line, letterSpacing)) / 2;
        } else if (style.textAlign === 'right') {
          x = width - paddingRight - this.measureText(samplingContext, line, letterSpacing);
        }
        this.drawText(samplingContext, line, x, startY + index * lineHeight, letterSpacing);
      });

      const image = samplingContext.getImageData(0, 0, width, height).data;
      const step = Math.max(2, Math.round(this.options.density));
      const nextParticles = [];
      this.padding = this.element.tagName === 'H3' ? 60 : Math.min(this.options.scatter, 180);

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          if (image[(y * width + x) * 4 + 3] < 128) continue;
          nextParticles.push({
            x: x + this.padding,
            y: y + this.padding,
            targetX: x + this.padding,
            targetY: y + this.padding,
            startX: x + this.padding,
            startY: y + this.padding,
            delay: Math.random() * this.options.stagger,
            phase: Math.random() * Math.PI * 2,
            highlight: Math.random() < 0.12
          });
        }
      }

      this.particles = nextParticles;
      const canvasWidth = width + this.padding * 2;
      const canvasHeight = height + this.padding * 2;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.ceil(canvasWidth * pixelRatio);
      this.canvas.height = Math.ceil(canvasHeight * pixelRatio);
      this.canvas.style.width = canvasWidth + 'px';
      this.canvas.style.height = canvasHeight + 'px';
      this.canvas.style.left = -this.padding + 'px';
      this.canvas.style.top = -this.padding + 'px';
      this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      this.isBuilt = true;
      this.element.classList.add('particle-text-ready');
      this.draw(performance.now());
    }

    scatter() {
      const now = performance.now();
      this.animationStart = now;
      this.animationEnd = now + this.options.stagger + this.options.gatherDuration;
      const scatterDistance = Math.min(this.options.scatter, this.padding * 0.95);
      this.particles.forEach((particle) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = scatterDistance * (0.35 + Math.random() * 0.65);
        particle.startX = particle.targetX + Math.cos(angle) * distance;
        particle.startY = particle.targetY + Math.sin(angle) * distance;
        particle.x = particle.startX;
        particle.y = particle.startY;
        particle.delay = Math.random() * this.options.stagger;
      });
      this.start();
    }

    start() {
      if (this.frame || !this.isVisible) return;
      const animate = (time) => {
        this.frame = null;
        if (!this.isVisible) return;
        if (time - this.lastDraw >= 32) {
          this.draw(time);
          this.lastDraw = time;
        }
        if (this.pointer || time < this.animationEnd) {
          this.frame = window.requestAnimationFrame(animate);
        }
      };
      this.frame = window.requestAnimationFrame(animate);
    }

    draw(time) {
      const context = this.context;
      const width = this.canvas.width / Math.min(window.devicePixelRatio || 1, 2);
      const height = this.canvas.height / Math.min(window.devicePixelRatio || 1, 2);
      context.clearRect(0, 0, width, height);
      context.shadowBlur = this.options.glow ? 7 : 0;

      this.particles.forEach((particle) => {
        if (this.animationStart) {
          const elapsed = Math.max(0, time - this.animationStart - particle.delay);
          const progress = Math.min(1, elapsed / this.options.gatherDuration);
          const eased = 1 - Math.pow(1 - progress, 4);
          particle.x = particle.startX + (particle.targetX - particle.startX) * eased;
          particle.y = particle.startY + (particle.targetY - particle.startY) * eased;
        }

        let x = particle.x;
        let y = particle.y;
        const drift = this.options.idleDrift;
        x += Math.sin(time * 0.0011 + particle.phase) * drift;
        y += Math.cos(time * 0.0009 + particle.phase) * drift;

        if (this.pointer) {
          const dx = x - this.pointer.x;
          const dy = y - this.pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < this.options.repelRadius) {
            const force = (1 - distance / this.options.repelRadius) * this.options.pointerRepel;
            x += dx / distance * force;
            y += dy / distance * force;
          }
        }

        const color = particle.highlight ? this.options.highlightColor : this.options.color;
        context.fillStyle = color;
        context.shadowColor = color;
        context.beginPath();
        context.arc(x, y, this.options.particleSize, 0, Math.PI * 2);
        context.fill();
      });
    }

    destroy() {
      window.cancelAnimationFrame(this.frame);
      window.clearTimeout(this.resizeTimer);
      this.visibilityObserver.disconnect();
      this.resizeObserver.disconnect();
      this.canvas.remove();
      this.element.classList.remove('particle-text-heading', 'particle-text-ready');
    }

    static enhanceAll(selector, options) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (reducedMotion || !finePointer) return [];
      const instances = [];
      document.querySelectorAll(selector).forEach((element) => {
        try {
          instances.push(new ParticleText(element, options));
        } catch (error) {
          const canvas = element.querySelector('.particle-text-canvas');
          if (canvas) canvas.remove();
          element.classList.remove('particle-text-heading', 'particle-text-ready');
        }
      });
      return instances;
    }
  }

  window.ParticleText = ParticleText;
})();
