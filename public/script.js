$(document).ready(function() {
    console.log('script.js loaded');

    // Initialize search and filters only on homepage
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        initializeSearchAndFilters();
    }

    // Homepage-specific logic
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        console.log('Initializing homepage');
        loadCars();
    }

    // Reservation page-specific logic
    if (window.location.pathname.includes('reservation.html')) {
        console.log('Initializing reservation page');
        loadCarDetails();
        loadFormInputs();
        validateForm();
        
        $('#rental-form input').on('input', validateForm);
        $('#submit-button').on('click', submitOrder);
        $('#cancel-button').on('click', cancelForm);

        // Modal close handlers
        $('.close-button').on('click', closeModal);
        $('#cancel-order-button').on('click', function() {
            closeModal();
            window.location.href = 'index.html';
        });
        $('#close-success-button').on('click', closeModal);
        $(document).on('click', function(e) {
            if ($(e.target).hasClass('modal')) {
                closeModal();
            }
        });
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }
});

function initializeSearchAndFilters() {
    // Real-time search suggestions
    $('#search-box').on('input', function() {
        let query = $(this).val().trim().toLowerCase();
        console.log('Search input:', query);
        if (query.length < 2) {
            $('#suggestions').hide();
            return;
        }
        $.get('/cars', function(data) {
            console.log('Cars data received:', data);
            let suggestions = data.cars.filter(car => {
                let searchText = `${car.car_type} ${car.brand} ${car.car_model} ${car.description}`.toLowerCase();
                return query.split(' ').every(term => searchText.includes(term));
            }).map(car => `${car.brand} ${car.car_model}`);
            displaySuggestions(suggestions);
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error fetching cars for suggestions:', textStatus, errorThrown);
        });
    });

    // Trigger search on suggestion click
    $('#suggestions').on('click', '.suggestion-item', function() {
        console.log('Suggestion clicked:', $(this).text());
        $('#search-box').val($(this).text());
        $('#suggestions').hide();
        searchCars();
    });

    // Search button click
    $('#search-button').on('click', function() {
        console.log('Search button clicked');
        searchCars();
    });

    // Enter key support
    $('#search-box').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            console.log('Enter key pressed');
            e.preventDefault();
            searchCars();
        }
    });

    // Type dropdown selection
    $('#type-dropdown .dropdown-content div').on('click', function() {
        let value = $(this).data('value');
        let text = $(this).text().trim();
        console.log('Type filter selected:', value, text);
        $('#type-dropdown .dropbtn').text(text);
        $('#type-dropdown').data('value', value);
        searchCars();
    });

    // Brand dropdown selection
    $('#brand-dropdown .dropdown-content div').on('click', function() {
        let value = $(this).data('value');
        let text = $(this).text().trim();
        console.log('Brand filter selected:', value, text);
        $('#brand-dropdown .dropbtn').text(text);
        $('#brand-dropdown').data('value', value);
        searchCars();
    });
}

function displaySuggestions(suggestions) {
    console.log('Displaying suggestions:', suggestions);
    let suggestionHtml = suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('');
    $('#suggestions').html(suggestionHtml).show();
}

function searchCars() {
    $('#suggestions').hide();
    let query = $('#search-box').val().trim().toLowerCase();
    let typeFilter = $('#type-dropdown').data('value') || '';
    let brandFilter = $('#brand-dropdown').data('value') || '';
    console.log('Searching with query:', query, 'type:', typeFilter, 'brand:', brandFilter);

    $.get('/cars', function(data) {
        console.log('Cars data for search:', data);
        let filteredCars = data.cars.filter(car => {
            let searchText = `${car.car_type} ${car.brand} ${car.car_model} ${car.description}`.toLowerCase();
            let queryMatch = !query || query.split(' ').every(term => searchText.includes(term));
            let typeMatch = !typeFilter || car.car_type === typeFilter;
            let brandMatch = !brandFilter || car.brand === brandFilter;
            return queryMatch && typeMatch && brandMatch;
        });
        displayCars(filteredCars, query);
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Error fetching cars for search:', textStatus, errorThrown);
        $('#car-grid').html('<p>Error loading cars. Please try again.</p>');
    });
}

function loadCars() {
    console.log('Loading cars');
    let query = localStorage.getItem('searchQuery') || '';
    let typeFilter = localStorage.getItem('typeFilter') || '';
    let brandFilter = localStorage.getItem('brandFilter') || '';
    $('#search-box').val(query);
    $('#type-dropdown').data('value', typeFilter);
    $('#brand-dropdown').data('value', brandFilter);
    $('#type-dropdown .dropbtn').text(typeFilter || 'Car Types');
    $('#brand-dropdown .dropbtn').text(brandFilter || 'Car Brands');
    localStorage.removeItem('searchQuery');
    localStorage.removeItem('typeFilter');
    localStorage.removeItem('brandFilter');
    searchCars();
}

