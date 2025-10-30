document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('background-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const particleSettings = {
        count: 50,
        minRadius: 1,
        maxRadius: 3,
        minSpeed: 0.1,
        maxSpeed: 0.5,
        color: 'rgba(0, 246, 163, 0.5)',
        lineColor: 'rgba(0, 246, 163, 0.1)',
        lineDistance: 150
    };

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.radius = Math.random() * (particleSettings.maxRadius - particleSettings.minRadius) + particleSettings.minRadius;
            this.vx = (Math.random() - 0.5) * (particleSettings.maxSpeed - particleSettings.minSpeed) + particleSettings.minSpeed;
            this.vy = (Math.random() - 0.5) * (particleSettings.maxSpeed - particleSettings.minSpeed) + particleSettings.minSpeed;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = particleSettings.color;
            ctx.fill();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < particleSettings.count; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < particleSettings.lineDistance) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = particleSettings.lineColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        connectParticles();
        requestAnimationFrame(animate);
    }

    createParticles();
    animate();
});
