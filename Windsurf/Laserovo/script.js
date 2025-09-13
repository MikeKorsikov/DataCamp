console.log("Welcome to Laserovo!");

// Clients modal wiring
document.addEventListener('DOMContentLoaded', () => {
  const addNewButton = document.getElementById('add-new');
  const modifyButton = document.getElementById('modify');
  const overlay = document.getElementById('client-modal-overlay');
  const searchOverlay = document.getElementById('search-modal-overlay');
  const cancelButton = document.getElementById('client-cancel');
  const searchCancelButton = document.getElementById('search-cancel');
  const form = document.getElementById('client-form');
  const searchForm = document.getElementById('search-form');
  const searchResults = document.getElementById('search-results');
  const resultsList = document.getElementById('results-list');
  const editOverlay = document.getElementById('edit-modal-overlay');
  const editForm = document.getElementById('edit-form');
  const editCancelButton = document.getElementById('edit-cancel');
  const showAllButton = document.getElementById('show-all');
  const showAllOverlay = document.getElementById('show-all-modal-overlay');
  const showAllCancelButton = document.getElementById('show-all-cancel');
  const showAllList = document.getElementById('show-all-list');

  // Add New modal
  if (addNewButton && overlay && cancelButton && form) {
    const openModal = () => {
      overlay.removeAttribute('hidden');
      // Focus first field for accessibility
      const firstField = document.getElementById('client-name');
      if (firstField) firstField.focus();
    };

    const closeModal = () => {
      overlay.setAttribute('hidden', '');
      form.reset();
    };

    addNewButton.addEventListener('click', openModal);
    cancelButton.addEventListener('click', closeModal);

    // Close when clicking backdrop
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Save handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const resp = await fetch('/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await resp.json();
        if (!resp.ok || json.status !== 'ok') {
          throw new Error(json.message || 'Failed to save client');
        }
        closeModal();
        alert(`Client saved. ID: ${json.id}`);
      } catch (err) {
        console.error(err);
        alert('Error saving client. Please ensure the backend is running.');
      }
    });
  }

  // Search modal
  if (modifyButton && searchOverlay && searchCancelButton && searchForm && searchResults && resultsList) {
    const openSearchModal = () => {
      searchOverlay.removeAttribute('hidden');
      searchResults.setAttribute('hidden', '');
      resultsList.innerHTML = '';
      const searchTerm = document.getElementById('search-term');
      if (searchTerm) searchTerm.focus();
    };

    const closeSearchModal = () => {
      searchOverlay.setAttribute('hidden', '');
      searchForm.reset();
      searchResults.setAttribute('hidden', '');
      resultsList.innerHTML = '';
    };

    modifyButton.addEventListener('click', openSearchModal);
    searchCancelButton.addEventListener('click', closeSearchModal);

    // Close when clicking backdrop
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) {
        closeSearchModal();
      }
    });

    // Search handler
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const field = document.getElementById('search-field').value;
      const term = document.getElementById('search-term').value.trim();
      
      if (!term) return;

      try {
        const resp = await fetch(`/clients/search?field=${encodeURIComponent(field)}&term=${encodeURIComponent(term)}`);
        const json = await resp.json();
        
        if (!resp.ok || json.status !== 'ok') {
          throw new Error(json.message || 'Search failed');
        }

        resultsList.innerHTML = '';
        
        if (json.results.length === 0) {
          resultsList.innerHTML = '<p>No clients found matching your search.</p>';
        } else {
          json.results.forEach(client => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
              <div class="result-info">
                <div class="name">${client.name} ${client.surname}</div>
                <div class="details">${client.email || 'No email'} • ${client.phone || 'No phone'}</div>
              </div>
              <button class="edit-btn" data-client-id="${client.id}">Edit</button>
            `;
            resultsList.appendChild(item);
          });
        }
        
        searchResults.removeAttribute('hidden');
      } catch (err) {
        console.error(err);
        alert('Error searching clients. Please ensure the backend is running.');
      }
    });

    // Handle edit button clicks
    resultsList.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn')) {
        const clientId = e.target.getAttribute('data-client-id');
        openEditModal(clientId);
      }
    });
  }

  // Edit modal functionality
  if (editOverlay && editForm && editCancelButton) {
    let currentClientId = null;

    const openEditModal = async (clientId) => {
      currentClientId = clientId;
      try {
        const resp = await fetch(`/clients/${clientId}`);
        const json = await resp.json();
        
        if (!resp.ok || json.status !== 'ok') {
          throw new Error(json.message || 'Failed to load client');
        }

        const client = json.client;
        
        // Fill form with client data
        document.getElementById('edit-name').value = client.name || '';
        document.getElementById('edit-surname').value = client.surname || '';
        document.getElementById('edit-phone').value = client.phone || '';
        document.getElementById('edit-email').value = client.email || '';
        document.getElementById('edit-facebook').value = client.facebook || '';
        document.getElementById('edit-instagram').value = client.instagram || '';
        document.getElementById('edit-booksy').value = client.booksy || '';
        document.getElementById('edit-dob').value = client.dob || '';

        // Close search modal and open edit modal
        if (searchOverlay) {
          searchOverlay.setAttribute('hidden', '');
        }
        editOverlay.removeAttribute('hidden');
        document.getElementById('edit-name').focus();
      } catch (err) {
        console.error(err);
        alert('Error loading client data. Please ensure the backend is running.');
      }
    };

    const closeEditModal = () => {
      editOverlay.setAttribute('hidden', '');
      editForm.reset();
      currentClientId = null;
    };

    editCancelButton.addEventListener('click', closeEditModal);

    // Close when clicking backdrop
    editOverlay.addEventListener('click', (e) => {
      if (e.target === editOverlay) {
        closeEditModal();
      }
    });

    // Save handler for edit
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentClientId) return;

      const data = Object.fromEntries(new FormData(editForm).entries());
      try {
        const resp = await fetch(`/clients/${currentClientId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await resp.json();
        
        if (!resp.ok || json.status !== 'ok') {
          throw new Error(json.message || 'Failed to update client');
        }
        
        closeEditModal();
        alert('Client updated successfully!');
      } catch (err) {
        console.error(err);
        alert('Error updating client. Please ensure the backend is running.');
      }
    });

    // Make openEditModal available globally for the search results
    window.openEditModal = openEditModal;
  }

  // Show All functionality
  if (showAllButton && showAllOverlay && showAllCancelButton && showAllList) {
    const openShowAllModal = async () => {
      showAllOverlay.removeAttribute('hidden');
      showAllList.innerHTML = '<p>Loading clients...</p>';
      
      try {
        const resp = await fetch('/clients');
        const json = await resp.json();
        
        if (!resp.ok || json.status !== 'ok') {
          throw new Error(json.message || 'Failed to load clients');
        }

        showAllList.innerHTML = '';
        
        if (json.results.length === 0) {
          showAllList.innerHTML = '<p>No clients found.</p>';
        } else {
          json.results.forEach(client => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
              <div class="result-info">
                <div class="name">${client.name} ${client.surname}</div>
                <div class="details">${client.email || 'No email'} • ${client.phone || 'No phone'}</div>
              </div>
              <button class="edit-btn" data-client-id="${client.id}">Edit</button>
            `;
            showAllList.appendChild(item);
          });
        }
      } catch (err) {
        console.error(err);
        showAllList.innerHTML = '<p>Error loading clients. Please ensure the backend is running.</p>';
      }
    };

    const closeShowAllModal = () => {
      showAllOverlay.setAttribute('hidden', '');
      showAllList.innerHTML = '';
    };

    showAllButton.addEventListener('click', openShowAllModal);
    showAllCancelButton.addEventListener('click', closeShowAllModal);

    // Close when clicking backdrop
    showAllOverlay.addEventListener('click', (e) => {
      if (e.target === showAllOverlay) {
        closeShowAllModal();
      }
    });

    // Handle edit button clicks in show all results
    showAllList.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn')) {
        const clientId = e.target.getAttribute('data-client-id');
        if (window.openEditModal) {
          closeShowAllModal();
          window.openEditModal(clientId);
        }
      }
    });
  }

  // Appointment modal functionality
  const makeAppointmentButton = document.getElementById('make-appointment');
  const appointmentOverlay = document.getElementById('appointment-modal-overlay');
  const appointmentCancelButton = document.getElementById('appointment-cancel');
  const appointmentForm = document.getElementById('appointment-form');
  const searchClientBtn = document.getElementById('search-client-btn');
  const clientSearchResults = document.getElementById('client-search-results');
  const clientResultsList = document.getElementById('client-results-list');

  if (makeAppointmentButton && appointmentOverlay && appointmentCancelButton && appointmentForm) {
    const openAppointmentModal = () => {
      appointmentOverlay.removeAttribute('hidden');
      
      // Set up 24-hour format for separate date and time inputs
      const dateInput = document.getElementById('appointment-date');
      const timeInput = document.getElementById('appointment-time');
      
      if (dateInput && timeInput) {
        // Set minimum date to today
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        dateInput.min = `${year}-${month}-${day}`;
        
        // Set default date to today
        dateInput.value = `${year}-${month}-${day}`;
        
        // Set default time to next hour (24-hour format)
        const nextHour = new Date(today);
        nextHour.setHours(today.getHours() + 1, 0, 0, 0);
        const nextHours = String(nextHour.getHours()).padStart(2, '0');
        const nextMinutes = String(nextHour.getMinutes()).padStart(2, '0');
        
        timeInput.value = `${nextHours}:${nextMinutes}`;
        
        // Force 24-hour format by hiding AM/PM field
        timeInput.setAttribute('data-format', '24');
      }
      
      // Focus first field for accessibility
      const firstField = document.getElementById('appointment-name');
      if (firstField) firstField.focus();
    };

    const closeAppointmentModal = () => {
      appointmentOverlay.setAttribute('hidden', '');
      appointmentForm.reset();
      if (clientSearchResults) {
        clientSearchResults.setAttribute('hidden', '');
        if (clientResultsList) clientResultsList.innerHTML = '';
      }
    };

    makeAppointmentButton.addEventListener('click', openAppointmentModal);
    appointmentCancelButton.addEventListener('click', closeAppointmentModal);

    // Close when clicking backdrop
    appointmentOverlay.addEventListener('click', (e) => {
      if (e.target === appointmentOverlay) {
        closeAppointmentModal();
      }
    });

    // Client search functionality
    if (searchClientBtn && clientSearchResults && clientResultsList) {
      searchClientBtn.addEventListener('click', async () => {
        const searchField = document.getElementById('client-search-field').value;
        const searchTerm = document.getElementById('client-search-term').value.trim();
        
        if (!searchTerm) {
          alert('Please enter a search term');
          return;
        }

        try {
          const resp = await fetch(`/clients/search?field=${encodeURIComponent(searchField)}&term=${encodeURIComponent(searchTerm)}`);
          const json = await resp.json();
          
          if (!resp.ok || json.status !== 'ok') {
            throw new Error(json.message || 'Search failed');
          }

          clientResultsList.innerHTML = '';
          
          if (json.results.length === 0) {
            clientResultsList.innerHTML = '<p>No clients found matching your search.</p>';
          } else {
            json.results.forEach(client => {
              const item = document.createElement('div');
              item.className = 'result-item';
              item.innerHTML = `
                <div class="result-info">
                  <div class="name">${client.name} ${client.surname}</div>
                  <div class="details">${client.email || 'No email'} • ${client.phone || 'No phone'}</div>
                </div>
                <button class="select-client-btn" data-name="${client.name}" data-surname="${client.surname}">Select</button>
              `;
              clientResultsList.appendChild(item);
            });
          }
          
          clientSearchResults.removeAttribute('hidden');
        } catch (err) {
          console.error(err);
          alert('Error searching clients. Please ensure the backend is running.');
        }
      });

      // Handle select client button clicks
      clientResultsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('select-client-btn')) {
          const name = e.target.getAttribute('data-name');
          const surname = e.target.getAttribute('data-surname');
          
          // Auto-fill the form fields
          document.getElementById('appointment-name').value = name;
          document.getElementById('appointment-surname').value = surname;
          
          // Hide search results
          clientSearchResults.setAttribute('hidden', '');
        }
      });
    }

    // Save appointment handler
    appointmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(appointmentForm);
      const data = Object.fromEntries(formData.entries());
      
      // Combine date and time into a single datetime value
      const date = data.appointment_date;
      const time = data.appointment_time;
      if (date && time) {
        data.appointment_datetime = `${date}T${time}`;
        delete data.appointment_date;
        delete data.appointment_time;
      }
      
      try {
        const resp = await fetch('/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await resp.json();
        if (!resp.ok || json.status !== 'ok') {
          throw new Error(json.message || 'Failed to save appointment');
        }
        closeAppointmentModal();
        alert(json.message || `Appointment saved successfully! Visit #${json.visit_number}`);
      } catch (err) {
        console.error(err);
        alert('Error saving appointment. Please ensure the backend is running.');
      }
    });
  }
});