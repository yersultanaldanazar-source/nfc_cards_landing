document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const placeId = urlParams.get('id');

    const statusMessage = document.getElementById('status-message');
    const stepRate = document.getElementById('step-rate');
    const stepRedirect = document.getElementById('step-redirect');
    const stepComplaint = document.getElementById('step-complaint');
    const stepSent = document.getElementById('step-sent');

    const showStep = (stepName) => {
        stepRate.classList.add('hidden');
        stepRedirect.classList.add('hidden');
        stepComplaint.classList.add('hidden');
        stepSent.classList.add('hidden');

        if (stepName === 'rate') stepRate.classList.remove('hidden');
        if (stepName === 'redirect') stepRedirect.classList.remove('hidden');
        if (stepName === 'complaint') stepComplaint.classList.remove('hidden');
        if (stepName === 'sent') stepSent.classList.remove('hidden');
    };

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
        const logoImg = document.getElementById('logo');
        const logoFallback = document.getElementById('logo-fallback');

        if (placeData.logo_url) {
            logoImg.src = placeData.logo_url;
            logoImg.onerror = () => {
                logoImg.classList.add('hidden');
                logoFallback.textContent = placeData.name.charAt(0);
                logoFallback.classList.remove('hidden');
            };
        } else {
            logoImg.classList.add('hidden');
            logoFallback.textContent = placeData.name.charAt(0);
            logoFallback.classList.remove('hidden');
        }

        const redirectLink = document.getElementById('redirect-link');
        if (redirectLink) {
            redirectLink.href = placeData.map_link;
        }

        statusMessage.classList.add('hidden');
        showStep('rate');
    } catch (error) {
        statusMessage.textContent = 'Ошибка загрузки данных.';
        console.error(error);
        return;
    }

    const starButtons = document.querySelectorAll('.star-btn');
    let rating = 0;
    let hoverRating = 0;

    const renderStars = () => {
        const activeScore = hoverRating || rating;
        starButtons.forEach(btn => {
            const val = parseInt(btn.getAttribute('data-value'), 10);
            if (val <= activeScore) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    starButtons.forEach(btn => {
        const val = parseInt(btn.getAttribute('data-value'), 10);

        btn.addEventListener('mouseenter', () => {
            hoverRating = val;
            renderStars();
        });

        btn.addEventListener('mouseleave', () => {
            hoverRating = 0;
            renderStars();
        });

        btn.addEventListener('click', () => {
            rating = val;
            renderStars();

            if (val >= 4) {
                // 4-5 звезд: экран благодарности и редирект в 2ГИС
                showStep('redirect');
                setTimeout(() => {
                    window.location.href = placeData.map_link;
                }, 1200);
            } else {
                // 1-3 звезды: перехватываем негатив внутри
                showStep('complaint');
            }
        });
    });

    // Кнопка "Назад" в форме жалобы
    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
        showStep('rate');
    });

    // Отправка жалобы в Telegram
    const complaintInput = document.getElementById('complaint-input');
    const submitBtn = document.getElementById('submit-btn');
    const submitBtnText = document.getElementById('submit-btn-text');

    stepComplaint.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = complaintInput.value.trim();
        if (!text) return;

        submitBtn.disabled = true;
        submitBtnText.textContent = 'Отправка...';

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId, stars: rating, text })
            });

            if (!response.ok) throw new Error('API Error');

            showStep('sent');
        } catch (error) {
            console.error(error);
            alert('Произошла ошибка при отправке. Попробуйте еще раз.');
            submitBtn.disabled = false;
            submitBtnText.textContent = 'Отправить боссу';
        }
    });
});
