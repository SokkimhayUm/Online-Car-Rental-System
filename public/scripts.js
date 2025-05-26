function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

if (document.getElementById('car-grid')) {
  // Homepage logic
  function loadCars(url = '/api/cars') {
    fetch(url)
      .then(response => response.json())
      .then(data => {
        const grid = document.getElementById('car-grid');
        grid.innerHTML = '';
        data.cars.forEach(car => {
          const carElement = document.createElement('div');
          carElement.className = 'car';
          carElement.innerHTML = `
            <img src="${car.image}" alt="${car.carModel}">
            <h3>${car.brand} ${car.carModel}</h3>
            <p>Price: $${car.pricePerDay}/day</p>
            <p>Available: ${car.available ? 'Yes' : 'No'}</p>
            ${car.available ? `<button onclick="rentCar('${car.vin}')">Rent</button>` : ''}
          `;
          grid.appendChild(carElement);
        });
      });
  }

  function rentCar(vin) {
    sessionStorage.setItem('selectedCarVIN', vin);
    window.location.href = 'reservation.html';
  }

  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', debounce(() => {
    const keyword = searchInput.value.trim();
    if (keyword) {
      fetch(`/api/cars/search?keyword=${encodeURIComponent(keyword)}`)
        .then(response => response.json())
        .then(data => {
          const suggestions = document.getElementById('suggestions');
          suggestions.innerHTML = '';
          data.cars.forEach(car => {
            const suggestion = document.createElement('div');
            suggestion.textContent = `${car.brand} ${car.carModel}`;
            suggestion.addEventListener('click', () => {
              searchInput.value = suggestion.textContent;
              loadCars(`/api/cars/search?keyword=${encodeURIComponent(suggestion.textContent)}`);
              suggestions.innerHTML = '';
            });
            suggestions.appendChild(suggestion);
          });
        });
    }
  }, 300));

  const typeFilter = document.getElementById('type-filter');
  const brandFilter = document.getElementById('brand-filter');
  [typeFilter, brandFilter].forEach(filter => {
    filter.addEventListener('change', () => {
      const type = typeFilter.value;
      const brand = brandFilter.value;
      let url = '/api/cars/filter';
      const params = [];
      if (type) params.push(`type=${encodeURIComponent(type)}`);
      if (brand) params.push(`brand=${encodeURIComponent(brand)}`);
      if (params.length) url += `?${params.join('&')}`;
      loadCars(url);
    });
  });

  loadCars();
}

if (document.getElementById('car-details')) {
  // Reservation page logic
  const vin = sessionStorage.getItem('selectedCarVIN');
  if (!vin) {
    document.getElementById('no-car').style.display = 'block';
  } else {
    fetch(`/api/cars/${vin}`)
      .then(response => response.json())
      .then(car => {
        const details = document.getElementById('car-details');
        details.innerHTML = `
          <h2>${car.brand} ${car.carModel}</h2>
          <img src="${car.image}" alt="${car.carModel}">
          <p>Type: ${car.carType}</p>
          <p>Price: $${car.pricePerDay}/day</p>
          <p>Available: ${car.available ? 'Yes' : 'No'}</p>
          <p>${car.description}</p>
        `;
        if (car.available) {
          const form = document.getElementById('reservation-form');
          form.style.display = 'block';
          loadFormData();
        } else {
          details.innerHTML += '<p>This car is unavailable. Please choose another.</p>';
        }
      });
  }

  function loadFormData() {
    const saved = JSON.parse(localStorage.getItem('reservationForm') || '{}');
    document.getElementById('name').value = saved.name || '';
    document.getElementById('phone').value = saved.phone || '';
    document.getElementById('email').value = saved.email || '';
    document.getElementById('license').value = saved.license || '';
    document.getElementById('start-date').value = saved.startDate || '';
    document.getElementById('rental-period').value = saved.rentalPeriod || '';
    validateForm();
  }

  function saveFormData() {
    const formData = {
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      email: document.getElementById('email').value,
      license: document.getElementById('license').value,
      startDate: document.getElementById('start-date').value,
      rentalPeriod: document.getElementById('rental-period').value
    };
    localStorage.setItem('reservationForm', JSON.stringify(formData));
  }

  function validateForm() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const license = document.getElementById('license').value.trim();
    const startDate = document.getElementById('start-date').value;
    const rentalPeriod = parseInt(document.getElementById('rental-period').value, 10);
    const feedback = document.getElementById('form-feedback');
    const submitBtn = document.getElementById('submit-btn');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?\d{10,15}$/;

    let valid = true;
    feedback.innerHTML = '';

    if (!name) { feedback.innerHTML += '<p>Name is required.</p>'; valid = false; }
    if (!phone || !phoneRegex.test(phone)) { feedback.innerHTML += '<p>Valid phone number is required.</p>'; valid = false; }
    if (!email || !emailRegex.test(email)) { feedback.innerHTML += '<p>Valid email is required.</p>'; valid = false; }
    if (!license) { feedback.innerHTML += '<p>Driver’s license is required.</p>'; valid = false; }
    if (!startDate) { feedback.innerHTML += '<p>Start date is required.</p>'; valid = false; }
    if (!rentalPeriod || rentalPeriod < 1) { feedback.innerHTML += '<p>Rental period must be at least 1 day.</p>'; valid = false; }

    if (valid) {
      fetch(`/api/cars/${vin}`).then(res => res.json()).then(car => {
        const totalPrice = car.pricePerDay * rentalPeriod;
        document.getElementById('total-price').textContent = totalPrice;
      });
    }
    submitBtn.disabled = !valid;
  }

  document.querySelectorAll('#reservation-form input').forEach(input => {
    input.addEventListener('input', () => {
      validateForm();
      saveFormData();
    });
  });

  document.getElementById('submit-btn').addEventListener('click', () => {
    const order = {
      customer: {
        name: document.getElementById('name').value,
        phoneNumber: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        driversLicenseNumber: document.getElementById('license').value
      },
      car: { vin },
      rental: {
        startDate: document.getElementById('start-date').value,
        rentalPeriod: parseInt(document.getElementById('rental-period').value, 10),
        totalPrice: parseInt(document.getElementById('total-price').textContent, 10),
        orderDate: new Date().toISOString().split('T')[0]
      }
    };

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    })
      .then(response => response.json())
      .then(data => {
        const feedback = document.getElementById('form-feedback');
        if (data.success) {
          feedback.innerHTML = '<p>Order placed! Please check your email for confirmation.</p>';
          localStorage.removeItem('reservationForm');
          document.getElementById('reservation-form').reset();
          document.getElementById('submit-btn').disabled = true;
        } else {
          feedback.innerHTML = `<p>${data.message}</p>`;
        }
      });
  });

  document.getElementById('cancel-btn').addEventListener('click', () => {
    localStorage.removeItem('reservationForm');
    window.location.href = 'index.html';
  });
}