function displayCars(cars, query) {
    console.log('Displaying cars:', cars);
    let typeModelHtml = cars.length ? `
        <div class="search-category type-model">
            ${cars.map(car => `
                <div class="car-card">
                    <img src="${car.image}" alt="${car.brand} ${car.car_model}" class="car-img">
                    <div class="car-details">
                        <h3>${car.brand} ${car.car_model}</h3>
                        <div class="car-info-grid">
                            <p><strong>Type:</strong> ${car.car_type}</p>
                            <p><strong>Year:</strong> ${car.year_of_manufacture}</p>
                            <p><strong>Price:</strong> $${car.price_per_day}/day</p>
                            <p><strong>Mileage:</strong> ${car.mileage}</p>
                            <p><strong>Fuel:</strong> ${car.fuel_type}</p>
                            <p><strong>Available:</strong> ${car.available ? 'Yes' : 'No'}</p>
                        </div>
                        <p class="description">${car.description}</p>
                    </div>
                    <div class="button-wrapper">
                        <button class="rent-button" ${car.available ? '' : 'disabled'} onclick="selectCar('${car.vin}')">Rent</button>
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';

    let descriptionHtml = '';
    if (query) {
        let matchingDescriptions = cars.filter(car => 
            car.description.toLowerCase().includes(query)
        ).map(car => `<p>${car.brand} ${car.car_model}: ${car.description}</p>`);   
    }

    let carGridHtml = typeModelHtml || descriptionHtml ? `
        ${typeModelHtml}
        ${descriptionHtml}
    ` : '<p>No results found.</p>';

    $('#car-grid').html(carGridHtml);
}

function selectCar(vin) {
    console.log('Selected car VIN:', vin);
    localStorage.setItem('selectedCarVin', vin);
    window.location.href = 'reservation.html';
}

