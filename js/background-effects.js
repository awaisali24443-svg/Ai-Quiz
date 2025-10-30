document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('background-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let currentAnimation = null;
    let animationFrameId;

    // --- Animation Definitions ---
    const NexusWaveEffect = {
        points: [],
        settings: { count: 60, maxDist: 150, speed: 0.1, color: 'rgba(255, 189, 62, 0.4)' },
        init(canvas, ctx) {
            this.points = [];
            for (let i = 0; i < this.settings.count; i++) {
                this.points.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * this.settings.speed,
                    vy: (Math.random() - 0.5) * this.settings.speed,
                    radius: Math.random() * 1.5 + 0.5
                });
            }
        },
        animate(canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.points.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.settings.color;
                ctx.fill();
            });

            for (let i = 0; i < this.points.length; i++) {
                for (let j = i + 1; j < this.points.length; j++) {
                    const dist = Math.hypot(this.points[i].x - this.points[j].x, this.points[i].y - this.points[j].y);
                    if (dist < this.settings.maxDist) {
                        ctx.beginPath();
                        ctx.moveTo(this.points[i].x, this.points[i].y);
                        ctx.lineTo(this.points[j].x, this.points[j].y);
                        ctx.strokeStyle = `rgba(255, 189, 62, ${0.5 - dist / this.settings.maxDist})`;
                        ctx.stroke();
                    }
                }
            }
        }
    };

    const MatrixEffect = {
        drops: [], fontSize: 16, characters: '01',
        init(canvas, ctx) {
            const columns = Math.floor(canvas.width / this.fontSize);
            this.drops = Array(columns).fill(1).map(() => Math.random() * canvas.height);
        },
        animate(canvas, ctx) {
            ctx.fillStyle = 'rgba(10, 15, 31, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00F6A3';
            ctx.font = `${this.fontSize}px monospace`;
            for (let i = 0; i < this.drops.length; i++) {
                const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
                ctx.fillText(text, i * this.fontSize, this.drops[i]);
                if (this.drops[i] > canvas.height && Math.random() > 0.975) {
                    this.drops[i] = 0;
                }
                this.drops[i] += this.fontSize;
            }
        }
    };

    const BiologyEffect = {
        strands: [], numStrands: 3,
        init(canvas, ctx) {
            this.strands = [];
            for(let i=0; i<this.numStrands; i++) {
                this.strands.push({
                    y: -200,
                    xOffset: (canvas.width / (this.numStrands + 1)) * (i+1) + (Math.random() - 0.5) * 100,
                    rotation: Math.random() * Math.PI * 2,
                    speed: (Math.random() * 0.005) + 0.005,
                    ySpeed: Math.random() * 0.5 + 0.2
                });
            }
        },
        animate(canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.strands.forEach(strand => {
                strand.rotation += strand.speed;
                strand.y += strand.ySpeed;
                if (strand.y > canvas.height + 200) strand.y = -200;

                for (let i = 0; i < 50; i++) {
                    const yPos = strand.y + (i * 20);
                    const x1 = strand.xOffset + Math.sin(strand.rotation + i * 0.5) * 40;
                    const x2 = strand.xOffset - Math.sin(strand.rotation + i * 0.5) * 40;
                    
                    ctx.fillStyle = 'rgba(39, 174, 96, 0.5)';
                    ctx.beginPath(); ctx.arc(x1, yPos, 5, 0, 2 * Math.PI); ctx.fill();
                    ctx.beginPath(); ctx.arc(x2, yPos, 5, 0, 2 * Math.PI); ctx.fill();

                    ctx.strokeStyle = 'rgba(45, 130, 84, 0.5)';
                    ctx.beginPath(); ctx.moveTo(x1, yPos); ctx.lineTo(x2, yPos); ctx.stroke();
                }
            });
        }
    };
    
    const SpaceEffect = {
        stars: [], numStars: 200,
        init(canvas, ctx) {
            this.stars = [];
            for (let i = 0; i < this.numStars; i++) {
                this.stars.push({
                    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5,
                    vx: (Math.random() - 0.5) / 4, vy: (Math.random() - 0.5) / 4,
                });
            }
        },
        animate(canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(230, 230, 230, 0.8)';
            this.stars.forEach(star => {
                star.x += star.vx; star.y += star.vy;
                if (star.x < 0) star.x = canvas.width;
                if (star.x > canvas.width) star.x = 0;
                if (star.y < 0) star.y = canvas.height;
                if (star.y > canvas.height) star.y = 0;
                ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
            });
        }
    };
    
    const topicEffectMap = {
        'programming-ai': MatrixEffect,
        'biology-genetics': BiologyEffect,
        'cosmology-space': SpaceEffect,
        'default': NexusWaveEffect
    };

    function setupAnimation() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const topic = document.body.dataset.theme;
        currentAnimation = topicEffectMap[topic] || topicEffectMap['default'];
        
        if(currentAnimation) {
            currentAnimation.init(canvas, ctx);
            if(animationFrameId) cancelAnimationFrame(animationFrameId);
            loop();
        }
    }

    function loop() {
        if(currentAnimation) {
            currentAnimation.animate(canvas, ctx);
        }
        animationFrameId = requestAnimationFrame(loop);
    }
    
    document.addEventListener('themeApplied', setupAnimation);
    window.addEventListener('resize', setupAnimation);
});