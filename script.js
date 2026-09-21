document.addEventListener('DOMContentLoaded', async () => {
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