function loadCarDetails() {
    console.log('Loading car details');
    const vin = localStorage.getItem('selectedCarVin');
    console.log('Selected VIN from LocalStorage:', vin);

    // Always hide the form initially
    $('#reservation-form').hide();

    if (!vin) {
        console.log('No car selected');
        $('#car-details .car-card').html('<p class="no-car-message">Please choose a car before continuing with your booking.</p>');
        return;
    }

    $.get('/cars', function(data) {
        console.log('Cars data received for details:', data);
        const car = data.cars.find(c => c.vin === vin);

        if (!car) {
            console.log('Car not found for VIN:', vin);
            $('#car-details .car-card').html('<p>Car not found. Please select another car.</p>');
            return;
        }

        // Render car details
        const carHtml = `
            <img src="${car.image}" alt="${car.brand} ${car.car_model}" class="car-img">
            <div class="car-details">
                <h3>${car.brand} ${car.car_model}</h3>
                <div class="car-info-grid">
                    <p><strong>Type:</strong> ${car.car_type}</p>
                    <p><strong>Year:</strong> ${car.year_of_manufacture}</p>
                    <p><strong>Price:</strong> $${car.price_per_day}/day</p>
                    <p><strong>Mileage:</strong> ${car.mileage}</p>
                    <p><strong>Fuel:</strong> ${car.fuel_type}</p>
                </div>
            </div>
        `;
        $('#car-details .car-card').html(carHtml);

        if (car.available) {
            console.log('Car is available, showing form');
            $('#reservation-form').show(); 
        } else {
            console.log('Car is unavailable');
            $('#car-details .car-card').append('<p>This car is unavailable. Please choose another car.</p>');
            $('#reservation-form').hide(); 
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Error fetching car details:', textStatus, errorThrown);
        $('#car-details .car-card').html('<p class="no-car-message">Please select a car first.</p>');
        $('#reservation-form').hide();
    });
}

function loadFormInputs() {
    console.log('Loading form inputs');
    let savedInputs = JSON.parse(localStorage.getItem('reservationInputs') || '{}');
    console.log('Saved inputs:', savedInputs);
    $('#name').val(savedInputs.name || '');
    $('#phone').val(savedInputs.phone || '');
    $('#email').val(savedInputs.email || '');
    $('#license').val(savedInputs.license || '');
    $('#start-date').val(savedInputs.startDate || '');
    $('#rental-period').val(savedInputs.rentalPeriod || '');
}

function validateForm() {
    console.log('Validating form');
    let isValid = true;
    let name = $('#name').val().trim();
    let phone = $('#phone').val().trim();
    let email = $('#email').val().trim();
    let license = $('#license').val().trim();
    let startDate = $('#start-date').val();
    let rentalPeriod = $('#rental-period').val();

    // Name validation
    $('#name-error').text(name ? '' : 'Please enter your name');
    isValid = isValid && !!name;

    // Phone validation
    let phoneRegex = /^0\d{9}$/;
    $('#phone-error').text(phone && phoneRegex.test(phone) ? '' : 'Please enter valid phone number (e.g., 0123456789)');
    isValid = isValid && phone && phoneRegex.test(phone);

    // Email validation
    let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    $('#email-error').text(email && emailRegex.test(email) ? '' : 'Please enter valid email (tom@example.com)');
    isValid = isValid && email && emailRegex.test(email);

    // License validation
    let licenseRegex = /^[A-Za-z0-9]+$/;
    $('#license-error').text(license && licenseRegex.test(license) ? '' : 'Driver\'s license number is required');
    isValid = isValid && license && licenseRegex.test(license);

    // Start date validation
    let today = new Date().toISOString().split('T')[0];
    $('#start-date-error').text(startDate && startDate >= today ? '' : 'Start date must be today or later');
    isValid = isValid && startDate && startDate >= today;

    // Rental period validation
    $('#rental-period-error').text(rentalPeriod && rentalPeriod >= 1 ? '' : 'Rental period must be at least 1 day');
    isValid = isValid && rentalPeriod && rentalPeriod >= 1;

    // Save inputs to LocalStorage
    let inputs = { name, phone, email, license, startDate, rentalPeriod };
    console.log('Saving form inputs:', inputs);
    localStorage.setItem('reservationInputs', JSON.stringify(inputs));

    // Calculate total price
    if (isValid) {
        let vin = localStorage.getItem('selectedCarVin');
        $.get('/cars', function(data) {
            let car = data.cars.find(c => c.vin === vin);
            if (car) {
                let totalPrice = car.price_per_day * rentalPeriod;
                console.log('Calculated total price:', totalPrice);
                $('#total-price').text(totalPrice);
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error fetching car for price calculation:', textStatus, errorThrown);
        });
    } else {
        $('#total-price').text('0');
    }

    $('#submit-button').prop('disabled', !isValid);
    console.log('Form validation result:', isValid);
}

function submitOrder() {
    console.log('Submitting order');
    $('#submit-button').prop('disabled', true).text('Submitting...');
    let vin = localStorage.getItem('selectedCarVin');
    let order = {
        customer: {
            customer_name: $('#name').val().trim(),
            customer_phone: $('#phone').val().trim(),
            customer_email: $('#email').val().trim(),
            customer_license: $('#license').val().trim()
        },
        car: {
            vin: vin
        },
        rental: {
            start_date: $('#start-date').val(),
            rental_period: parseInt($('#rental-period').val()),
            total_price: parseFloat($('#total-price').text()),
            order_date: new Date().toISOString().split('T')[0]
        }
    };
    console.log('Order data:', order);

    $.ajax({
        url: '/orders',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(order),
        success: function(response) {
            console.log('Order response:', response);
            $('#submit-button').prop('disabled', false).text('Submit');
            if (response.success) {
                $('#reservation-form').hide();
                $.get('/cars', function(data) {
                    let car = data.cars.find(c => c.vin === vin);
                    let orderDetails = `
                        <div class="order-info-grid">
                            <p><strong>Car:</strong> ${car ? `${car.brand} ${car.car_model}` : 'Unknown'}</p>
                            <p><strong>Customer:</strong> ${order.customer_name}</p>
                            <p><strong>Start Date:</strong> ${order.start_date}</p>
                            <p><strong>Rental Period:</strong> ${order.rental_period} day(s)</p>
                            <p><strong>Total Price:</strong> $${order.total_price}</p>
                        </div>
                    `;
                    $('#order-details').html(orderDetails);
                    $('#confirmation-modal').data('order-id', response.orderId);
                    showModal('#confirmation-modal');
                    $('#confirm-order-button').off('click').on('click', function() {
                        confirmOrder(response.orderId);
                    });
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    console.error('Error fetching car details for modal:', textStatus, errorThrown);
                    $('#order-details').html('<p>Error loading order details.</p>');
                    showModal('#confirmation-modal');
                });
                localStorage.removeItem('reservationInputs');
            } else {
                $('#confirmation-message').html(`<p>Failed to place order: ${response.error || 'Car is no longer available.'}</p>`).show();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('Error submitting order:', textStatus, errorThrown, jqXHR.responseText);
            $('#submit-button').prop('disabled', false).text('Submit');
            $('#confirmation-message').html(`<p>Error submitting order: ${jqXHR.responseText || 'Please try again.'}</p>`).show();
        }
    });
}

function confirmOrder(orderId) {
    console.log('Confirming order with ID:', orderId);
    $('#confirmation-modal').hide();
    $('#order-details').html('<p>Confirming order...</p>');

    $.ajax({
        url: '/confirm-order',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ orderId: String(orderId) }),
        success: function(response) {
            console.log('Confirmation response:', response);
            if (response.success) {
                showModal('#success-modal');
                localStorage.removeItem('selectedCarVin');
            } else {
                $('#order-details').html(`<p>Order confirmation failed: ${response.error || 'Please try again.'}</p>`);
                showModal('#confirmation-modal');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('Error confirming order:', textStatus, errorThrown, jqXHR.responseText);
            $('#order-details').html(`<p>Error confirming order: ${jqXHR.responseText || 'Please try again.'}</p>`);
            showModal('#confirmation-modal');
        }
    });
}

function cancelForm() {
    console.log('Canceling form');
    localStorage.removeItem('reservationInputs');
    window.location.href = 'index.html';
}

function showModal(modalId) {
    $(modalId).show().addClass('show');
}

function closeModal() {
    $('.modal').hide().removeClass('show');
    $('#order-details').empty();
}