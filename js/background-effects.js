document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('background-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    // Helper to cancel any previous animation frame loop
    const cancelPreviousAnimation = () => {
        if (window.animationFrameId) {
            cancelAnimationFrame(window.animationFrameId);
        }
    };

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas, false);
    

    const startAnimation = (animation) => {
        cancelPreviousAnimation();
        resizeCanvas();

        if (animation && typeof animation.init === 'function' && typeof animation.animate === 'function') {
            animation.init(canvas, ctx);
            let lastTime = 0;
            function loop(currentTime) {
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;
                animation.animate(canvas, ctx, deltaTime);
                window.animationFrameId = requestAnimationFrame(loop);
            }
            window.animationFrameId = requestAnimationFrame(loop);
        }
    };
    
    const theme = document.body.dataset.theme || 'ai-fundamentals';

    // --- Animation Definitions ---

    const GenericParticleEffect = {
        particles: [],
        settings: { count: 50, minRadius: 1, maxRadius: 3, minSpeed: 0.1, maxSpeed: 0.5, color: 'rgba(0, 255, 255, 0.5)', lineColor: 'rgba(0, 255, 255, 0.1)', lineDistance: 150 },
        init(canvas, ctx) {
            this.particles = [];
            for (let i = 0; i < this.settings.count; i++) {
                this.particles.push({
                    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                    radius: Math.random() * (this.settings.maxRadius - this.settings.minRadius) + this.settings.minRadius,
                    vx: (Math.random() - 0.5) * (this.settings.maxSpeed - this.settings.minSpeed) + this.settings.minSpeed,
                    vy: (Math.random() - 0.5) * (this.settings.maxSpeed - this.settings.minSpeed) + this.settings.minSpeed,
                });
            }
        },
        animate(canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = this.settings.color; ctx.fill();
            });
            // simplified connect logic for performance
        }
    };

    const MatrixEffect = {
        drops: [],
        fontSize: 16,
        characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        init(canvas, ctx) {
            const columns = Math.floor(canvas.width / this.fontSize);
            this.drops = [];
            for (let i = 0; i < columns; i++) {
                this.drops[i] = 1;
            }
        },
        animate(canvas, ctx) {
            ctx.fillStyle = 'rgba(32, 35, 42, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00FF99';
            ctx.font = `${this.fontSize}px monospace`;
            for (let i = 0; i < this.drops.length; i++) {
                const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
                ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);
                if (this.drops[i] * this.fontSize > canvas.height && Math.random() > 0.975) {
                    this.drops[i] = 0;
                }
                this.drops[i]++;
            }
        }
    };

    const BiologyEffect = {
        strands: [],
        numStrands: 3,
        init(canvas, ctx) {
            this.strands = [];
            for(let i=0; i<this.numStrands; i++) {
                this.strands.push({
                    yOffset: Math.random() * canvas.height,
                    xOffset: (canvas.width / (this.numStrands + 1)) * (i+1),
                    rotation: Math.random() * Math.PI * 2,
                    speed: (Math.random() * 0.005) + 0.005,
                });
            }
        },
        animate(canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.strands.forEach(strand => {
                strand.rotation += strand.speed;
                for (let i = 0; i < 50; i++) {
                    const y = (i * 20 - 200) + strand.yOffset;
                    const x1 = strand.xOffset + Math.sin(strand.rotation + i * 0.5) * 40;
                    const x2 = strand.xOffset - Math.sin(strand.rotation + i * 0.5) * 40;
                    
                    ctx.fillStyle = '#27AE60';
                    ctx.beginPath();
                    ctx.arc(x1, y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(x2, y, 5, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.strokeStyle = '#2d8254';
                    ctx.beginPath();
                    ctx.moveTo(x1, y);
                    ctx.lineTo(x2, y);
                    ctx.stroke();
                }
            });
        }
    };
    
    const SpaceEffect = {
        stars: [],
        numStars: 200,
        init(canvas, ctx) {
            this.stars = [];
            for (let i = 0; i < this.numStars; i++) {
                this.stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5,
                    vx: (Math.random() - 0.5) / 4,
                    vy: (Math.random() - 0.5) / 4,
                });
            }
        },
        animate(canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#E6E6E6';
            this.stars.forEach(star => {
                star.x += star.vx;
                star.y += star.vy;
                if (star.x < 0) star.x = canvas.width;
                if (star.x > canvas.width) star.x = 0;
                if (star.y < 0) star.y = canvas.height;
                if (star.y > canvas.height) star.y = 0;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    };
    
    const MathEffect = {
        symbols: [],
        numSymbols: 50,
        characters: "Σπ√∫∞≠≈≤≥αβγδθλμξ+-×÷=ƒ()[]{}0123456789",
        init(canvas, ctx) {
            this.symbols = [];
            for(let i=0; i< this.numSymbols; i++) {
                this.symbols.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    char: this.characters.charAt(Math.floor(Math.random() * this.characters.length)),
                    speed: Math.random() * 0.5 + 0.2,
                    opacity: Math.random(),
                });
            }
        },
        animate(canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.symbols.forEach(s => {
                ctx.font = '20px monospace';
                ctx.fillStyle = `rgba(255, 0, 255, ${s.opacity})`;
                ctx.fillText(s.char, s.x, s.y);
                s.y -= s.speed;
                if(s.y < 0) {
                    s.y = canvas.height;
                    s.x = Math.random() * canvas.width;
                }
            });
        }
    };

    switch (theme) {
        case 'programming':
            startAnimation(MatrixEffect);
            break;
        case 'biology':
            startAnimation(BiologyEffect);
            break;
        case 'space-astronomy':
            startAnimation(SpaceEffect);
            break;
        case 'mathematics':
             startAnimation(MathEffect);
            break;
        case 'ai-fundamentals':
        case 'machine-learning':
        case 'deep-learning':
        case 'ai-robotics':
        case 'physics':
        case 'chemistry':
        case 'islamic-quiz':
        default:
            startAnimation(GenericParticleEffect);
            break;
    }
});