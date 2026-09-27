function initFloatingPaths() {
    const container = document.getElementById('floating-paths');
    if (!container) return;

    const svgNS = "http://www.w3.org/2000/svg";
    [-1, 1].forEach(position => {
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 696 316");
        svg.setAttribute("fill", "none");
        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        svg.classList.add("floating-paths-svg");

        for (let i = 0; i < 36; i++) {
            const path = document.createElementNS(svgNS, "path");
            const d = `M-${380 - i * 5 * position} -${189 + i * 6}C-${
                380 - i * 5 * position
            } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
                152 - i * 5 * position
            } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
                684 - i * 5 * position
            } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`;

            path.setAttribute("d", d);
            path.setAttribute("stroke", "currentColor");
            path.setAttribute("stroke-width", String(0.5 + i * 0.03));
            path.setAttribute("stroke-opacity", String(0.1 + i * 0.03));
            path.setAttribute("pathLength", "1");

            const duration = (20 + Math.random() * 10) * 1000;
            path.animate([
                { strokeDasharray: "0.3 1", strokeDashoffset: "0", opacity: 0.3 },
                { strokeDasharray: "1 1", strokeDashoffset: "-1", opacity: 0.6 },
                { strokeDasharray: "0.3 1", strokeDashoffset: "0", opacity: 0.3 }
            ], {
                duration: duration,
                iterations: Infinity,
                easing: "linear"
            });

            svg.appendChild(path);
        }

        container.appendChild(svg);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    initFloatingPaths();

    const urlParams = new URLSearchParams(window.location.search);
    const placeId = urlParams.get('id');

    const statusMessage = document.getElementById('status-message');
    const content = document.getElementById('content');
    
    if (!placeId) {
        statusMessage.textContent = 'Ошибка: Заведение не указано в ссылке. Отсканируйте NFC-метку еще раз.';
        return;
    }

    let placeData = null;

    try {
        const response = await fetch('/places.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error('Network error');
        
        const places = await response.json();
        placeData = places[placeId];
        
        if (!placeData) {
            statusMessage.textContent = 'Ошибка: Заведение не найдено в базе.';
            return;
        }

        document.getElementById('place-name').textContent = placeData.name;
        document.getElementById('logo').src = placeData.logo_url;
        
        statusMessage.classList.add('hidden');
        content.classList.remove('hidden');
    } catch (error) {
        statusMessage.textContent = 'Ошибка загрузки данных.';
        console.error(error);
        return;
    }

    const stars = document.querySelectorAll('.star');
    const complaintBlock = document.getElementById('complaint-block');
    let selectedRating = 0;

    const updateStars = (rating) => {
        stars.forEach(star => {
            const value = parseInt(star.getAttribute('data-value'));
            if (value <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    };

    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            if (selectedRating === 0) updateStars(parseInt(star.getAttribute('data-value')));
        });
        
        star.addEventListener('mouseleave', () => {
            if (selectedRating === 0) updateStars(0);
        });

        star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-value'));
            updateStars(selectedRating);
            
            if (selectedRating >= 4) {
                window.location.href = placeData.map_link;
            } else {
                complaintBlock.classList.remove('hidden');
            }
        });
    });

    const submitBtn = document.getElementById('submit-btn');
    const complaintInput = document.getElementById('complaint-input');
    const thankYouBlock = document.getElementById('thank-you-block');

    submitBtn.addEventListener('click', async () => {
        const text = complaintInput.value.trim();
        if (!text) {
            alert('Пожалуйста, опишите проблему.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId, stars: selectedRating, text })
            });

            if (!response.ok) throw new Error('API Error');

            complaintBlock.classList.add('hidden');
            document.getElementById('stars').classList.add('hidden');
            document.getElementById('subtitle').classList.add('hidden');
            thankYouBlock.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            alert('Произошла ошибка при отправке. Попробуйте еще раз.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
    });
});
